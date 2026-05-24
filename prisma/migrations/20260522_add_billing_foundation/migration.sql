-- Billing foundation models for SaaS architecture (no auto-charge activation yet)

CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'YEARLY');
CREATE TYPE "BillingSubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'INCOMPLETE');

CREATE TABLE "BillingPlan" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "display_name" TEXT NOT NULL,
  "stripe_price_id" TEXT,
  "cycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
  "app_limit" INTEGER,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BillingPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingPlanLimit" (
  "id" TEXT NOT NULL,
  "plan_id" TEXT NOT NULL,
  "metric_key" TEXT NOT NULL,
  "soft_limit" INTEGER,
  "hard_limit" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BillingPlanLimit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingSubscription" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "plan_id" TEXT NOT NULL,
  "status" "BillingSubscriptionStatus" NOT NULL DEFAULT 'INCOMPLETE',
  "stripe_subscription_id" TEXT,
  "stripe_customer_id" TEXT,
  "current_period_start" TIMESTAMP(3),
  "current_period_end" TIMESTAMP(3),
  "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
  "canceled_at" TIMESTAMP(3),
  "trial_ends_at" TIMESTAMP(3),
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BillingSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingUsage" (
  "id" TEXT NOT NULL,
  "subscription_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "app_id" TEXT,
  "metric_key" TEXT NOT NULL,
  "value" INTEGER NOT NULL DEFAULT 0,
  "period_start" TIMESTAMP(3) NOT NULL,
  "period_end" TIMESTAMP(3) NOT NULL,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BillingUsage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BillingPlan_key_key" ON "BillingPlan"("key");
CREATE UNIQUE INDEX "BillingPlan_stripe_price_id_key" ON "BillingPlan"("stripe_price_id");
CREATE INDEX "BillingPlan_is_active_idx" ON "BillingPlan"("is_active");
CREATE INDEX "BillingPlan_sort_order_idx" ON "BillingPlan"("sort_order");

CREATE UNIQUE INDEX "BillingPlanLimit_plan_id_metric_key_key" ON "BillingPlanLimit"("plan_id", "metric_key");
CREATE INDEX "BillingPlanLimit_metric_key_idx" ON "BillingPlanLimit"("metric_key");

CREATE UNIQUE INDEX "BillingSubscription_stripe_subscription_id_key" ON "BillingSubscription"("stripe_subscription_id");
CREATE INDEX "BillingSubscription_user_id_idx" ON "BillingSubscription"("user_id");
CREATE INDEX "BillingSubscription_plan_id_idx" ON "BillingSubscription"("plan_id");
CREATE INDEX "BillingSubscription_status_idx" ON "BillingSubscription"("status");

CREATE INDEX "BillingUsage_subscription_id_idx" ON "BillingUsage"("subscription_id");
CREATE INDEX "BillingUsage_user_id_idx" ON "BillingUsage"("user_id");
CREATE INDEX "BillingUsage_metric_key_idx" ON "BillingUsage"("metric_key");
CREATE INDEX "BillingUsage_period_start_period_end_idx" ON "BillingUsage"("period_start", "period_end");

ALTER TABLE "BillingPlanLimit"
  ADD CONSTRAINT "BillingPlanLimit_plan_id_fkey"
  FOREIGN KEY ("plan_id") REFERENCES "BillingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BillingSubscription"
  ADD CONSTRAINT "BillingSubscription_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BillingSubscription"
  ADD CONSTRAINT "BillingSubscription_plan_id_fkey"
  FOREIGN KEY ("plan_id") REFERENCES "BillingPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "BillingUsage"
  ADD CONSTRAINT "BillingUsage_subscription_id_fkey"
  FOREIGN KEY ("subscription_id") REFERENCES "BillingSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BillingUsage"
  ADD CONSTRAINT "BillingUsage_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BillingUsage"
  ADD CONSTRAINT "BillingUsage_app_id_fkey"
  FOREIGN KEY ("app_id") REFERENCES "AppProject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
