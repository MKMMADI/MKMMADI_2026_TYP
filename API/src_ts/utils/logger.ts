import winston from 'winston';
import config from '../config';

const { combine, timestamp, printf, colorize, errors, splat } = winston.format;

const logFormat = printf(({ timestamp, level, message, stack, ...meta }) => {
  const base = `${timestamp} ${level}: ${stack || message}`;
  const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return base + metaString;
});

const logger = winston.createLogger({
  level: config.LOG_LEVEL,
  format: combine(errors({ stack: true }), timestamp(), splat(), logFormat),
  transports: [
    new winston.transports.Console({
      format: combine(colorize({ all: true }), timestamp(), splat(), logFormat),
    }),
    new winston.transports.File({
      filename: 'logs/app.log',
      level: 'info',
      format: combine(timestamp(), splat(), logFormat),
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' }),
  ],
  rejectionHandlers: [
    new winston.transports.File({ filename: 'logs/rejections.log' }),
  ],
});

export default logger;
