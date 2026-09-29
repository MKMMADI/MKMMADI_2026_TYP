import { createServer } from 'http';
import { AddressInfo } from 'net';
import { io as ioClient, Socket } from 'socket.io-client';
import request from 'supertest';
import app from '../../src_ts/app';
import prisma from '../../src_ts/prisma';
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

  it.each(['expired', 'revoked', 'inactive'] as const)(
    'rejects a socket connection for a %s session or account',
    async (invalidState) => {
      if (invalidState === 'expired') {
        await prisma.session.updateMany({
          where: { userId: employee.id },
          data: { expiresAt: new Date(Date.now() - 1000) },
        });
      } else if (invalidState === 'revoked') {
        await prisma.session.updateMany({ where: { userId: employee.id }, data: { revoked: true } });
      } else {
        await prisma.user.update({ where: { id: employee.id }, data: { Active: false } });
      }

      const socket = connectSocket(employee.tokens.accessToken);
      const error = await waitForEvent<Error>(socket, 'connect_error');
      expect(error.message).toMatch(/unauthorized/i);
      socket.close();
    },
  );

  it('disconnects sockets on logout and rejects the revoked token afterward', async () => {
    const socket = connectSocket(employee.tokens.accessToken);
    await waitForEvent(socket, 'connect');
    const disconnected = waitForEvent<string>(socket, 'disconnect');

    const logout = await request(app)
      .post('/api/v1/auth/logout')
      .set(authHeader(employee.tokens.accessToken))
      .send({});
    expect(logout.status).toBe(200);
    await disconnected;
    socket.close();

    const reconnect = connectSocket(employee.tokens.accessToken);
    const error = await waitForEvent<Error>(reconnect, 'connect_error');
    expect(error.message).toMatch(/unauthorized/i);
    reconnect.close();
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
    outsiderSocket.emit('conversation:join', { conversationId });
    outsiderSocket.emit('message:send', { conversationId, body: 'Forged socket send' });

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

  it('does not broadcast when message persistence fails', async () => {
    const start = await request(app)
      .post('/api/v1/conversations')
      .set(authHeader(manager.tokens.accessToken))
      .send({ participantId: employee.id });
    const conversationId = start.body.id as number;

    const managerSocket = connectSocket(manager.tokens.accessToken);
    const employeeSocket = connectSocket(employee.tokens.accessToken);
    await Promise.all([
      waitForEvent(managerSocket, 'connect'),
      waitForEvent(employeeSocket, 'connect'),
    ]);

    const messageReceived = jest.fn();
    managerSocket.on('message:new', messageReceived);
    employeeSocket.on('message:new', messageReceived);
    const transactionSpy = jest.spyOn(prisma, '$transaction');
    transactionSpy.mockImplementationOnce(() => Promise.reject(new Error('persistence failure')) as never);

    try {
      const response = await request(app)
        .post(`/api/v1/conversations/${conversationId}/messages`)
        .set(authHeader(manager.tokens.accessToken))
        .send({ body: 'This must not be broadcast' });

      expect(response.status).toBe(500);
      expect(messageReceived).not.toHaveBeenCalled();
    } finally {
      transactionSpy.mockRestore();
      managerSocket.close();
      employeeSocket.close();
    }
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
