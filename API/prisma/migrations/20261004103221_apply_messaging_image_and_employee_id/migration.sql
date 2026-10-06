/*
  Warnings:

  - A unique constraint covering the columns `[employeeId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "OfficialRole" AS ENUM ('CHAIRMAN_OF_THE_BOARD', 'CHIEF_OF_STAFF', 'FINANCIAL_CONTROL_OFFICER', 'DIRECTOR', 'PRESIDENT', 'COMPANY_SECRETARY', 'TREASURER', 'PARTNER', 'VICE_CHAIRMAN');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "employeeId" TEXT NOT NULL DEFAULT ('EMP-ID-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8))),
ADD COLUMN     "officialRole" "OfficialRole";

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeId_key" ON "User"("employeeId");
