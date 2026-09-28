import request from 'supertest';
import app from '../../src_ts/app';
import {
  authHeader,
  cleanupTestData,
  createAndLoginUser,
  type AuthTokens,
  type TestUser,
} from '../helpers/testHelpets';

function authorizedAs(session: { tokens: AuthTokens }) {
  return authHeader(session.tokens.accessToken);
}

describe('Conversation routes integration', () => {
  let manager: { user: TestUser; tokens: AuthTokens };
  let secondManager: { user: TestUser; tokens: AuthTokens };
  let employee: { user: TestUser; tokens: AuthTokens };
  let clerk: { user: TestUser; tokens: AuthTokens };
  let otherEmployee: { user: TestUser; tokens: AuthTokens };

  beforeEach(async () => {
    await cleanupTestData();
    const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    [manager, secondManager, employee, clerk, otherEmployee] = await Promise.all([
      createAndLoginUser({ role: 'MANAGER', name: 'Contact Manager', email: `contact_mgr_${suffix}@test.com` }),
      createAndLoginUser({ role: 'MANAGER', name: 'Second Manager', email: `contact_mgr2_${suffix}@test.com` }),
      createAndLoginUser({ role: 'EMPLOYEE', name: 'Contact Employee', email: `contact_emp_${suffix}@test.com` }),
      createAndLoginUser({ role: 'CLERK', name: 'Contact Clerk', email: `contact_clk_${suffix}@test.com` }),
      createAndLoginUser({ role: 'EMPLOYEE', name: 'Other Employee', email: `contact_emp2_${suffix}@test.com` }),
    ]);
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it('returns only active contacts permitted by the current role', async () => {
    const managerContacts = await request(app)
      .get('/api/v1/conversations/contacts')
      .set(authorizedAs(manager));
    expect(managerContacts.status).toBe(200);
    const managerIds = managerContacts.body.map((contact: { id: number }) => contact.id);
    expect(managerIds).toEqual(
      expect.arrayContaining([secondManager.user.id, employee.user.id, clerk.user.id]),
    );
    expect(managerIds).not.toContain(manager.user.id);

    const employeeContacts = await request(app)
      .get('/api/v1/conversations/contacts')
      .set(authorizedAs(employee));
    expect(employeeContacts.status).toBe(200);
    const employeeIds = employeeContacts.body.map((contact: { id: number }) => contact.id);
    // Employees may message managers and clerks.
    expect(employeeIds).toEqual(
      expect.arrayContaining([manager.user.id, secondManager.user.id, clerk.user.id]),
    );
    expect(employeeIds).not.toContain(employee.user.id);
    expect(employeeIds).not.toContain(otherEmployee.user.id);
    expect(new Set(employeeIds).size).toBe(employeeIds.length);

    const clerkContacts = await request(app)
      .get('/api/v1/conversations/contacts')
      .set(authorizedAs(clerk));
    expect(clerkContacts.status).toBe(200);
    const clerkIds = clerkContacts.body.map((contact: { id: number }) => contact.id);
    expect(clerkIds).toEqual(
      expect.arrayContaining([manager.user.id, secondManager.user.id, employee.user.id, otherEmployee.user.id]),
    );
    expect(clerkIds).not.toContain(clerk.user.id);
  });

  it('rejects forbidden role pairs when starting a conversation', async () => {
    const blocked = await request(app)
      .post('/api/v1/conversations')
      .set(authorizedAs(employee))
      .send({ participantId: otherEmployee.user.id });
    expect(blocked.status).toBe(403);

    const allowed = await request(app)
      .post('/api/v1/conversations')
      .set(authorizedAs(employee))
      .send({ participantId: manager.user.id });
    expect([200, 201]).toContain(allowed.status);
    expect(allowed.body.participant.id).toBe(manager.user.id);

    const employeeClerk = await request(app)
      .post('/api/v1/conversations')
      .set(authorizedAs(employee))
      .send({ participantId: clerk.user.id });
    expect([200, 201]).toContain(employeeClerk.status);
  });
});
