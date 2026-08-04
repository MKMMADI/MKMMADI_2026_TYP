import express from 'express';
import authRoutes from './routes/authRoutes';
import requestLogging from './middleware/requestLogging';
import mainErrorHandler from './middleware/mainError';

const app = express();

app.use(express.json());

// request logging (morgan -> winston)
app.use(requestLogging);

// API routes
app.use('/api/auth', authRoutes);

// simple health / root
app.get('/', (req, res) => res.json({ ok: true }));

// main error handler (should be last)
app.use(mainErrorHandler);

export default app;
