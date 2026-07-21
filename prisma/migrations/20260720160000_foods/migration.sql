-- Replace the sparse Ingredient library with the Food source-of-truth table.
DROP TABLE IF EXISTS "Ingredient";

CREATE TABLE "Food" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "baseUnit" TEXT NOT NULL DEFAULT '',
    "calories" REAL NOT NULL DEFAULT 0,
    "protein" REAL NOT NULL DEFAULT 0,
    "carbs" REAL NOT NULL DEFAULT 0,
    "fats" REAL NOT NULL DEFAULT 0,
    "measures" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "Food_name_key" ON "Food"("name");
