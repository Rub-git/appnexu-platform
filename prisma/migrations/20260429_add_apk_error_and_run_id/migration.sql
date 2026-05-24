-- AlterTable: add apk_error_message and apk_github_run_id to AppProject
ALTER TABLE "AppProject" ADD COLUMN IF NOT EXISTS "apk_error_message" TEXT;
ALTER TABLE "AppProject" ADD COLUMN IF NOT EXISTS "apk_github_run_id" TEXT;
