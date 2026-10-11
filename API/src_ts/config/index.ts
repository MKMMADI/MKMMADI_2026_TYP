import env from './options';

function toNumber(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const n = Number(value);
  if (Number.isNaN(n)) {
    throw new Error(`Invalid number in env config: "${value}"`);
  }
  return n;
}

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`${name} is required but was not set`);
  }
  return value;
}

const NODE_ENV = env.NODE_ENV || 'development';

const config = {
  PORT: toNumber(env.PORT, 4000),
  LOG_LEVEL: env.LOG_LEVEL || 'info',
  NODE_ENV,
  JWT_SECRET:
    NODE_ENV === 'production'
      ? required(env.JWT_SECRET, 'JWT_SECRET')
      : env.JWT_SECRET || 'change-me',
  ACCESS_TOKEN_EXPIRES: env.ACCESS_TOKEN_EXPIRES || '15m',
  REFRESH_TOKEN_EXPIRES_DAYS: toNumber(env.REFRESH_TOKEN_EXPIRES_DAYS, 30),
  CORS_ALLOWED_ORIGINS: env.CORS_ALLOWED_ORIGINS || '',
  SOCKET_ALLOWED_ORIGINS: env.SOCKET_ALLOWED_ORIGINS || '',
  URL: required(env.DATABASE_URL, 'DATABASE_URL'),
  RATE_LIMIT_WINDOW_MS: toNumber(env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  RATE_LIMIT_MAX: toNumber(env.RATE_LIMIT_MAX, 1000),
  AUTH_RATE_LIMIT_WINDOW_MS: toNumber(env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  AUTH_RATE_LIMIT_MAX: toNumber(env.AUTH_RATE_LIMIT_MAX, 1000),
};

export type AppConfig = typeof config;

export default config;