import express from 'express';
import authRoutes from './routes/authRoutes';
import roomRoutes from './routes/roomRoutes';
import amenityRoutes from './routes/amenityRoutes';
import bookingRoutes from './routes/bookingRoutes';
import requestLogging from './middleware/requestLogging';
import mainErrorHandler from './middleware/mainError';
import { getProfile, updateProfile } from './controllers/profileController';
import { authenticate } from './middleware/auth';

const app = express();

app.use(express.json());
app.use(requestLogging);

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/rooms', roomRoutes);
app.use('/api/v1/amenities', amenityRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.get('/api/v1/me', authenticate, getProfile);
app.patch('/api/v1/me', authenticate, updateProfile);

app.get('/', (req, res) => res.json({ ok: true }));
app.use(mainErrorHandler);

export default app;
