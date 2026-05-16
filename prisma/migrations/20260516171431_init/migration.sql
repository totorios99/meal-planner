-- CreateTable
CREATE TABLE "Meal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "calories" REAL NOT NULL,
    "protein" REAL NOT NULL,
    "carbs" REAL NOT NULL,
    "fats" REAL NOT NULL,
    "imageUrl" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "WeeklyPlan" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "weekStart" DATETIME NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "WeeklyPlanDay" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "weeklyPlanId" INTEGER NOT NULL,
    "dayIndex" INTEGER NOT NULL,
    "isDismissed" BOOLEAN NOT NULL DEFAULT false,
    "justification" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "WeeklyPlanDay_weeklyPlanId_fkey" FOREIGN KEY ("weeklyPlanId") REFERENCES "WeeklyPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WeeklyPlanMeal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "weeklyPlanDayId" INTEGER NOT NULL,
    "mealId" INTEGER NOT NULL,
    "slotIndex" INTEGER NOT NULL,
    "portionMultiplier" REAL NOT NULL DEFAULT 1.0,
    CONSTRAINT "WeeklyPlanMeal_weeklyPlanDayId_fkey" FOREIGN KEY ("weeklyPlanDayId") REFERENCES "WeeklyPlanDay" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WeeklyPlanMeal_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "Meal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyPlanDay_weeklyPlanId_dayIndex_key" ON "WeeklyPlanDay"("weeklyPlanId", "dayIndex");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyPlanMeal_weeklyPlanDayId_slotIndex_key" ON "WeeklyPlanMeal"("weeklyPlanDayId", "slotIndex");
