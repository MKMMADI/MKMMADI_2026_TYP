/**
 * Author : Katlego Mmadi
 * Student Number : 221052648
 * Description : Starts and gracefully shuts down the API HTTP server.
 */

import { createServer } from 'http';
import config from './config/index';
import app from './app';
import logger from './utils/logger';
import prisma from './prisma';
import { initializeRealtime } from './services/realtime';

const PORT = config.PORT;
const server = createServer(app);

/**
 * Starts the HTTP server after initializing its dependencies.

 * @returns A promise resolving after the server startup attempt; exits the process if database connection fails.
 */
async function startServer() {
  try {
    await prisma.$connect();
    logger.info('Prisma connected');
    console.log('Prisma connected');

    initializeRealtime(server);
    server.listen(PORT, () => {
      logger.info(`Server listening on ${PORT}`);
      console.log(`Server listening on ${PORT}`);
    });
  } catch (err) {
    logger.error('Prisma connection error', err);
    console.error('Prisma connection error', err);
    process.exit(1);
  }
}

/**
 * Closes the HTTP server and Prisma client gracefully before exiting.
 * @param signal Process signal that initiated graceful shutdown.
 * @returns No value; closes the HTTP server and database connections before exiting.
 */
const shutdown = async (signal: string) => {
  logger.info(`Received ${signal}; shutting down gracefully`);
  server.close(async (error) => {
    if (error) {
      logger.error('Error while closing HTTP server', error);
      process.exitCode = 1;
    }

    try {
      await prisma.$disconnect();
      logger.info('Prisma disconnected');
    } catch (disconnectError) {
      logger.error('Error while disconnecting Prisma', disconnectError);
      process.exitCode = 1;
    } finally {
      process.exit();
    }
  });
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

startServer();
