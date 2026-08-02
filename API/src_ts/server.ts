import config from './config/index';
import app from './app';
import logger from './utils/logger';
import prisma from './prisma';

const PORT = config.PORT;

app.listen(PORT, async () => {
  logger.info(`Server listening on ${PORT}`);
  console.log(`Server listening on ${PORT}`);

  try {
    await prisma.$connect();
    logger.info('Prisma connected');
    console.log('Prisma connected');
  } catch (err) {
    logger.error('Prisma connection error', err);
    console.error('Prisma connection error', err);
  }
});
