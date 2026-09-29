import request from 'supertest';
import app from '../../src_ts/app';
import {
  authHeader,
  cleanupTestData,
  createAndLoginUser,
} from '../helpers/testHelpets';

describe('Conversations API', () => {
  let managerA: { id: number; tokens: { accessToken: string } };
  let managerB: { id: number; tokens: { accessToken: string } };
  let employee: { id: number; tokens: { accessToken: string } };
  let clerk: { id: number; tokens: { accessToken: string } };
  let employeeB: { id: number; tokens: { accessToken: string } };
  let clerkB: { id: number; tokens: { accessToken: string } };

  beforeEach(async () => {
    await cleanupTestData();
    const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const [mA, mB, emp, clk, empB, clkB] = await Promise.all([
      createAndLoginUser({ role: 'MANAGER', name: 'Manager A', email: `mgr_a_${suffix}@test.com` }),
      createAndLoginUser({ role: 'MANAGER', name: 'Manager B', email: `mgr_b_${suffix}@test.com` }),
      createAndLoginUser({ role: 'EMPLOYEE', name: 'Employee A', email: `emp_a_${suffix}@test.com` }),
      createAndLoginUser({ role: 'CLERK', name: 'Clerk A', email: `clk_a_${suffix}@test.com` }),
      createAndLoginUser({ role: 'EMPLOYEE', name: 'Employee B', email: `emp_b_${suffix}@test.com` }),
      createAndLoginUser({ role: 'CLERK', name: 'Clerk B', email: `clk_b_${suffix}@test.com` }),
    ]);
    managerA = { id: mA.user.id, tokens: mA.tokens };
    managerB = { id: mB.user.id, tokens: mB.tokens };
    employee = { id: emp.user.id, tokens: emp.tokens };
    clerk = { id: clk.user.id, tokens: clk.tokens };
    employeeB = { id: empB.user.id, tokens: empB.tokens };
    clerkB = { id: clkB.user.id, tokens: clkB.tokens };
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('authorization matrix', () => {
    it('allows manager-manager, manager-employee, and manager-clerk pairs', async () => {
      for (const [from, to] of [
        [managerA, managerB],
        [managerA, employee],
        [managerA, clerk],
        [employee, managerA],
        [clerk, managerA],
      ] as const) {
        const response = await request(app)
          .post('/api/v1/conversations')
          .set(authHeader(from.tokens.accessToken))
          .send({ participantId: to.id });
        expect([200, 201]).toContain(response.status);
        expect(response.body.participant.id).toBe(to.id);
      }
    });

    it('allows employee-clerk pairs in either direction', async () => {
      for (const [from, to] of [[employee, clerk], [clerk, employee]] as const) {
        const response = await request(app)
          .post('/api/v1/conversations')
          .set(authHeader(from.tokens.accessToken))
          .send({ participantId: to.id });
        expect([200, 201]).toContain(response.status);
        expect(response.body.participant.id).toBe(to.id);
      }
    });

    it('rejects employee-employee and clerk-clerk pairs', async () => {
      for (const [from, to] of [
        [employee, employeeB],
        [clerk, clerkB],
      ] as const) {
        const response = await request(app)
          .post('/api/v1/conversations')
          .set(authHeader(from.tokens.accessToken))
          .send({ participantId: to.id });
        expect(response.status).toBe(403);
      }
    });
  });

  describe('message lifecycle', () => {
    it('persists messages, lists history, tracks unread, and marks read', async () => {
      const start = await request(app)
        .post('/api/v1/conversations')
        .set(authHeader(managerA.tokens.accessToken))
        .send({ participantId: employee.id });
      expect([200, 201]).toContain(start.status);
      const conversationId = start.body.id as number;

      const sent = await request(app)
        .post(`/api/v1/conversations/${conversationId}/messages`)
        .set(authHeader(managerA.tokens.accessToken))
        .send({ body: 'Hello from manager' });
      expect(sent.status).toBe(201);
      expect(sent.body.body).toBe('Hello from manager');
      expect(sent.body.senderId).toBe(managerA.id);
      expect(sent.body.recipientId).toBe(employee.id);

      const listAsEmployee = await request(app)
        .get('/api/v1/conversations')
        .set(authHeader(employee.tokens.accessToken));
      expect(listAsEmployee.status).toBe(200);
      const summary = listAsEmployee.body.find((c: { id: number }) => c.id === conversationId);
      expect(summary).toBeDefined();
      expect(summary.unreadCount).toBe(1);

      const history = await request(app)
        .get(`/api/v1/conversations/${conversationId}/messages?limit=50`)
        .set(authHeader(employee.tokens.accessToken));
      expect(history.status).toBe(200);
      expect(history.body.messages).toHaveLength(1);
      expect(history.body.messages[0].body).toBe('Hello from manager');

      const read = await request(app)
        .patch(`/api/v1/conversations/${conversationId}/read`)
        .set(authHeader(employee.tokens.accessToken));
      expect(read.status).toBe(200);
      expect(read.body.markedRead).toBe(1);

      const listAfterRead = await request(app)
        .get('/api/v1/conversations')
        .set(authHeader(employee.tokens.accessToken));
      const after = listAfterRead.body.find((c: { id: number }) => c.id === conversationId);
      expect(after.unreadCount).toBe(0);
    });

    it('rejects empty and over-long bodies', async () => {
      const start = await request(app)
        .post('/api/v1/conversations')
        .set(authHeader(managerA.tokens.accessToken))
        .send({ participantId: employee.id });
      const conversationId = start.body.id as number;

      const empty = await request(app)
        .post(`/api/v1/conversations/${conversationId}/messages`)
        .set(authHeader(managerA.tokens.accessToken))
        .send({ body: '   ' });
      expect(empty.status).toBe(400);

      const tooLong = await request(app)
        .post(`/api/v1/conversations/${conversationId}/messages`)
        .set(authHeader(managerA.tokens.accessToken))
        .send({ body: 'x'.repeat(4001) });
      expect(tooLong.status).toBe(400);
    });

    it('isolates non-participants from conversations', async () => {
      const start = await request(app)
        .post('/api/v1/conversations')
        .set(authHeader(managerA.tokens.accessToken))
        .send({ participantId: employee.id });
      const conversationId = start.body.id as number;

      await request(app)
        .post(`/api/v1/conversations/${conversationId}/messages`)
        .set(authHeader(managerA.tokens.accessToken))
        .send({ body: 'secret' });

      const outsider = await request(app)
        .get(`/api/v1/conversations/${conversationId}/messages`)
        .set(authHeader(managerB.tokens.accessToken));
      expect(outsider.status).toBe(404);

      const outsiderSend = await request(app)
        .post(`/api/v1/conversations/${conversationId}/messages`)
        .set(authHeader(managerB.tokens.accessToken))
        .send({ body: 'intrusion' });
      expect(outsiderSend.status).toBe(404);

      const outsiderRead = await request(app)
        .patch(`/api/v1/conversations/${conversationId}/read`)
        .set(authHeader(managerB.tokens.accessToken));
      expect(outsiderRead.status).toBe(404);
    });

    it('returns contacts filtered by role rules', async () => {
      const managerContacts = await request(app)
        .get('/api/v1/conversations/contacts')
        .set(authHeader(managerA.tokens.accessToken));
      expect(managerContacts.status).toBe(200);
      const managerIds = managerContacts.body.map((c: { id: number }) => c.id);
      expect(managerIds).toEqual(expect.arrayContaining([managerB.id, employee.id, clerk.id]));

      const employeeContacts = await request(app)
        .get('/api/v1/conversations/contacts')
        .set(authHeader(employee.tokens.accessToken));
      expect(employeeContacts.status).toBe(200);
      const empContactIds = employeeContacts.body.map((c: { id: number }) => c.id);
      // All active managers are valid contacts for an employee.
      expect(empContactIds).toEqual(expect.arrayContaining([managerA.id, managerB.id]));
      expect(empContactIds).not.toContain(employeeB.id);
      expect(empContactIds).toContain(clerk.id);

      const clerkContacts = await request(app)
        .get('/api/v1/conversations/contacts')
        .set(authHeader(clerk.tokens.accessToken));
      expect(clerkContacts.status).toBe(200);
      const clerkContactIds = clerkContacts.body.map((contact: { id: number }) => contact.id);
      expect(clerkContactIds).toEqual(expect.arrayContaining([managerA.id, managerB.id, employee.id, employeeB.id]));
      expect(clerkContactIds).not.toContain(clerkB.id);
    });
  });
});
