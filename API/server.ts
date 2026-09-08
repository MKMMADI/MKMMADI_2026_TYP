import config from './src_ts/config/index';
import app from './src_ts/app';
import logger from './src_ts/utils/logger';
import prisma from './src_ts/prisma';

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
