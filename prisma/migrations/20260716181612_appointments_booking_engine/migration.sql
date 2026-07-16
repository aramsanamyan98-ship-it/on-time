-- Required for the EXCLUDE constraint below: adds the operator classes
-- that let a GiST index compare plain equality (specialist_id) alongside
-- a range-overlap operator (the start_at/end_at range) in one index.
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('confirmed', 'cancelled', 'completed', 'no_show');

-- CreateEnum
CREATE TYPE "AppointmentSource" AS ENUM ('guest_booking', 'manual_specialist_entry');

-- CreateTable
CREATE TABLE "blocked_time" (
    "id" TEXT NOT NULL,
    "specialist_id" TEXT NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blocked_time_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "specialist_id" TEXT NOT NULL,
    "service_id" TEXT NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'confirmed',
    "guest_name" TEXT NOT NULL,
    "guest_phone" TEXT NOT NULL,
    "guest_email" TEXT,
    "guest_notes" TEXT,
    "source" "AppointmentSource" NOT NULL DEFAULT 'guest_booking',
    "booking_token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "blocked_time_specialist_id_idx" ON "blocked_time"("specialist_id");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_booking_token_key" ON "appointments"("booking_token");

-- CreateIndex
CREATE INDEX "appointments_specialist_id_idx" ON "appointments"("specialist_id");

-- CreateIndex
CREATE INDEX "appointments_service_id_idx" ON "appointments"("service_id");

-- AddForeignKey
ALTER TABLE "blocked_time" ADD CONSTRAINT "blocked_time_specialist_id_fkey" FOREIGN KEY ("specialist_id") REFERENCES "specialists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_specialist_id_fkey" FOREIGN KEY ("specialist_id") REFERENCES "specialists"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- No double bookings (05_Database.md, 07_Business_Rules.md): reject any
-- INSERT/UPDATE that would leave two non-cancelled appointments for the
-- same specialist with overlapping [start_at, end_at) ranges. The range is
-- half-open so back-to-back appointments (one ending exactly when the next
-- starts) don't count as an overlap. This is enforced independently of
-- (and in addition to) the application-level availability check, so a race
-- between two simultaneous booking requests can never both succeed.
-- tsrange (not tstzrange) matches start_at/end_at's actual column type
-- (timestamp without time zone, storing UTC instants per 05_Database.md)
-- so the comparison never depends on the DB session's timezone setting.
ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_no_overlap"
  EXCLUDE USING gist (
    "specialist_id" WITH =,
    tsrange("start_at", "end_at", '[)') WITH &&
  )
  WHERE ("status" <> 'cancelled');
