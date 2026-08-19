-- PostgreSQL considers NULL values distinct in a regular composite unique index.
-- These partial indexes preserve the application invariant for Data Room roots.
CREATE UNIQUE INDEX "Folder_dataRoomId_root_name_key"
ON "Folder"("dataRoomId", "name")
WHERE "parentId" IS NULL;

CREATE UNIQUE INDEX "File_dataRoomId_root_name_key"
ON "File"("dataRoomId", "name")
WHERE "folderId" IS NULL;
