import { ErrorRequestHandler } from 'express';
import logger from '../utils/logger';

const sensitiveFields = new Set([
  'password',
  'passwordhash',
  'currentpassword',
  'newpassword',
  'confirmpassword',
  'token',
  'accesstoken',
  'refreshtoken',
  'secret',
  'apikey',
  'authorization',
]);

function redactSensitiveFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitiveFields);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, fieldValue]) => [
      key,
      sensitiveFields.has(key.toLowerCase()) ? '[redacted]' : redactSensitiveFields(fieldValue),
    ]),
  );
}

const mainErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const status = err?.status || err?.statusCode || 500;
  const responseMessage = err?.message || 'Internal Server Error';
  const safePath = req.originalUrl.split('?')[0];
  const isSensitiveRequest =
    safePath.startsWith('/api/v1/conversations') || safePath.startsWith('/api/v1/auth');

  logger.error('Unhandled error encountered', {
    message: responseMessage,
    status,
    method: req.method,
    path: safePath,
    body: isSensitiveRequest ? '[redacted]' : redactSensitiveFields(req.body),
    params: redactSensitiveFields(req.params),
    query: redactSensitiveFields(req.query),
    stack: err?.stack,
  });

  res.status(status).json({ message: responseMessage });
};

export default mainErrorHandler;
