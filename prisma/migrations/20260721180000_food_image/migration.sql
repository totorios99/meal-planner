-- Add product photo support to Food, same convention as Meal.imageUrl.
ALTER TABLE "Food" ADD COLUMN "imageUrl" TEXT NOT NULL DEFAULT '';
