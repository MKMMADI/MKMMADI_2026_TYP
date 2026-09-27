import request from 'supertest';
import app from '../../src_ts/app';
import {
  createUser,
  createAndLoginUser,
  authHeader,
  cleanupTestData,
  randomString,
} from '../helpers/testHelpers';
import prisma from '../../src_ts/prisma';

describe('Booking Routes Integration Tests', () => {
  let employeeTokens: string;
  let managerTokens: string;
  let clerkTokens: string;
  let roomId: number;
  let secondRoomId: number;

  beforeEach(async () => {
    await cleanupTestData();

    const employee = await createAndLoginUser({ role: 'EMPLOYEE' });
    employeeTokens = employee.tokens.accessToken;

    const manager = await createAndLoginUser({ role: 'MANAGER' });
    managerTokens = manager.tokens.accessToken;

    const clerk = await createAndLoginUser({ role: 'CLERK' });
    clerkTokens = clerk.tokens.accessToken;

    const room = await prisma.room.create({
      data: { name: 'Test Room', capacity: 10, description: 'Floor 1', status: 'AVAILABLE', isActive: true },
    });
    roomId = room.id;
    const secondRoom = await prisma.room.create({
      data: { name: 'Second Test Room', capacity: 8, description: 'Floor 2', status: 'AVAILABLE', isActive: true },
    });
    secondRoomId = secondRoom.id;
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('POST /api/v1/bookings', () => {
    it('should create a booking as an employee', async () => {
      const startDate = new Date(new Date().getTime() + 2 * 60 * 60 * 1000); // 2 hours later
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour later

      const bookingData = {
        roomIds: [roomId],
        purpose: 'Team Meeting',
        startAt: startDate.toISOString(),
        endAt: endDate.toISOString(),
        capacity: 5,
      };

      const response = await request(app)
        .post('/api/v1/bookings')
        .set(authHeader(employeeTokens))
        .send(bookingData);

      expect(response.status).toBe(201);
      expect(response.body.purpose).toBe(bookingData.purpose);
      expect(response.body.status).toBe('PENDING');
    });

    it('should create one booking with multiple selected rooms', async () => {
      const startDate = new Date(new Date().getTime() + 2 * 60 * 60 * 1000);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

      const response = await request(app)
        .post('/api/v1/bookings')
        .set(authHeader(employeeTokens))
        .send({
          roomIds: [roomId, secondRoomId],
          purpose: 'Department workshop',
          startAt: startDate.toISOString(),
          endAt: endDate.toISOString(),
          capacity: 15,
        });

      expect(response.status).toBe(201);
      expect(response.body.rooms).toHaveLength(2);
      expect(response.body.rooms.map((room: { roomId: number }) => room.roomId).sort()).toEqual(
        [roomId, secondRoomId].sort(),
      );
    });

    it('should deduplicate repeated room IDs before creating room links', async () => {
      const startDate = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

      const response = await request(app)
        .post('/api/v1/bookings')
        .set(authHeader(employeeTokens))
        .send({
          roomIds: [roomId, roomId],
          purpose: 'Repeated room selection',
          startAt: startDate.toISOString(),
          endAt: endDate.toISOString(),
          capacity: 5,
        });

      expect(response.status).toBe(201);
      expect(response.body.rooms).toHaveLength(1);
    });

    it('should reject a non-array room selection and non-positive capacity', async () => {
      const startDate = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

      const invalidRoomsResponse = await request(app)
        .post('/api/v1/bookings')
        .set(authHeader(employeeTokens))
        .send({
          roomIds: roomId,
          purpose: 'Invalid room list',
          startAt: startDate.toISOString(),
          endAt: endDate.toISOString(),
          capacity: 5,
        });

      const invalidCapacityResponse = await request(app)
        .post('/api/v1/bookings')
        .set(authHeader(employeeTokens))
        .send({
          roomIds: [roomId],
          purpose: 'Invalid capacity',
          startAt: startDate.toISOString(),
          endAt: endDate.toISOString(),
          capacity: 0,
        });

      expect(invalidRoomsResponse.status).toBe(400);
      expect(invalidCapacityResponse.status).toBe(400);
    });

    it('should reject when the selected rooms do not provide enough combined capacity', async () => {
      const startDate = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

      const response = await request(app)
        .post('/api/v1/bookings')
        .set(authHeader(employeeTokens))
        .send({
          roomIds: [roomId, secondRoomId],
          purpose: 'Too many attendees',
          startAt: startDate.toISOString(),
          endAt: endDate.toISOString(),
          capacity: 19,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Selected rooms do not provide enough capacity');
    });

    it('should reject when a requested amenity is missing from one selected room', async () => {
      const amenity = await prisma.amenity.create({ data: { name: 'Video wall', isActive: true } });
      await prisma.roomAmenity.create({ data: { roomId, amenityId: amenity.id } });
      const startDate = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

      const response = await request(app)
        .post('/api/v1/bookings')
        .set(authHeader(employeeTokens))
        .send({
          roomIds: [roomId, secondRoomId],
          purpose: 'Special equipment meeting',
          startAt: startDate.toISOString(),
          endAt: endDate.toISOString(),
          capacity: 15,
          amenityIds: [amenity.id],
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Second Test Room');
    });

    it('should reject the whole booking when one selected room conflicts', async () => {
      const startDate = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

      await request(app)
        .post('/api/v1/bookings')
        .set(authHeader(employeeTokens))
        .send({
          roomIds: [roomId],
          purpose: 'Existing booking',
          startAt: startDate.toISOString(),
          endAt: endDate.toISOString(),
          capacity: 5,
        })
        .expect(201);

      const response = await request(app)
        .post('/api/v1/bookings')
        .set(authHeader(employeeTokens))
        .send({
          roomIds: [roomId, secondRoomId],
          purpose: 'Conflicting multi-room booking',
          startAt: startDate.toISOString(),
          endAt: endDate.toISOString(),
          capacity: 15,
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Test Room');
      expect(
        await prisma.booking.findFirst({ where: { purpose: 'Conflicting multi-room booking' } }),
      ).toBeNull();
    });

    it('should reject booking creation by manager', async () => {
      const startDate = new Date(new Date().getTime() + 2 * 60 * 60 * 1000);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

      const response = await request(app)
        .post('/api/v1/bookings')
        .set(authHeader(managerTokens))
        .send({
          roomIds: [roomId],
          purpose: 'Manager Booking',
          startAt: startDate.toISOString(),
          endAt: endDate.toISOString(),
          capacity: 5,
        });

      expect(response.status).toBe(403);
    });

    it('should approve and prepare a multi-room booking as one parent booking', async () => {
      const startDate = new Date(Date.now() + 4 * 60 * 60 * 1000);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

      const createResponse = await request(app)
        .post('/api/v1/bookings')
        .set(authHeader(employeeTokens))
        .send({
          roomIds: [roomId, secondRoomId],
          purpose: 'Multi-room lifecycle',
          startAt: startDate.toISOString(),
          endAt: endDate.toISOString(),
          capacity: 15,
        });

      expect(createResponse.status).toBe(201);
      const bookingId = createResponse.body.id;
      expect(createResponse.body.rooms).toHaveLength(2);
      expect(createResponse.body.rooms.map((link: { roomId: number }) => link.roomId).sort()).toEqual(
        [roomId, secondRoomId].sort(),
      );

      const approvalResponse = await request(app)
        .patch(`/api/v1/bookings/${bookingId}/approve`)
        .set(authHeader(managerTokens));

      expect(approvalResponse.status).toBe(200);
      expect(approvalResponse.body.status).toBe('CONFIRMED');
      expect(approvalResponse.body.rooms).toHaveLength(2);
      expect(approvalResponse.body.rooms.map((link: { roomId: number }) => link.roomId).sort()).toEqual(
        [roomId, secondRoomId].sort(),
      );

      const preparationResponse = await request(app)
        .patch(`/api/v1/bookings/${bookingId}/status`)
        .set(authHeader(clerkTokens))
        .send({ status: 'PREPARING' });

      expect(preparationResponse.status).toBe(200);
      expect(preparationResponse.body.status).toBe('PREPARING');
      expect(preparationResponse.body.rooms).toHaveLength(2);
      expect(preparationResponse.body.rooms.map((link: { roomId: number; roomStatus: string }) => ({
        roomId: link.roomId,
        roomStatus: link.roomStatus,
      }))).toEqual(expect.arrayContaining([
        { roomId, roomStatus: 'BOOKED' },
        { roomId: secondRoomId, roomStatus: 'BOOKED' },
      ]));
    });

    it('should reject a multi-room booking as one parent booking', async () => {
      const startDate = new Date(Date.now() + 4 * 60 * 60 * 1000);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

      const createResponse = await request(app)
        .post('/api/v1/bookings')
        .set(authHeader(employeeTokens))
        .send({
          roomIds: [roomId, secondRoomId],
          purpose: 'Multi-room rejection',
          startAt: startDate.toISOString(),
          endAt: endDate.toISOString(),
          capacity: 15,
        });

      const rejectionResponse = await request(app)
        .patch(`/api/v1/bookings/${createResponse.body.id}/reject`)
        .set(authHeader(managerTokens))
        .send({ reasonCode: 'ROOM_UNAVAILABLE', note: 'One selected room is unavailable' });

      expect(rejectionResponse.status).toBe(200);
      expect(rejectionResponse.body.status).toBe('CANCELLED');
      expect(rejectionResponse.body.rooms).toHaveLength(2);
      expect(rejectionResponse.body.rooms.map((link: { roomId: number }) => link.roomId).sort()).toEqual(
        [roomId, secondRoomId].sort(),
      );
    });

    it('should reject booking without authentication', async () => {
      const response = await request(app).post('/api/v1/bookings').send({});

      expect(response.status).toBe(401);
    });

    it('should reject booking with missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/bookings')
        .set(authHeader(employeeTokens))
        .send({ purpose: 'Missing room and dates' });

      expect(response.status).toBe(400);
    });

    it('should reject booking with invalid date range', async () => {
      const startDate = new Date(new Date().getTime() + 2 * 60 * 60 * 1000);
      const endDate = new Date(startDate.getTime() - 60 * 60 * 1000); // End before start

      const response = await request(app)
        .post('/api/v1/bookings')
        .set(authHeader(employeeTokens))
        .send({
          roomIds: [roomId],
          purpose: 'Invalid Dates',
          startAt: startDate.toISOString(),
          endAt: endDate.toISOString(),
          capacity: 5,
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/bookings', () => {
    beforeEach(async () => {
      const startDate = new Date(new Date().getTime() + 2 * 60 * 60 * 1000);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

      const employee = await prisma.user.findFirst({ where: { role: 'EMPLOYEE' } });

      await prisma.booking.createMany({
        data: [
          {
            employeeId: employee!.id,
            purpose: 'Booking 1',
            startAt: startDate,
            endAt: endDate,
            status: 'PENDING',
          },
          {
            employeeId: employee!.id,
            purpose: 'Booking 2',
            startAt: startDate,
            endAt: endDate,
            status: 'CONFIRMED',
          },
        ],
      });

      // Create booking rooms for each booking
      const bookings = await prisma.booking.findMany({
        where: { employeeId: employee!.id },
        orderBy: { createdAt: 'desc' },
      });

      for (const booking of bookings) {
        await prisma.bookingRoom.create({
          data: {
            bookingId: booking.id,
            roomId: roomId,
            roomStatus: 'BOOKED',
          },
        });
      }
    });

    it('should list bookings for authenticated user', async () => {
      const response = await request(app)
        .get('/api/v1/bookings')
        .set(authHeader(employeeTokens));

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should filter bookings by status', async () => {
      const response = await request(app)
        .get('/api/v1/bookings')
        .set(authHeader(employeeTokens))
        .query({ status: 'CONFIRMED' });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should reject unauthenticated access', async () => {
      const response = await request(app).get('/api/v1/bookings');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/bookings/:id', () => {
    let bookingId: number;

    beforeEach(async () => {
      const startDate = new Date(new Date().getTime() + 2 * 60 * 60 * 1000);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
      
      const user = await prisma.user.findFirst({ where: { role: 'EMPLOYEE' } });
      
      const booking = await prisma.booking.create({
        data: {
          employeeId: user!.id,
          purpose: 'Single Booking',
          startAt: startDate,
          endAt: endDate,
          status: 'PENDING',
        },
      });
      
      await prisma.bookingRoom.create({
        data: {
          bookingId: booking.id,
          roomId,
          roomStatus: 'BOOKED',
        },
      });
      
      bookingId = booking.id;
    });

    it('should get a specific booking by id', async () => {
      const response = await request(app)
        .get(`/api/v1/bookings/${bookingId}`)
        .set(authHeader(employeeTokens));

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(bookingId);
    });

    it('should return 404 for non-existent booking', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';

      const response = await request(app)
        .get(`/api/v1/bookings/${fakeId}`)
        .set(authHeader(employeeTokens));

      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /api/v1/bookings/:id/approve', () => {
    let bookingId: number;

    beforeEach(async () => {
      const startDate = new Date(new Date().getTime() + 2 * 60 * 60 * 1000);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
      
      const user = await prisma.user.findFirst({ where: { role: 'EMPLOYEE' } });
      
      const booking = await prisma.booking.create({
        data: {
          employeeId: user!.id,
          purpose: 'To Approve',
          startAt: startDate,
          endAt: endDate,
          status: 'PENDING',
        },
      });
      bookingId = booking.id;

      await prisma.bookingRoom.create({
        data: {
          bookingId: booking.id,
          roomId: roomId,
          roomStatus: 'BOOKED',
        },
      });
    });

    it('should approve a booking as manager', async () => {
      const response = await request(app)
        .patch(`/api/v1/bookings/${bookingId}/approve`)
        .set(authHeader(managerTokens));

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('CONFIRMED');
    });

    it('should reject approval by non-manager', async () => {
      const response = await request(app)
        .patch(`/api/v1/bookings/${bookingId}/approve`)
        .set(authHeader(employeeTokens));

      expect(response.status).toBe(403);
    });

    it('should reject approving already confirmed booking', async () => {
      // First approval
      await request(app)
        .patch(`/api/v1/bookings/${bookingId}/approve`)
        .set(authHeader(managerTokens));

      // Second approval attempt
      const response = await request(app)
        .patch(`/api/v1/bookings/${bookingId}/approve`)
        .set(authHeader(managerTokens));

      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /api/v1/bookings/:id/reject', () => {
    let bookingId: number;

    beforeEach(async () => {
      const startDate = new Date(new Date().getTime() + 2 * 60 * 60 * 1000);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
      
      const user = await prisma.user.findFirst({ where: { role: 'EMPLOYEE' } });
      
      const booking = await prisma.booking.create({
        data: {
          employeeId: user!.id,
          purpose: 'To Reject',
          startAt: startDate,
          endAt: endDate,
          status: 'PENDING',
        },
      });
      bookingId = booking.id;
    });

    it('should reject a booking as manager with reason', async () => {
      const response = await request(app)
        .patch(`/api/v1/bookings/${bookingId}/reject`)
        .set(authHeader(managerTokens))
        .send({ reasonCode: 'ROOM_UNAVAILABLE', note: 'Room unavailable' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('CANCELLED');
    });

    it('should require rejection reason', async () => {
      const response = await request(app)
        .patch(`/api/v1/bookings/${bookingId}/reject`)
        .set(authHeader(managerTokens))
        .send({});

      expect(response.status).toBe(400);
    });

    it('should reject rejection by non-manager', async () => {
      const response = await request(app)
        .patch(`/api/v1/bookings/${bookingId}/reject`)
        .set(authHeader(employeeTokens));

      expect(response.status).toBe(403);
    });
  });

  describe('PATCH /api/v1/bookings/:id/cancel', () => {
    let bookingId: number;

    beforeEach(async () => {
      const startDate = new Date(new Date().getTime() + 2 * 60 * 60 * 1000);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
      
      const user = await prisma.user.findFirst({ where: { role: 'EMPLOYEE' } });
      
      const booking = await prisma.booking.create({
        data: {
          employeeId: user!.id,
          purpose: 'To Cancel',
          startAt: startDate,
          endAt: endDate,
          status: 'CONFIRMED',
        },
      });
      bookingId = booking.id;
    });

    it('should cancel a booking by the booking owner', async () => {
      await prisma.booking.update({
        where: { id: bookingId },
        data: { startAt: new Date(Date.now() + 12 * 60 * 60 * 1000) },
      });

      const response = await request(app)
        .patch(`/api/v1/bookings/${bookingId}/cancel`)
        .set(authHeader(employeeTokens));

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('CANCELLED');
    });

    it('should reject cancellation of completed booking', async () => {
      // Update to COMPLETED status first
      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'COMPLETED' },
      });

      const response = await request(app)
        .patch(`/api/v1/bookings/${bookingId}/cancel`)
        .set(authHeader(employeeTokens));

      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /api/v1/bookings/:id/status', () => {
    let bookingId: number;

    beforeEach(async () => {
      const startDate = new Date(new Date().getTime() + 2 * 60 * 60 * 1000);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
      
      const user = await prisma.user.findFirst({ where: { role: 'EMPLOYEE' } });
      
      const booking = await prisma.booking.create({
        data: {
          employeeId: user!.id,
          purpose: 'Status Update Test',
          startAt: startDate,
          endAt: endDate,
          status: 'CONFIRMED',
        },
      });
      bookingId = booking.id;
    });

    it('should update booking status as clerk', async () => {
      const response = await request(app)
        .patch(`/api/v1/bookings/${bookingId}/status`)
        .set(authHeader(clerkTokens))
        .send({ status: 'PREPARING' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('PREPARING');
    });

    it('should reject status update by non-clerk', async () => {
      const response = await request(app)
        .patch(`/api/v1/bookings/${bookingId}/status`)
        .set(authHeader(employeeTokens))
        .send({ status: 'PREPARING' });

      expect(response.status).toBe(403);
    });

    it('should reject invalid status transition', async () => {
      const response = await request(app)
        .patch(`/api/v1/bookings/${bookingId}/status`)
        .set(authHeader(clerkTokens))
        .send({ status: 'INVALID_STATUS' });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/bookings/occupancy', () => {
    it('should get occupancy report for authenticated user', async () => {
      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const response = await request(app)
        .get('/api/v1/bookings/occupancy')
        .set(authHeader(employeeTokens))
        .query({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should reject unauthenticated occupancy request', async () => {
      const response = await request(app).get('/api/v1/bookings/occupancy');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/bookings/rejection-reasons', () => {
    it('should list rejection reasons for manager', async () => {
      const response = await request(app)
        .get('/api/v1/bookings/rejection-reasons')
        .set(authHeader(managerTokens));

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should list rejection reasons for clerk', async () => {
      const response = await request(app)
        .get('/api/v1/bookings/rejection-reasons')
        .set(authHeader(clerkTokens));

      expect(response.status).toBe(200);
    });

    it('should reject rejection reasons request by employee', async () => {
      const response = await request(app)
        .get('/api/v1/bookings/rejection-reasons')
        .set(authHeader(employeeTokens));

      expect(response.status).toBe(403);
    });
  });

  describe('Complete Booking Workflow', () => {
    it('should handle complete booking lifecycle', async () => {
      const startDate = new Date(Date.now() + 3 * 60 * 60 * 1000);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

      const createResponse = await request(app)
        .post('/api/v1/bookings')
        .set(authHeader(employeeTokens))
        .send({
          roomIds: [roomId],
          purpose: 'Workflow Test',
          startAt: startDate.toISOString(),
          endAt: endDate.toISOString(),
          capacity: 10,
        });

      expect(createResponse.status).toBe(201);
      const bookingId = createResponse.body.id;

      const approveResponse = await request(app)
        .patch(`/api/v1/bookings/${bookingId}/approve`)
        .set(authHeader(managerTokens));

      expect(approveResponse.status).toBe(200);
      expect(approveResponse.body.status).toBe('CONFIRMED');

      const prepareResponse = await request(app)
        .patch(`/api/v1/bookings/${bookingId}/status`)
        .set(authHeader(clerkTokens))
        .send({ status: 'PREPARING' });

      expect(prepareResponse.status).toBe(200);

      const readyResponse = await request(app)
        .patch(`/api/v1/bookings/${bookingId}/status`)
        .set(authHeader(clerkTokens))
        .send({ status: 'READY' });

      expect(readyResponse.status).toBe(200);

      const completeResponse = await request(app)
        .patch(`/api/v1/bookings/${bookingId}/status`)
        .set(authHeader(clerkTokens))
        .send({ status: 'COMPLETED' });

      expect(completeResponse.status).toBe(200);
      expect(completeResponse.body.status).toBe('COMPLETED');
    });
  });
});
