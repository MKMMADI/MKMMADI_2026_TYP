import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes';
import roomRoutes from './routes/roomRoutes';
import amenityRoutes from './routes/amenityRoutes';
import bookingRoutes from './routes/bookingRoutes';
import consumableRoutes from './routes/consumableRoutes';
import reportRoutes from './routes/reportRoutes';
import requestLogging from './middleware/requestLogging';
import mainErrorHandler from './middleware/mainError';
import { getProfile, updateProfile } from './controllers/profileController';
import { authenticate } from './middleware/auth';

const app = express();

app.use(cors());
app.use(express.json());
app.use(requestLogging);
//add rate limiting middleware



app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/rooms', roomRoutes);
app.use('/api/v1/amenities', amenityRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/consumables', consumableRoutes);   
app.use('/api/v1/reports', reportRoutes);

app.get('/api/v1/me', authenticate, getProfile);
app.patch('/api/v1/me', authenticate, updateProfile);

app.get('/', (req, res) => res.json({ ok: true, message: 'Server is running' }));

app.use(mainErrorHandler);

export default app;
