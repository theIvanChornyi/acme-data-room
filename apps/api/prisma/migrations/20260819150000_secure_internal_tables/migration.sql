-- The application accesses these tables only through the NestJS API and Prisma.
-- Keep them inaccessible through Supabase's public Data API.
ALTER TABLE public."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."DataRoom" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Folder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."File" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Share" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."UploadSession" ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE
  public."_prisma_migrations",
  public."User",
  public."DataRoom",
  public."Folder",
  public."File",
  public."Share",
  public."UploadSession"
FROM anon, authenticated;

-- Prisma migrations run as postgres. New internal tables must opt in to public
-- Data API access explicitly rather than receiving it through default grants.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL PRIVILEGES ON TABLES FROM anon, authenticated;
