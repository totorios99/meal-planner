-- One WeeklyPlan per user per week. GET /api/plans/active creates on read and the home page
-- and planner both fire it on mount, so the two raced and left duplicate rows for the same
-- week. Hand-written rather than generated: `prisma migrate dev` cannot run in this tree (the
-- JS-only migration folders have no migration.sql, so the CLI aborts with P3015).
CREATE UNIQUE INDEX "WeeklyPlan_userId_weekStart_key" ON "WeeklyPlan"("userId", "weekStart");
