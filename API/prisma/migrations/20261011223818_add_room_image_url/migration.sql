-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "employeeId" SET DEFAULT ('EMP-ID-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)));

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");
