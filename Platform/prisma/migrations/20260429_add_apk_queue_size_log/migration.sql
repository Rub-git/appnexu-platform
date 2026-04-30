-- Add QUEUED status and APK metadata fields
ALTER TYPE "ApkBuildStatus" ADD VALUE IF NOT EXISTS 'QUEUED';

ALTER TABLE "AppProject" ADD COLUMN IF NOT EXISTS "apk_build_size" INTEGER;
ALTER TABLE "AppProject" ADD COLUMN IF NOT EXISTS "apk_build_log" TEXT;
