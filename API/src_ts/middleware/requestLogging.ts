/**
 * Author : Katlego Mmadi
 * Student Number : 221052648
 * Description : Implements request logging Express middleware for API requests.
 */

import { RequestHandler } from 'express';
import logger from '../utils/logger';
import config from '../config';
import morganFactory from 'morgan';

const requestLogging: RequestHandler = morganFactory('combined', {
  stream: {
    write: (message: string) => {
      logger.info(message.trim());
    },
  },
  skip: () => config.NODE_ENV === 'test',
});

export default requestLogging;
