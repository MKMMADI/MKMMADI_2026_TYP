import request from 'supertest';
import app from '../../src_ts/app';
import {
  AuthTokens,
  cleanupTestData,
  createAndLoginUser,
  randomString,
} from '../helpers/testHelpers';
import logger from '../../src_ts/utils/logger';

type TestActor = {
  id: number;
  role: 'EMPLOYEE' | 'MANAGER' | 'CLERK';
  tokens: AuthTokens;
};

async function createActor(role: TestActor['role']): Promise<TestActor> {
  const created = await createAndLoginUser({
    role,
    email: `${randomString(role.toLowerCase())}@example.com`,
  });
  return { id: created.user.id, role, tokens: created.tokens };
}

function authorizedAs(actor: TestActor) {
  return { Authorization: `Bearer ${actor.tokens.accessToken}` };
}

describe('Conversation routes integration', () => {
  beforeEach(async () => {
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  it('requires authentication for conversation routes', async () => {
    const response = await request(app).get('/api/v1/conversations');

    expect(response.status).toBe(401);
  });

  it('returns only active contacts permitted by the current role', async () => {
    const manager = await createActor('MANAGER');
    const otherManager = await createActor('MANAGER');
    const employee = await createActor('EMPLOYEE');
    const clerk = await createActor('CLERK');

    const managerContacts = await request(app)
      .get('/api/v1/conversations/contacts')
      .set(authorizedAs(manager));
    expect(managerContacts.body.map((contact: { id: number }) => contact.id).sort()).toEqual(
      [otherManager.id, employee.id, clerk.id].sort(),
    );

    const employeeContacts = await request(app)
      .get('/api/v1/conversations/contacts')
      .set(authorizedAs(employee));
    expect(employeeContacts.body.map((contact: { id: number }) => contact.id)).toEqual([manager.id]);

    const clerkContacts = await request(app)
      .get('/api/v1/conversations/contacts')
      .set(authorizedAs(clerk));
    expect(clerkContacts.body.map((contact: { id: number }) => contact.id)).toEqual([manager.id]);
  });

  it('allows manager-manager, manager-employee, and manager-clerk pairs from either side', async () => {
    const manager = await createActor('MANAGER');
    const secondManager = await createActor('MANAGER');
    const employee = await createActor('EMPLOYEE');
    const clerk = await createActor('CLERK');
    const pairs: [TestActor, TestActor][] = [
      [manager, secondManager],
      [manager, employee],
      [manager, clerk],
    ];

    for (const [initiator, otherParticipant] of pairs) {
      const created = await request(app)
        .post('/api/v1/conversations')
        .set(authorizedAs(initiator))
        .send({ participantId: otherParticipant.id });

      expect(created.status).toBe(201);
      expect(created.body.participant.id).toBe(otherParticipant.id);

      const startedFromOtherSide = await request(app)
        .post('/api/v1/conversations')
        .set(authorizedAs(otherParticipant))
        .send({ participantId: initiator.id });

      expect(startedFromOtherSide.status).toBe(200);
      expect(startedFromOtherSide.body.id).toBe(created.body.id);
    }
  });

  it('rejects employee-employee, employee-clerk, and clerk-clerk conversations', async () => {
    const employee = await createActor('EMPLOYEE');
    const secondEmployee = await createActor('EMPLOYEE');
    const clerk = await createActor('CLERK');
    const secondClerk = await createActor('CLERK');

    const deniedPairs: [TestActor, TestActor][] = [
      [employee, secondEmployee],
      [employee, clerk],
      [clerk, secondClerk],
    ];

    for (const [initiator, otherParticipant] of deniedPairs) {
      const response = await request(app)
        .post('/api/v1/conversations')
        .set(authorizedAs(initiator))
        .send({ participantId: otherParticipant.id });

      expect(response.status).toBe(403);

      const reverseResponse = await request(app)
        .post('/api/v1/conversations')
        .set(authorizedAs(otherParticipant))
        .send({ participantId: initiator.id });

      expect(reverseResponse.status).toBe(403);
    }
  });

  it('persists ordered messages, paginates history, marks received messages read, and hides conversations from outsiders', async () => {
    const manager = await createActor('MANAGER');
    const employee = await createActor('EMPLOYEE');
    const outsider = await createActor('MANAGER');

    const created = await request(app)
      .post('/api/v1/conversations')
      .set(authorizedAs(manager))
      .send({ participantId: employee.id });
    expect(created.status).toBe(201);
    const conversationId = created.body.id as number;

    const firstMessage = await request(app)
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set(authorizedAs(manager))
      .send({ body: '  First message  ' });
    const secondMessage = await request(app)
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set(authorizedAs(employee))
      .send({ body: 'Reply' });
    const thirdMessage = await request(app)
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set(authorizedAs(manager))
      .send({ body: 'Follow-up' });

    expect(firstMessage.status).toBe(201);
    expect(firstMessage.body.body).toBe('First message');
    expect(secondMessage.body.recipient.id).toBe(manager.id);
    expect(thirdMessage.status).toBe(201);

    const latestPage = await request(app)
      .get(`/api/v1/conversations/${conversationId}/messages?limit=2`)
      .set(authorizedAs(employee));
    expect(latestPage.status).toBe(200);
    expect(latestPage.body.messages.map((message: { body: string }) => message.body)).toEqual([
      'Reply',
      'Follow-up',
    ]);
    expect(latestPage.body.nextBeforeId).toBe(secondMessage.body.id);

    const olderPage = await request(app)
      .get(`/api/v1/conversations/${conversationId}/messages?limit=2&beforeId=${latestPage.body.nextBeforeId}`)
      .set(authorizedAs(employee));
    expect(olderPage.body.messages.map((message: { body: string }) => message.body)).toEqual([
      'First message',
    ]);
    expect(olderPage.body.nextBeforeId).toBeNull();

    const markedRead = await request(app)
      .patch(`/api/v1/conversations/${conversationId}/read`)
      .set(authorizedAs(manager));
    expect(markedRead.body.markedRead).toBe(1);

    const managerConversations = await request(app)
      .get('/api/v1/conversations')
      .set(authorizedAs(manager));
    expect(managerConversations.body).toHaveLength(1);
    expect(managerConversations.body[0].unreadCount).toBe(0);

    const outsiderConversations = await request(app)
      .get('/api/v1/conversations')
      .set(authorizedAs(outsider));
    expect(outsiderConversations.body).toEqual([]);

    const outsiderHistory = await request(app)
      .get(`/api/v1/conversations/${conversationId}/messages`)
      .set(authorizedAs(outsider));
    expect(outsiderHistory.status).toBe(404);

    const outsiderSend = await request(app)
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set(authorizedAs(outsider))
      .send({ body: 'Not allowed' });
    expect(outsiderSend.status).toBe(404);
  });

  it('rejects empty and over-limit message bodies and excessive page sizes', async () => {
    const manager = await createActor('MANAGER');
    const employee = await createActor('EMPLOYEE');
    const created = await request(app)
      .post('/api/v1/conversations')
      .set(authorizedAs(manager))
      .send({ participantId: employee.id });
    const conversationId = created.body.id as number;

    const loggerSpy = jest.spyOn(logger, 'error').mockImplementation(() => logger);
    const privateText = 'private-message-content-'.repeat(200);
    try {
      const emptyBody = await request(app)
        .post(`/api/v1/conversations/${conversationId}/messages`)
        .set(authorizedAs(manager))
        .send({ body: '  ' });
      expect(emptyBody.status).toBe(400);

      const longBody = await request(app)
        .post(`/api/v1/conversations/${conversationId}/messages`)
        .set(authorizedAs(manager))
        .send({ body: privateText });
      expect(longBody.status).toBe(400);
      expect(JSON.stringify(loggerSpy.mock.calls)).not.toContain(privateText);
    } finally {
      loggerSpy.mockRestore();
    }

    const tooManyMessages = await request(app)
      .get(`/api/v1/conversations/${conversationId}/messages?limit=101`)
      .set(authorizedAs(manager));
    expect(tooManyMessages.status).toBe(400);
  });
});