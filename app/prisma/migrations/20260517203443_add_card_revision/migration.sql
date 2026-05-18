-- CreateTable
CREATE TABLE "CardRevision" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "editedByUserId" TEXT NOT NULL,
    "editedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    "snapshot" JSONB NOT NULL,

    CONSTRAINT "CardRevision_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CardRevision_cardId_editedAt_idx" ON "CardRevision"("cardId", "editedAt");

-- AddForeignKey
ALTER TABLE "CardRevision" ADD CONSTRAINT "CardRevision_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardRevision" ADD CONSTRAINT "CardRevision_editedByUserId_fkey" FOREIGN KEY ("editedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
