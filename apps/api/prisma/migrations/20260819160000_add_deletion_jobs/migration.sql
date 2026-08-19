-- Large deletions are processed in idempotent batches instead of one request.
CREATE TYPE "DeletionTargetType" AS ENUM ('DATA_ROOM', 'FOLDER');

ALTER TABLE "DataRoom" ADD COLUMN "deletionRequestedAt" TIMESTAMP(3);
ALTER TABLE "Folder" ADD COLUMN "deletionRequestedAt" TIMESTAMP(3);

CREATE TABLE "DeletionJob" (
    "id" TEXT NOT NULL,
    "dataRoomId" TEXT NOT NULL,
    "folderId" TEXT,
    "targetType" "DeletionTargetType" NOT NULL,
    "folderPath" TEXT,
    "requestedById" TEXT NOT NULL,
    "deletedFiles" INTEGER NOT NULL DEFAULT 0,
    "deletedUploads" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "lockedUntil" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeletionJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DataRoom_ownerId_deletionRequestedAt_idx"
ON "DataRoom"("ownerId", "deletionRequestedAt");

CREATE INDEX "Folder_dataRoomId_deletionRequestedAt_idx"
ON "Folder"("dataRoomId", "deletionRequestedAt");

CREATE INDEX "DeletionJob_completedAt_lockedUntil_idx"
ON "DeletionJob"("completedAt", "lockedUntil");

CREATE INDEX "DeletionJob_dataRoomId_completedAt_idx"
ON "DeletionJob"("dataRoomId", "completedAt");

CREATE INDEX "DeletionJob_requestedById_completedAt_idx"
ON "DeletionJob"("requestedById", "completedAt");

ALTER TABLE "DeletionJob" ADD CONSTRAINT "DeletionJob_dataRoomId_fkey"
FOREIGN KEY ("dataRoomId") REFERENCES "DataRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DeletionJob" ADD CONSTRAINT "DeletionJob_folderId_fkey"
FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DeletionJob" ADD CONSTRAINT "DeletionJob_requestedById_fkey"
FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE public."DeletionJob" ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public."DeletionJob" FROM anon, authenticated;
