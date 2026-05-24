-- Dashboard scalability indexes for filter/sort/cursor query patterns
CREATE INDEX "AppProject_userId_status_createdAt_id_idx"
  ON "AppProject"("userId", "status", "createdAt" DESC, "id" DESC);

CREATE INDEX "AppProject_userId_total_visits_id_idx"
  ON "AppProject"("userId", "total_visits" DESC, "id" DESC);

CREATE INDEX "AppProject_userId_total_installs_id_idx"
  ON "AppProject"("userId", "total_installs" DESC, "id" DESC);

CREATE INDEX "AppProject_userId_appName_id_idx"
  ON "AppProject"("userId", "appName", "id");
