/**
 * Author : Katlego Mmadi
 * Student Number : 221052648
 * Description : Implements main error Express middleware for API requests.
 */

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

/**
 * Recursively replaces values of sensitive object fields with a redaction marker.
 * @param value Value whose nested sensitive fields should be redacted.
 * @returns A copy of the supplied value with sensitive fields replaced by a redaction marker.
 */
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

/**
 * Sanitizes and logs the error, then sends its HTTP response or forwards it when headers were already sent.
 * @param err Error being handled, including its HTTP status and message when available.
 * @param req Express request associated with the failed operation.
 * @param res Express response used to return the sanitized error.
 * @param next Express callback used to forward the error when a response has already started.
 * @returns No value; sends a sanitized error response or forwards the error when headers were already sent.
 */
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
