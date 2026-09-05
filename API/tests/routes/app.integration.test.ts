import request from 'supertest';
import app from '../../src_ts/app';

describe('API routes', () => {
  it('reports that the API is running', async () => {
    const response = await request(app).get('/');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, message: 'Server is running' });
  });

  it('rejects protected routes without an authorization header', async () => {
    const response = await request(app).get('/api/v1/rooms');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: 'Missing Authorization header' });
  });

  it('rejects protected booking routes without an authorization header', async () => {
    const response = await request(app).post('/api/v1/bookings').send({});

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: 'Missing Authorization header' });
  });
});
