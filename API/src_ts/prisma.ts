import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'

export const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool, { disposeExternalPool: true })
const prisma = new PrismaClient({ adapter })

export default prisma
