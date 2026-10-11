import express from 'express';
import cors from 'cors';
import config from './config';
import authRoutes from './routes/authRoutes';
import roomRoutes from './routes/roomRoutes';
import amenityRoutes from './routes/amenityRoutes';
import bookingRoutes from './routes/bookingRoutes';
import consumableRoutes from './routes/consumableRoutes';
import reportRoutes from './routes/reportRoutes';
import profileRoutes from './routes/profileRoutes';
import conversationRoutes from './routes/conversationRoutes';
import requestLogging from './middleware/requestLogging';
import mainErrorHandler from './middleware/mainError';
import { getProfile, updateProfile } from './controllers/profileController';
import { authenticate } from './middleware/auth';
import apiLimiter, { authLimiter } from './utils/rateLimiting';

const app = express();

const allowedOrigins = new Set(
  config.CORS_ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean),
);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || config.NODE_ENV !== 'production' || allowedOrigins.has(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
}));
app.use(express.json());
app.use(requestLogging);
app.use('/api/v1/auth', authLimiter);
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api/v1/auth')) {
    return next();
  }
  return apiLimiter(req, res, next);
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/rooms', roomRoutes);
app.use('/api/v1/amenities', amenityRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/consumables', consumableRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/profile', profileRoutes);
app.use('/api/v1/conversations', conversationRoutes);

app.get('/api/v1/me', authenticate, getProfile);
app.patch('/api/v1/me', authenticate, updateProfile);

app.get('/', (req, res) => res.json({ ok: true, message: 'Server is running' }));

app.use(mainErrorHandler);

export default app;
