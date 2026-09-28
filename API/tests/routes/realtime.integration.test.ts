import { createServer } from 'http';
import { AddressInfo } from 'net';
import { io as ioClient, Socket } from 'socket.io-client';
import request from 'supertest';
import app from '../../src_ts/app';
import { initializeRealtime } from '../../src_ts/services/realtime';
import {
  authHeader,
  cleanupTestData,
  createAndLoginUser,
} from '../helpers/testHelpets';

function waitForEvent<T = unknown>(socket: Socket, event: string, timeoutMs = 4000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, onEvent);
      reject(new Error(`Timed out waiting for ${event}`));
    }, timeoutMs);
    function onEvent(payload: T) {
      clearTimeout(timer);
      resolve(payload);
    }
    socket.once(event, onEvent);
  });
}

describe('Realtime messaging', () => {
  let httpServer: ReturnType<typeof createServer>;
  let baseUrl: string;
  let manager: { id: number; tokens: { accessToken: string } };
  let employee: { id: number; tokens: { accessToken: string } };
  let outsider: { id: number; tokens: { accessToken: string } };

  beforeAll(async () => {
    httpServer = createServer(app);
    initializeRealtime(httpServer);
    await new Promise<void>((resolve) => {
      httpServer.listen(0, '127.0.0.1', () => resolve());
    });
    const address = httpServer.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      httpServer.close((err) => (err ? reject(err) : resolve()));
    });
    await cleanupTestData();
  });

  beforeEach(async () => {
    await cleanupTestData();
    const [m, e, o] = await Promise.all([
      createAndLoginUser({ role: 'MANAGER', name: 'RT Manager', email: `rt_mgr_${Date.now()}@test.com` }),
      createAndLoginUser({ role: 'EMPLOYEE', name: 'RT Employee', email: `rt_emp_${Date.now()}@test.com` }),
      createAndLoginUser({ role: 'MANAGER', name: 'RT Outsider', email: `rt_out_${Date.now()}@test.com` }),
    ]);
    manager = { id: m.user.id, tokens: m.tokens };
    employee = { id: e.user.id, tokens: e.tokens };
    outsider = { id: o.user.id, tokens: o.tokens };
  });

  function connectSocket(accessToken: string): Socket {
    return ioClient(baseUrl, {
      transports: ['websocket'],
      auth: { accessToken },
      forceNew: true,
      reconnection: false,
    });
  }

  it('rejects unauthenticated socket connections', async () => {
    const socket = connectSocket('');
    const error = await waitForEvent<Error>(socket, 'connect_error');
    expect(error.message).toMatch(/unauthorized/i);
    socket.close();
  });

  it('delivers persisted messages only to conversation participants', async () => {
    const start = await request(app)
      .post('/api/v1/conversations')
      .set(authHeader(manager.tokens.accessToken))
      .send({ participantId: employee.id });
    const conversationId = start.body.id as number;

    const managerSocket = connectSocket(manager.tokens.accessToken);
    const employeeSocket = connectSocket(employee.tokens.accessToken);
    const outsiderSocket = connectSocket(outsider.tokens.accessToken);

    await Promise.all([
      waitForEvent(managerSocket, 'connect'),
      waitForEvent(employeeSocket, 'connect'),
      waitForEvent(outsiderSocket, 'connect'),
    ]);

    const managerEvent = waitForEvent<{ conversationId: number; message: { body: string } }>(
      managerSocket,
      'message:new',
    );
    const employeeEvent = waitForEvent<{ conversationId: number; message: { body: string } }>(
      employeeSocket,
      'message:new',
    );

    let outsiderReceived = false;
    outsiderSocket.on('message:new', () => {
      outsiderReceived = true;
    });

    const sent = await request(app)
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set(authHeader(manager.tokens.accessToken))
      .send({ body: 'Realtime hello' });
    expect(sent.status).toBe(201);

    const [toManager, toEmployee] = await Promise.all([managerEvent, employeeEvent]);
    expect(toManager.conversationId).toBe(conversationId);
    expect(toManager.message.body).toBe('Realtime hello');
    expect(toEmployee.conversationId).toBe(conversationId);
    expect(toEmployee.message.body).toBe('Realtime hello');

    await new Promise((r) => setTimeout(r, 300));
    expect(outsiderReceived).toBe(false);

    managerSocket.close();
    employeeSocket.close();
    outsiderSocket.close();
  });

  it('emits conversation:read after mark-read', async () => {
    const start = await request(app)
      .post('/api/v1/conversations')
      .set(authHeader(manager.tokens.accessToken))
      .send({ participantId: employee.id });
    const conversationId = start.body.id as number;

    await request(app)
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set(authHeader(manager.tokens.accessToken))
      .send({ body: 'Please read this' });

    const managerSocket = connectSocket(manager.tokens.accessToken);
    const employeeSocket = connectSocket(employee.tokens.accessToken);
    await Promise.all([
      waitForEvent(managerSocket, 'connect'),
      waitForEvent(employeeSocket, 'connect'),
    ]);

    const readEvent = waitForEvent<{ conversationId: number; readerId: number }>(
      managerSocket,
      'conversation:read',
    );

    const read = await request(app)
      .patch(`/api/v1/conversations/${conversationId}/read`)
      .set(authHeader(employee.tokens.accessToken));
    expect(read.status).toBe(200);
    expect(read.body.markedRead).toBe(1);

    const receipt = await readEvent;
    expect(receipt.conversationId).toBe(conversationId);
    expect(receipt.readerId).toBe(employee.id);

    managerSocket.close();
    employeeSocket.close();
  });
});
