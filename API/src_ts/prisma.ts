import { readFileSync } from 'node:fs'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg'

const connectionString = process.env.DATABASE_URL
const isProduction = process.env.NODE_ENV === 'production'

if (!connectionString) {
  throw new Error('DATABASE_URL must be set')
}

let poolConnectionString = connectionString
if (isProduction) {
  const databaseUrl = new URL(connectionString)
  databaseUrl.searchParams.delete('sslmode')
  databaseUrl.searchParams.delete('sslrootcert')
  poolConnectionString = databaseUrl.toString()
}

export const pool = new Pool({
  connectionString: poolConnectionString,
  ...(isProduction
    ? {
        ssl: {
          ca: readFileSync('/app/certs/rds-global-bundle.pem', 'utf8'),
          rejectUnauthorized: true,
        },
      }
    : {}),
})
const adapter = new PrismaPg(pool, { disposeExternalPool: true })
const prisma = new PrismaClient({ adapter })

export default prisma
