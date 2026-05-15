-- Add manual override control for PWA mode
ALTER TABLE "AppProject"
  ADD COLUMN IF NOT EXISTS "pwa_mode_manual" BOOLEAN NOT NULL DEFAULT false;
