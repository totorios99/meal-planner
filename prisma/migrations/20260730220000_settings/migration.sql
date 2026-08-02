-- Singleton preferences row. Not created here: lib/settings.ts upserts it on first read,
-- so a fresh DB and an existing one take the same path.
CREATE TABLE IF NOT EXISTS "Settings" (
    "id" INTEGER NOT NULL PRIMARY KEY DEFAULT 1,
    "calories" REAL NOT NULL DEFAULT 2450,
    "protein" REAL NOT NULL DEFAULT 160,
    "carbs" REAL NOT NULL DEFAULT 270,
    "fats" REAL NOT NULL DEFAULT 80,
    "recipeView" TEXT NOT NULL DEFAULT 'chart',
    "units" TEXT NOT NULL DEFAULT 'US',
    "theme" TEXT NOT NULL DEFAULT 'system',
    "plannerFullTitles" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL
)
