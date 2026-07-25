-- CreateTable
CREATE TABLE "client_notes" (
    "id" TEXT NOT NULL,
    "specialist_id" TEXT NOT NULL,
    "guest_phone" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_notes_specialist_id_guest_phone_key" ON "client_notes"("specialist_id", "guest_phone");

-- AddForeignKey
ALTER TABLE "client_notes" ADD CONSTRAINT "client_notes_specialist_id_fkey" FOREIGN KEY ("specialist_id") REFERENCES "specialists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
