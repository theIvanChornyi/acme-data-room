CREATE TABLE "UploadSession" (
    "id" TEXT NOT NULL,
    "dataRoomId" TEXT NOT NULL,
    "folderId" TEXT,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UploadSession_storagePath_key" ON "UploadSession"("storagePath");
CREATE INDEX "UploadSession_ownerId_expiresAt_idx" ON "UploadSession"("ownerId", "expiresAt");
CREATE INDEX "UploadSession_dataRoomId_folderId_idx" ON "UploadSession"("dataRoomId", "folderId");

ALTER TABLE "UploadSession" ADD CONSTRAINT "UploadSession_dataRoomId_fkey"
FOREIGN KEY ("dataRoomId") REFERENCES "DataRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UploadSession" ADD CONSTRAINT "UploadSession_folderId_fkey"
FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UploadSession" ADD CONSTRAINT "UploadSession_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
