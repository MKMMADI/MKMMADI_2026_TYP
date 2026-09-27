import prisma, { pool as prismaPool } from '../src_ts/prisma';
import prismaTest, { pool as prismaTestPool } from '../src_ts/prismaTest';

export default async () => {
  await Promise.allSettled([prisma.$disconnect(), prismaTest.$disconnect()]);
  await Promise.allSettled([prismaPool.end(), prismaTestPool.end()]);
};
