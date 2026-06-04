-- Enable and force RLS on billing and Prisma migration metadata tables.
ALTER TABLE public."BillingUsage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."BillingSubscription" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."BillingPlan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."BillingPlanLimit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."_prisma_migrations" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."BillingUsage" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."BillingSubscription" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."BillingPlan" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."BillingPlanLimit" FORCE ROW LEVEL SECURITY;
ALTER TABLE public."_prisma_migrations" FORCE ROW LEVEL SECURITY;
