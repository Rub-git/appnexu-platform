-- Add dedicated visual preset field and remove legacy template reference
ALTER TABLE "AppProject"
ADD COLUMN IF NOT EXISTS "visual_preset_slug" TEXT;

CREATE INDEX IF NOT EXISTS "AppProject_visual_preset_slug_idx" ON "AppProject"("visual_preset_slug");

-- Backfill from legacy template relation when possible
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'AppProject'
      AND column_name = 'template_id'
  )
  AND EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'AppTemplate'
  ) THEN
    UPDATE "AppProject" p
    SET "visual_preset_slug" = t."slug"
    FROM "AppTemplate" t
    WHERE p."template_id" IS NOT NULL
      AND p."template_id" = t."id"
      AND p."visual_preset_slug" IS NULL;
  END IF;
END $$;

DROP INDEX IF EXISTS "AppProject_template_id_idx";
ALTER TABLE "AppProject" DROP COLUMN IF EXISTS "template_id";
