import dotenv from 'dotenv';

// Load .env into process.env once at startup
dotenv.config();

const env = {
  PORT: process.env.PORT,
  LOG_LEVEL: process.env.LOG_LEVEL,
  NODE_ENV: process.env.NODE_ENV,
  JWT_SECRET: process.env.JWT_SECRET,
  ACCESS_TOKEN_EXPIRES: process.env.ACCESS_TOKEN_EXPIRES,
  REFRESH_TOKEN_EXPIRES_DAYS: process.env.REFRESH_TOKEN_EXPIRES_DAYS,
  CORS_ALLOWED_ORIGINS: process.env.CORS_ALLOWED_ORIGINS,
  SOCKET_ALLOWED_ORIGINS: process.env.SOCKET_ALLOWED_ORIGINS,
  DATABASE_URL: process.env.DATABASE_URL,
  RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX: process.env.RATE_LIMIT_MAX,
  AUTH_RATE_LIMIT_WINDOW_MS: process.env.AUTH_RATE_LIMIT_WINDOW_MS,
  AUTH_RATE_LIMIT_MAX: process.env.AUTH_RATE_LIMIT_MAX,
};

export default env;
