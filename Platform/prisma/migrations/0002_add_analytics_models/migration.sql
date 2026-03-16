-- CreateEnum
CREATE TYPE "AnalyticsEventType" AS ENUM ('PAGE_VIEW', 'INSTALL_CLICK', 'PUBLISHED', 'UNIQUE_VISIT');

-- AlterTable: Add analytics counters to AppProject
ALTER TABLE "AppProject" ADD COLUMN "total_visits" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AppProject" ADD COLUMN "unique_visitors" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AppProject" ADD COLUMN "total_installs" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "AppProject" ADD COLUMN "last_visited_at" TIMESTAMP(3);
ALTER TABLE "AppProject" ADD COLUMN "last_published_at" TIMESTAMP(3);

-- CreateTable: AppAnalyticsEvent
CREATE TABLE "AppAnalyticsEvent" (
    "id" TEXT NOT NULL,
    "app_id" TEXT NOT NULL,
    "event_type" "AnalyticsEventType" NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppAnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable: AppAnalyticsSummary
CREATE TABLE "AppAnalyticsSummary" (
    "id" TEXT NOT NULL,
    "app_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "page_views" INTEGER NOT NULL DEFAULT 0,
    "unique_visitors" INTEGER NOT NULL DEFAULT 0,
    "install_clicks" INTEGER NOT NULL DEFAULT 0,
    "publish_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppAnalyticsSummary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppAnalyticsEvent_app_id_idx" ON "AppAnalyticsEvent"("app_id");
CREATE INDEX "AppAnalyticsEvent_app_id_timestamp_idx" ON "AppAnalyticsEvent"("app_id", "timestamp");
CREATE INDEX "AppAnalyticsEvent_event_type_idx" ON "AppAnalyticsEvent"("event_type");

-- CreateIndex
CREATE INDEX "AppAnalyticsSummary_app_id_idx" ON "AppAnalyticsSummary"("app_id");
CREATE INDEX "AppAnalyticsSummary_app_id_date_idx" ON "AppAnalyticsSummary"("app_id", "date");
CREATE UNIQUE INDEX "AppAnalyticsSummary_app_id_date_key" ON "AppAnalyticsSummary"("app_id", "date");

-- AddForeignKey
ALTER TABLE "AppAnalyticsEvent" ADD CONSTRAINT "AppAnalyticsEvent_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "AppProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppAnalyticsSummary" ADD CONSTRAINT "AppAnalyticsSummary_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "AppProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
