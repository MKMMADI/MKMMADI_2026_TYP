-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'RESCHEDULE_REQUIRED';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "displacedByBookingId" INTEGER,
ADD COLUMN     "statusBeforeDisplacement" "BookingStatus",
ADD COLUMN     "suggestedEndAt" TIMESTAMP(3),
ADD COLUMN     "suggestedStartAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "employeeId" SET DEFAULT ('EMP-ID-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)));

-- CreateIndex
CREATE INDEX "Booking_displacedByBookingId_idx" ON "Booking"("displacedByBookingId");

-- CreateIndex
CREATE INDEX "Booking_status_startAt_endAt_idx" ON "Booking"("status", "startAt", "endAt");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_displacedByBookingId_fkey" FOREIGN KEY ("displacedByBookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
