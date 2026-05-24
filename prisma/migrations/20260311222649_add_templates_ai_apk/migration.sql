-- CreateEnum
CREATE TYPE "AiAnalysisStatus" AS ENUM ('NOT_ANALYZED', 'ANALYZING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ApkBuildStatus" AS ENUM ('NOT_BUILT', 'BUILDING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "TemplateCategory" AS ENUM ('BUSINESS', 'CHURCH', 'HEALTH', 'FOOD', 'EDUCATION', 'SERVICES');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AppStatus" ADD VALUE 'QUEUED';
ALTER TYPE "AppStatus" ADD VALUE 'FAILED';

-- AlterTable
ALTER TABLE "AppProject" ADD COLUMN     "ai_analysis_status" "AiAnalysisStatus" NOT NULL DEFAULT 'NOT_ANALYZED',
ADD COLUMN     "ai_suggested_actions" JSONB,
ADD COLUMN     "ai_suggested_colors" JSONB,
ADD COLUMN     "ai_suggested_name" TEXT,
ADD COLUMN     "ai_suggested_navigation" JSONB,
ADD COLUMN     "apk_build_status" "ApkBuildStatus" NOT NULL DEFAULT 'NOT_BUILT',
ADD COLUMN     "apk_build_url" TEXT,
ADD COLUMN     "apk_last_built_at" TIMESTAMP(3),
ADD COLUMN     "failure_reason" TEXT,
ADD COLUMN     "last_generated_at" TIMESTAMP(3),
ADD COLUMN     "last_job_id" TEXT,
ADD COLUMN     "retry_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "template_id" TEXT;

-- CreateTable
CREATE TABLE "AppTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "TemplateCategory" NOT NULL,
    "preview_image" TEXT,
    "config_json" JSONB NOT NULL,
    "is_premium" BOOLEAN NOT NULL DEFAULT false,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AppTemplate_slug_key" ON "AppTemplate"("slug");

-- CreateIndex
CREATE INDEX "AppTemplate_category_idx" ON "AppTemplate"("category");

-- CreateIndex
CREATE INDEX "AppTemplate_is_premium_idx" ON "AppTemplate"("is_premium");

-- CreateIndex
CREATE INDEX "AppTemplate_slug_idx" ON "AppTemplate"("slug");
