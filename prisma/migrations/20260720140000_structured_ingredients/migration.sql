-- CreateTable: personal ingredient library (pick-list, seeds future food DB)
CREATE TABLE "Ingredient" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL DEFAULT '',
    "calories" REAL NOT NULL DEFAULT 0,
    "protein" REAL NOT NULL DEFAULT 0,
    "carbs" REAL NOT NULL DEFAULT 0,
    "fats" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Ingredient_name_unit_key" ON "Ingredient"("name", "unit");

-- Backfill Meal: each existing ingredient string -> named zero-macro row
UPDATE "Meal" SET "ingredients" = (
    SELECT json_group_array(json_object(
        'name', "value", 'quantity', 1, 'unit', '',
        'calories', 0, 'protein', 0, 'carbs', 0, 'fats', 0))
    FROM json_each("Meal"."ingredients"));

-- Backfill Meal: append one (unallocated) row carrying the current totals so sum stays correct
UPDATE "Meal" SET "ingredients" = json_insert("ingredients", '$[#]', json_object(
    'name', '(unallocated)', 'quantity', 1, 'unit', '',
    'calories', "calories", 'protein', "protein", 'carbs', "carbs", 'fats', "fats"));

-- RedefineTables: rebuild WeeklyPlanMeal — add ingredients snapshot, drop portionMultiplier + note
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_WeeklyPlanMeal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "weeklyPlanDayId" INTEGER NOT NULL,
    "mealId" INTEGER NOT NULL,
    "slotIndex" INTEGER NOT NULL,
    "ingredients" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "WeeklyPlanMeal_weeklyPlanDayId_fkey" FOREIGN KEY ("weeklyPlanDayId") REFERENCES "WeeklyPlanDay" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WeeklyPlanMeal_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "Meal" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_WeeklyPlanMeal" ("id", "weeklyPlanDayId", "mealId", "slotIndex", "ingredients")
    SELECT wpm."id", wpm."weeklyPlanDayId", wpm."mealId", wpm."slotIndex",
        json_array(json_object('name', '(whole meal)', 'quantity', 1, 'unit', 'serving',
            'calories', m."calories" * wpm."portionMultiplier",
            'protein',  m."protein"  * wpm."portionMultiplier",
            'carbs',    m."carbs"    * wpm."portionMultiplier",
            'fats',     m."fats"     * wpm."portionMultiplier"))
    FROM "WeeklyPlanMeal" wpm JOIN "Meal" m ON m."id" = wpm."mealId";
DROP TABLE "WeeklyPlanMeal";
ALTER TABLE "new_WeeklyPlanMeal" RENAME TO "WeeklyPlanMeal";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
