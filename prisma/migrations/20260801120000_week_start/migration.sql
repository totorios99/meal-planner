-- Which weekday a plan week starts on: 0 = Sunday, 1 = Monday.
ALTER TABLE "Settings" ADD COLUMN "weekStartsOn" INTEGER NOT NULL DEFAULT 1;
