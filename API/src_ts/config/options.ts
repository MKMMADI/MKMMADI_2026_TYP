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
  DATABASE_URL: process.env.DATABASE_URL
};

export default env;
