import express from 'express';
import cors from 'cors';
import rateLimit from './utils/rateLimiting';
import authRoutes from './routes/authRoutes';
import roomRoutes from './routes/roomRoutes';
import amenityRoutes from './routes/amenityRoutes';
import bookingRoutes from './routes/bookingRoutes';
import requestLogging from './middleware/requestLogging';
import mainErrorHandler from './middleware/mainError';
import { getProfile, updateProfile } from './controllers/profileController';
import { authenticate ,requireRole } from './middleware/auth';

const app = express();

//Cross Origin Resource Sharing
app.use(cors());
//Accept JSON data in request body
app.use(express.json());
//logs each request to the console
app.use(requestLogging);
//apply rate limiting to all requests
app.use(rateLimit);

//routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/rooms', roomRoutes);
app.use('/api/v1/amenities', amenityRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.get('/api/v1/me', authenticate , getProfile);
app.patch('/api/v1/user', authenticate,requireRole("MANAGER"),updateProfile);

//Health check route
app.get('/', (req, res) => res.json({ ok: true  , message: "Server is running" }));

//use the main error handler middleware 
app.use(mainErrorHandler);

export default app;




