-- Marks a Food as a placeholder (e.g. "vegetables", "fruit") instead of a real ingredient.
ALTER TABLE "Food" ADD COLUMN "isPlaceholder" BOOLEAN NOT NULL DEFAULT false;
