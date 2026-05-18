-- CreateTable
CREATE TABLE "StudyPreset" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagIds" JSONB NOT NULL DEFAULT '[]',
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyPreset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudyPreset_userId_idx" ON "StudyPreset"("userId");

-- CreateIndex
CREATE INDEX "StudyPreset_isShared_idx" ON "StudyPreset"("isShared");

-- AddForeignKey
ALTER TABLE "StudyPreset" ADD CONSTRAINT "StudyPreset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
