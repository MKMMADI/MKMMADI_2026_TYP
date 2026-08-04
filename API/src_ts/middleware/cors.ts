import { RequestHandler } from 'express';
import config from '../config';

const cors: RequestHandler = (req, res, next) => {
  const originHeader = req.headers.origin;
  const requestOrigin = Array.isArray(originHeader) ? originHeader[0] : originHeader;
  const allowedOrigins = config.CORS_ORIGIN.split(',').map((origin) => origin.trim());

  if (allowedOrigins.includes('*')) {
    res.header('Access-Control-Allow-Origin', '*');
  } else if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    res.header('Access-Control-Allow-Origin', requestOrigin);
  }

  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
};

export default cors;
