-- Add PWA mode and import metadata for real PWA generator/import flows
DO $$ BEGIN
  CREATE TYPE "PwaMode" AS ENUM ('GENERATOR', 'IMPORT');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "AppProject"
  ADD COLUMN IF NOT EXISTS "pwa_mode" "PwaMode" NOT NULL DEFAULT 'GENERATOR',
  ADD COLUMN IF NOT EXISTS "imported_manifest_url" TEXT,
  ADD COLUMN IF NOT EXISTS "imported_sw_url" TEXT,
  ADD COLUMN IF NOT EXISTS "imported_start_url" TEXT,
  ADD COLUMN IF NOT EXISTS "imported_scope" TEXT,
  ADD COLUMN IF NOT EXISTS "imported_icons_valid" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "pwa_audited_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "AppProject_pwa_mode_idx" ON "AppProject"("pwa_mode");
