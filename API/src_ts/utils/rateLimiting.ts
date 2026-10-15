/**
 * Author : Katlego Mmadi
 * Student Number : 221052648
 * Description : Provides shared rate limiting utility functions for the API.
 */


import rateLimit from 'express-rate-limit';
import config from '../config';

const apiLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
  skipSuccessfulRequests: false,
});

export const authLimiter = rateLimit({
  windowMs: config.AUTH_RATE_LIMIT_WINDOW_MS,
  max: config.AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts, please try again later.' },
  skipSuccessfulRequests: false,
});

export default apiLimiter;