-- CreateEnum
CREATE TYPE "ShareTargetType" AS ENUM ('DATA_ROOM', 'FOLDER', 'FILE');

-- CreateEnum
CREATE TYPE "ShareAccessType" AS ENUM ('PUBLIC_LINK', 'USER');

-- CreateEnum
CREATE TYPE "ShareRole" AS ENUM ('VIEWER', 'EDITOR');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataRoom" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Folder" (
    "id" TEXT NOT NULL,
    "dataRoomId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Folder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL,
    "dataRoomId" TEXT NOT NULL,
    "folderId" TEXT,
    "name" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Share" (
    "id" TEXT NOT NULL,
    "dataRoomId" TEXT NOT NULL,
    "folderId" TEXT,
    "fileId" TEXT,
    "targetType" "ShareTargetType" NOT NULL,
    "accessType" "ShareAccessType" NOT NULL,
    "recipientId" TEXT,
    "token" TEXT,
    "role" "ShareRole" NOT NULL DEFAULT 'VIEWER',
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Share_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "DataRoom_ownerId_updatedAt_idx" ON "DataRoom"("ownerId", "updatedAt");

-- CreateIndex
CREATE INDEX "Folder_dataRoomId_parentId_name_idx" ON "Folder"("dataRoomId", "parentId", "name");

-- CreateIndex
CREATE INDEX "Folder_dataRoomId_path_idx" ON "Folder"("dataRoomId", "path");

-- CreateIndex
CREATE UNIQUE INDEX "Folder_dataRoomId_parentId_name_key" ON "Folder"("dataRoomId", "parentId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "File_storagePath_key" ON "File"("storagePath");

-- CreateIndex
CREATE INDEX "File_dataRoomId_folderId_name_idx" ON "File"("dataRoomId", "folderId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "File_dataRoomId_folderId_name_key" ON "File"("dataRoomId", "folderId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Share_token_key" ON "Share"("token");

-- CreateIndex
CREATE INDEX "Share_recipientId_revokedAt_idx" ON "Share"("recipientId", "revokedAt");

-- CreateIndex
CREATE INDEX "Share_token_revokedAt_idx" ON "Share"("token", "revokedAt");

-- AddForeignKey
ALTER TABLE "DataRoom" ADD CONSTRAINT "DataRoom_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_dataRoomId_fkey" FOREIGN KEY ("dataRoomId") REFERENCES "DataRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_dataRoomId_fkey" FOREIGN KEY ("dataRoomId") REFERENCES "DataRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Share" ADD CONSTRAINT "Share_dataRoomId_fkey" FOREIGN KEY ("dataRoomId") REFERENCES "DataRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Share" ADD CONSTRAINT "Share_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Share" ADD CONSTRAINT "Share_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Share" ADD CONSTRAINT "Share_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
