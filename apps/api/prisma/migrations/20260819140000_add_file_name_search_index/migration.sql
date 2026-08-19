-- pg_trgm makes ILIKE '%query%' file-name searches indexable. The existing
-- dataRoomId-leading B-tree indexes keep the result scoped to one Data Room.
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE INDEX "File_name_trgm_idx"
ON "File" USING GIN ("name" extensions.gin_trgm_ops);
