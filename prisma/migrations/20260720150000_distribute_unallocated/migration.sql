-- Replace the synthetic "(unallocated)"/"(whole meal)" macro lump with an even split
-- across the real named ingredients. Meal totals are unchanged (sum stays equal). Rows
-- that have NO named ingredients (only a synthetic row) are left as-is.

-- Meals
UPDATE "Meal" SET "ingredients" = (
  WITH items AS (SELECT value AS v FROM json_each("Meal"."ingredients")),
       nc AS (SELECT COUNT(*) c FROM items WHERE json_extract(v,'$.name') NOT LIKE '(%'),
       lump AS (SELECT
         COALESCE(SUM(json_extract(v,'$.calories')),0) cal,
         COALESCE(SUM(json_extract(v,'$.protein')),0) pro,
         COALESCE(SUM(json_extract(v,'$.carbs')),0) car,
         COALESCE(SUM(json_extract(v,'$.fats')),0) fat
         FROM items WHERE json_extract(v,'$.name') LIKE '(%')
  SELECT CASE WHEN (SELECT c FROM nc) > 0 THEN (
    SELECT json_group_array(json_object(
      'name', json_extract(v,'$.name'),
      'quantity', json_extract(v,'$.quantity'),
      'unit', json_extract(v,'$.unit'),
      'calories', json_extract(v,'$.calories') + (SELECT cal FROM lump) / (SELECT c FROM nc),
      'protein',  json_extract(v,'$.protein')  + (SELECT pro FROM lump) / (SELECT c FROM nc),
      'carbs',    json_extract(v,'$.carbs')    + (SELECT car FROM lump) / (SELECT c FROM nc),
      'fats',     json_extract(v,'$.fats')     + (SELECT fat FROM lump) / (SELECT c FROM nc)))
    FROM items WHERE json_extract(v,'$.name') NOT LIKE '(%')
  ELSE "Meal"."ingredients" END
);

-- Placement snapshots (same transform)
UPDATE "WeeklyPlanMeal" SET "ingredients" = (
  WITH items AS (SELECT value AS v FROM json_each("WeeklyPlanMeal"."ingredients")),
       nc AS (SELECT COUNT(*) c FROM items WHERE json_extract(v,'$.name') NOT LIKE '(%'),
       lump AS (SELECT
         COALESCE(SUM(json_extract(v,'$.calories')),0) cal,
         COALESCE(SUM(json_extract(v,'$.protein')),0) pro,
         COALESCE(SUM(json_extract(v,'$.carbs')),0) car,
         COALESCE(SUM(json_extract(v,'$.fats')),0) fat
         FROM items WHERE json_extract(v,'$.name') LIKE '(%')
  SELECT CASE WHEN (SELECT c FROM nc) > 0 THEN (
    SELECT json_group_array(json_object(
      'name', json_extract(v,'$.name'),
      'quantity', json_extract(v,'$.quantity'),
      'unit', json_extract(v,'$.unit'),
      'calories', json_extract(v,'$.calories') + (SELECT cal FROM lump) / (SELECT c FROM nc),
      'protein',  json_extract(v,'$.protein')  + (SELECT pro FROM lump) / (SELECT c FROM nc),
      'carbs',    json_extract(v,'$.carbs')    + (SELECT car FROM lump) / (SELECT c FROM nc),
      'fats',     json_extract(v,'$.fats')     + (SELECT fat FROM lump) / (SELECT c FROM nc)))
    FROM items WHERE json_extract(v,'$.name') NOT LIKE '(%')
  ELSE "WeeklyPlanMeal"."ingredients" END
);
