-- These indexes match the Data Room child-listing predicates and keyset order:
-- data room + parent, then the stable (name, id) cursor.
CREATE INDEX "Folder_dataRoomId_parentId_name_id_idx"
ON "Folder"("dataRoomId", "parentId", "name", "id");

CREATE INDEX "File_dataRoomId_folderId_name_id_idx"
ON "File"("dataRoomId", "folderId", "name", "id");
