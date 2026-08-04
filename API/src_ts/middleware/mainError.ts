import { ErrorRequestHandler } from 'express';
import logger from '../utils/logger';

const mainErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const status = err?.status || err?.statusCode || 500;
  const responseMessage = err?.message || 'Internal Server Error';

  logger.error('Unhandled error encountered', {
    message: responseMessage,
    status,
    method: req.method,
    path: req.originalUrl,
    body: req.body,
    params: req.params,
    query: req.query,
    stack: err?.stack,
  });

  res.status(status).json({ message: responseMessage });
};

export default mainErrorHandler;
