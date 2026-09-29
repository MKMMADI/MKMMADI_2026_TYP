ALTER TABLE "Booking"
ADD COLUMN "assignedClerkId" INTEGER;

CREATE INDEX "Booking_assignedClerkId_idx"
ON "Booking"("assignedClerkId");

ALTER TABLE "Booking"
ADD CONSTRAINT "Booking_assignedClerkId_fkey"
FOREIGN KEY ("assignedClerkId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;