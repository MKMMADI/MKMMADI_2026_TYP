-- AlterTable
ALTER TABLE "User" ALTER COLUMN "employeeId" SET DEFAULT ('EMP-ID-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)));
