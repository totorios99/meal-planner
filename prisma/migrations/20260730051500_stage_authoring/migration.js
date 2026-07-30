/**
 * Authored cook-mode stages for the cookbook as it shipped.
 *
 * 20260729161500_meal_stages backfilled one stage per step and 20260729183000_stage_detail split
 * their labels mechanically, which produced honest but weak labels ("In a small bowl") and left
 * every recipe reading as a strictly sequential ladder. This replaces that machine output with
 * stages read off each recipe's own steps: a short label, the step text kept verbatim as the
 * instruction, the durations the steps actually state, the ingredient rows each stage consumes,
 * and shared slots wherever the recipe genuinely runs two things at once (a braise while the
 * salsa chars, the air fryer while the onions pickle, rice while the chicken sears).
 *
 * Keyed by title, not id, because the dev and production databases number meals differently.
 *
 * Re-run safety, and safety against your own edits: a meal is only rewritten while its stages are
 * still untouched machine output — one stage per step, slot === index, no parallelism, no timers.
 * Hand-edit any recipe in the meal editor and this leaves it alone from then on.
 */
const AUTHORED = {
  "Oatmeal Pancakes": [
    {
      "name": "Blend the batter",
      "timing": "",
      "seconds": 0,
      "slot": 0,
      "from": 0,
      "to": 4,
      "step": 0
    },
    {
      "name": "Shape the pancakes",
      "timing": "",
      "seconds": 0,
      "slot": 1,
      "from": 0,
      "to": -1,
      "step": 1
    },
    {
      "name": "Cook until golden",
      "timing": "",
      "seconds": 0,
      "slot": 2,
      "from": 0,
      "to": -1,
      "step": 2
    },
    {
      "name": "Top and serve",
      "timing": "",
      "seconds": 0,
      "slot": 3,
      "from": 5,
      "to": 6,
      "step": 3
    }
  ],
  "Banana Pudding Pie Ice Cream (Ninja Creami)": [
    {
      "name": "Layer the banana slices",
      "timing": "",
      "seconds": 0,
      "slot": 0,
      "from": 0,
      "to": 0,
      "step": 0
    },
    {
      "name": "Blend and fill the pint",
      "timing": "",
      "seconds": 0,
      "slot": 1,
      "from": 0,
      "to": 3,
      "step": 1
    },
    {
      "name": "Freeze until solid",
      "timing": "24 h",
      "seconds": 0,
      "slot": 2,
      "from": 0,
      "to": -1,
      "step": 2
    },
    {
      "name": "Spin on Ice Cream",
      "timing": "",
      "seconds": 0,
      "slot": 3,
      "from": 0,
      "to": -1,
      "step": 3
    },
    {
      "name": "Push in the Biscoff, mix-in",
      "timing": "",
      "seconds": 0,
      "slot": 4,
      "from": 4,
      "to": 4,
      "step": 4
    },
    {
      "name": "Top with crushed Biscoff",
      "timing": "",
      "seconds": 0,
      "slot": 5,
      "from": 0,
      "to": -1,
      "step": 5
    }
  ],
  "Gorditas con Chicharrón en Salsa Verde": [
    {
      "name": "Braise the pork belly",
      "timing": "1 h",
      "seconds": 3600,
      "slot": 0,
      "from": 0,
      "to": 5,
      "step": 0
    },
    {
      "name": "Char the salsa vegetables",
      "timing": "5 min a side",
      "seconds": 600,
      "slot": 0,
      "from": 6,
      "to": 7,
      "meanwhile": true,
      "step": 3
    },
    {
      "name": "Blend the salsa verde",
      "timing": "",
      "seconds": 0,
      "slot": 1,
      "from": 8,
      "to": 10,
      "step": 4
    },
    {
      "name": "Pat the pork belly dry",
      "timing": "",
      "seconds": 0,
      "slot": 2,
      "from": 0,
      "to": -1,
      "step": 1
    },
    {
      "name": "Fry the pork belly",
      "timing": "7 min",
      "seconds": 420,
      "slot": 3,
      "from": 13,
      "to": 13,
      "step": 2
    },
    {
      "name": "Simmer the salsa verde",
      "timing": "5 min",
      "seconds": 300,
      "slot": 4,
      "from": 11,
      "to": 11,
      "step": 5
    },
    {
      "name": "Chop and coat the chicharrón",
      "timing": "",
      "seconds": 0,
      "slot": 5,
      "from": 0,
      "to": -1,
      "step": 6
    },
    {
      "name": "Knead and rest the masa",
      "timing": "5 min",
      "seconds": 300,
      "slot": 6,
      "from": 12,
      "to": 12,
      "step": 7
    },
    {
      "name": "Press the discs",
      "timing": "",
      "seconds": 0,
      "slot": 7,
      "from": 0,
      "to": -1,
      "step": 8
    },
    {
      "name": "Griddle the discs",
      "timing": "3 min a side",
      "seconds": 360,
      "slot": 8,
      "from": 0,
      "to": -1,
      "step": 9
    },
    {
      "name": "Fry the gorditas",
      "timing": "1 min a side",
      "seconds": 120,
      "slot": 9,
      "from": 13,
      "to": 13,
      "step": 10
    },
    {
      "name": "Stuff and top",
      "timing": "",
      "seconds": 0,
      "slot": 10,
      "from": 14,
      "to": 17,
      "step": 11
    }
  ],
  "Chocolate Brownie Ice Cream (Ninja Creami)": [
    {
      "name": "Mix the dry ingredients",
      "timing": "",
      "seconds": 0,
      "slot": 0,
      "from": 1,
      "to": 4,
      "step": 0
    },
    {
      "name": "Whisk into the milk",
      "timing": "",
      "seconds": 0,
      "slot": 1,
      "from": 0,
      "to": 5,
      "step": 1
    },
    {
      "name": "Freeze the pint",
      "timing": "24 h",
      "seconds": 0,
      "slot": 2,
      "from": 0,
      "to": -1,
      "step": 2
    },
    {
      "name": "Warm the sides, then spin",
      "timing": "",
      "seconds": 0,
      "slot": 3,
      "from": 0,
      "to": -1,
      "step": 3
    },
    {
      "name": "Re-spin until creamy",
      "timing": "",
      "seconds": 0,
      "slot": 4,
      "from": 0,
      "to": -1,
      "step": 4
    },
    {
      "name": "Chop the brownie, mix-in",
      "timing": "",
      "seconds": 0,
      "slot": 5,
      "from": 6,
      "to": 6,
      "step": 5
    }
  ],
  "Chicken Breast in Creamy Garlic Sauce": [
    {
      "name": "Sauté the garlic",
      "timing": "",
      "seconds": 0,
      "slot": 0,
      "from": 0,
      "to": 1,
      "step": 0
    },
    {
      "name": "Brown the chicken",
      "timing": "",
      "seconds": 0,
      "slot": 1,
      "from": 2,
      "to": 2,
      "step": 1
    },
    {
      "name": "Season the chicken",
      "timing": "",
      "seconds": 0,
      "slot": 2,
      "from": 3,
      "to": 4,
      "step": 2
    },
    {
      "name": "Deglaze with white wine",
      "timing": "",
      "seconds": 0,
      "slot": 3,
      "from": 5,
      "to": 5,
      "step": 3
    },
    {
      "name": "Cover and simmer",
      "timing": "10 min",
      "seconds": 600,
      "slot": 4,
      "from": 6,
      "to": 6,
      "step": 4
    },
    {
      "name": "Stir in the cream",
      "timing": "3–4 min",
      "seconds": 210,
      "slot": 5,
      "from": 7,
      "to": 7,
      "step": 5
    },
    {
      "name": "Season and serve",
      "timing": "",
      "seconds": 0,
      "slot": 6,
      "from": 0,
      "to": -1,
      "step": 6
    }
  ],
  "Orange Zest Tonic Cold Brew": [
    {
      "name": "Fill the glass with ice",
      "timing": "",
      "seconds": 0,
      "slot": 0,
      "from": 0,
      "to": -1,
      "step": 0
    },
    {
      "name": "Add the orange syrup",
      "timing": "",
      "seconds": 0,
      "slot": 1,
      "from": 0,
      "to": 0,
      "step": 1
    },
    {
      "name": "Tonic, then float the cold brew",
      "timing": "",
      "seconds": 0,
      "slot": 2,
      "from": 1,
      "to": 2,
      "step": 2
    },
    {
      "name": "Garnish and serve",
      "timing": "",
      "seconds": 0,
      "slot": 3,
      "from": 3,
      "to": 3,
      "step": 3
    }
  ],
  "Mocha Cold Brew Cold Foam": [
    {
      "name": "Ice and chocolate sauce",
      "timing": "",
      "seconds": 0,
      "slot": 0,
      "from": 0,
      "to": 0,
      "step": 0
    },
    {
      "name": "Pour in the cold brew",
      "timing": "",
      "seconds": 0,
      "slot": 1,
      "from": 1,
      "to": 1,
      "step": 1
    },
    {
      "name": "Whip the chocolate cold foam",
      "timing": "",
      "seconds": 0,
      "slot": 2,
      "from": 2,
      "to": 3,
      "step": 2
    },
    {
      "name": "Spoon on the foam",
      "timing": "",
      "seconds": 0,
      "slot": 3,
      "from": 0,
      "to": -1,
      "step": 3
    },
    {
      "name": "Dust with cacao",
      "timing": "",
      "seconds": 0,
      "slot": 4,
      "from": 4,
      "to": 4,
      "step": 4
    }
  ],
  "Vanilla Rose Cold Brew with Vanilla Cold Foam": [
    {
      "name": "Ice, vanilla and rose water",
      "timing": "",
      "seconds": 0,
      "slot": 0,
      "from": 0,
      "to": 1,
      "step": 0
    },
    {
      "name": "Pour in the cold brew",
      "timing": "",
      "seconds": 0,
      "slot": 1,
      "from": 2,
      "to": 2,
      "step": 1
    },
    {
      "name": "Whip the vanilla cold foam",
      "timing": "",
      "seconds": 0,
      "slot": 2,
      "from": 3,
      "to": 4,
      "step": 2
    },
    {
      "name": "Spoon on the foam",
      "timing": "",
      "seconds": 0,
      "slot": 3,
      "from": 0,
      "to": -1,
      "step": 3
    },
    {
      "name": "Garnish with dried roses",
      "timing": "",
      "seconds": 0,
      "slot": 4,
      "from": 0,
      "to": -1,
      "step": 4
    }
  ],
  "Pistachio Cold Brew Cold Foam": [
    {
      "name": "Ice and pistachio syrup",
      "timing": "",
      "seconds": 0,
      "slot": 0,
      "from": 0,
      "to": 0,
      "step": 0
    },
    {
      "name": "Pour in the cold brew",
      "timing": "",
      "seconds": 0,
      "slot": 1,
      "from": 1,
      "to": 1,
      "step": 1
    },
    {
      "name": "Whip the pistachio cold foam",
      "timing": "",
      "seconds": 0,
      "slot": 2,
      "from": 2,
      "to": 2,
      "step": 2
    },
    {
      "name": "Spoon on the foam",
      "timing": "",
      "seconds": 0,
      "slot": 3,
      "from": 0,
      "to": -1,
      "step": 3
    },
    {
      "name": "Garnish with crushed pistachio",
      "timing": "",
      "seconds": 0,
      "slot": 4,
      "from": 3,
      "to": 3,
      "step": 4
    }
  ],
  "Honey Lemonade Cold Brew": [
    {
      "name": "Stir honey into the ice",
      "timing": "",
      "seconds": 0,
      "slot": 0,
      "from": 0,
      "to": 0,
      "step": 0
    },
    {
      "name": "Pour in the lemonade",
      "timing": "",
      "seconds": 0,
      "slot": 1,
      "from": 1,
      "to": 1,
      "step": 1
    },
    {
      "name": "Float the cold brew",
      "timing": "",
      "seconds": 0,
      "slot": 2,
      "from": 2,
      "to": 2,
      "step": 2
    },
    {
      "name": "Garnish and serve",
      "timing": "",
      "seconds": 0,
      "slot": 3,
      "from": 3,
      "to": 3,
      "step": 3
    }
  ],
  "Mango Greek Yogurt Ice Cream (Ninja Creami)": [
    {
      "name": "Blend the base",
      "timing": "",
      "seconds": 0,
      "slot": 0,
      "from": 0,
      "to": 3,
      "step": 0
    },
    {
      "name": "Fill the pint and freeze",
      "timing": "24 h",
      "seconds": 0,
      "slot": 1,
      "from": 0,
      "to": -1,
      "step": 1
    },
    {
      "name": "Spin on Ice Cream",
      "timing": "",
      "seconds": 0,
      "slot": 2,
      "from": 0,
      "to": -1,
      "step": 2
    },
    {
      "name": "Re-spin if powdery",
      "timing": "",
      "seconds": 0,
      "slot": 3,
      "from": 0,
      "to": -1,
      "step": 3
    }
  ],
  "Crispy Chicken with Avocado Herb Sauce and Potato Wedges": [
    {
      "name": "Make the avocado herb sauce",
      "timing": "",
      "seconds": 0,
      "slot": 0,
      "from": 2,
      "to": 8,
      "step": 0
    },
    {
      "name": "Spread the sauce on the plate",
      "timing": "",
      "seconds": 0,
      "slot": 1,
      "from": 0,
      "to": -1,
      "step": 1
    },
    {
      "name": "Fry the breaded chicken",
      "timing": "",
      "seconds": 0,
      "slot": 2,
      "from": 0,
      "to": 0,
      "step": 2
    },
    {
      "name": "Roast the potato wedges",
      "timing": "",
      "seconds": 0,
      "slot": 2,
      "from": 1,
      "to": 1,
      "meanwhile": true,
      "step": 3
    },
    {
      "name": "Fry the garlic chips",
      "timing": "",
      "seconds": 0,
      "slot": 3,
      "from": 11,
      "to": 12,
      "step": 4
    },
    {
      "name": "Build the plate",
      "timing": "",
      "seconds": 0,
      "slot": 4,
      "from": 9,
      "to": 9,
      "step": 5
    },
    {
      "name": "Brown butter and parmesan",
      "timing": "",
      "seconds": 0,
      "slot": 5,
      "from": 10,
      "to": 10,
      "step": 6
    }
  ],
  "Honey Halloumi on Crispy Chickpeas": [
    {
      "name": "Air fry the chickpeas",
      "timing": "20 min",
      "seconds": 1200,
      "slot": 0,
      "from": 6,
      "to": 9,
      "step": 1
    },
    {
      "name": "Pickle the red onion",
      "timing": "15 min",
      "seconds": 900,
      "slot": 0,
      "from": 14,
      "to": 17,
      "meanwhile": true,
      "step": 2
    },
    {
      "name": "Boil the jammy egg",
      "timing": "6:30",
      "seconds": 390,
      "slot": 0,
      "from": 13,
      "to": 13,
      "meanwhile": true,
      "step": 3
    },
    {
      "name": "Mix the herby yoghurt",
      "timing": "",
      "seconds": 0,
      "slot": 0,
      "from": 0,
      "to": 5,
      "meanwhile": true,
      "step": 0
    },
    {
      "name": "Fry the honey halloumi",
      "timing": "2 min a side",
      "seconds": 240,
      "slot": 1,
      "from": 10,
      "to": 12,
      "step": 4
    },
    {
      "name": "Assemble over the yoghurt",
      "timing": "",
      "seconds": 0,
      "slot": 2,
      "from": 0,
      "to": -1,
      "step": 5
    }
  ],
  "Oreo McFlurry Protein Ice Cream (Ninja Creami)": [
    {
      "name": "Blend the base",
      "timing": "",
      "seconds": 0,
      "slot": 0,
      "from": 0,
      "to": 4,
      "step": 0
    },
    {
      "name": "Freeze the pint",
      "timing": "16 h+",
      "seconds": 0,
      "slot": 1,
      "from": 0,
      "to": -1,
      "step": 1
    },
    {
      "name": "Hot-water rinse the pint",
      "timing": "60 sec",
      "seconds": 60,
      "slot": 2,
      "from": 0,
      "to": -1,
      "step": 2
    },
    {
      "name": "Spin on Lite Ice Cream",
      "timing": "",
      "seconds": 0,
      "slot": 3,
      "from": 0,
      "to": -1,
      "step": 3
    },
    {
      "name": "Re-spin if powdery",
      "timing": "",
      "seconds": 0,
      "slot": 4,
      "from": 0,
      "to": -1,
      "step": 4
    },
    {
      "name": "Fill the hole with Oreos",
      "timing": "",
      "seconds": 0,
      "slot": 5,
      "from": 5,
      "to": 5,
      "step": 5
    },
    {
      "name": "Run the Mix-in cycle",
      "timing": "",
      "seconds": 0,
      "slot": 6,
      "from": 0,
      "to": -1,
      "step": 6
    }
  ],
  "Creamy Shrimp Fettuccine with Broccoli": [
    {
      "name": "Marinate the shrimp",
      "timing": "30 min",
      "seconds": 1800,
      "slot": 0,
      "from": 0,
      "to": 2,
      "step": 0
    },
    {
      "name": "Sear the shrimp",
      "timing": "",
      "seconds": 0,
      "slot": 1,
      "from": 3,
      "to": 3,
      "step": 1
    },
    {
      "name": "Boil the fettuccine",
      "timing": "8–10 min",
      "seconds": 540,
      "slot": 2,
      "from": 5,
      "to": 5,
      "step": 3
    },
    {
      "name": "Blanch the broccoli",
      "timing": "",
      "seconds": 0,
      "slot": 2,
      "from": 4,
      "to": 4,
      "meanwhile": true,
      "step": 2
    },
    {
      "name": "Sauté onion and garlic",
      "timing": "2 min",
      "seconds": 120,
      "slot": 3,
      "from": 6,
      "to": 8,
      "step": 4
    },
    {
      "name": "Stir in the cream",
      "timing": "",
      "seconds": 0,
      "slot": 4,
      "from": 9,
      "to": 9,
      "step": 5
    },
    {
      "name": "Toss the pasta through",
      "timing": "",
      "seconds": 0,
      "slot": 5,
      "from": 0,
      "to": -1,
      "step": 6
    },
    {
      "name": "Melt in the mozzarella",
      "timing": "",
      "seconds": 0,
      "slot": 6,
      "from": 10,
      "to": 10,
      "step": 7
    },
    {
      "name": "Fold in shrimp and broccoli",
      "timing": "",
      "seconds": 0,
      "slot": 7,
      "from": 0,
      "to": -1,
      "step": 8
    },
    {
      "name": "Plate with Parmesan",
      "timing": "",
      "seconds": 0,
      "slot": 8,
      "from": 11,
      "to": 11,
      "step": 9
    }
  ],
  "Salsa Macha (Morita Chile Oil Salsa)": [
    {
      "name": "Heat the oil gently",
      "timing": "",
      "seconds": 0,
      "slot": 0,
      "from": 0,
      "to": 0,
      "step": 0
    },
    {
      "name": "Fry the garlic",
      "timing": "",
      "seconds": 0,
      "slot": 1,
      "from": 1,
      "to": 1,
      "step": 1
    },
    {
      "name": "Fry the morita chiles",
      "timing": "",
      "seconds": 0,
      "slot": 2,
      "from": 2,
      "to": 2,
      "step": 2
    },
    {
      "name": "Guajillo and árbol, then cool",
      "timing": "",
      "seconds": 0,
      "slot": 3,
      "from": 3,
      "to": 3,
      "step": 3
    },
    {
      "name": "Toast the peanuts and sesame",
      "timing": "",
      "seconds": 0,
      "slot": 3,
      "from": 4,
      "to": 5,
      "meanwhile": true,
      "step": 4
    },
    {
      "name": "Pulse the chiles with salt",
      "timing": "",
      "seconds": 0,
      "slot": 4,
      "from": 6,
      "to": 6,
      "step": 5
    },
    {
      "name": "Blend in the cooled oil",
      "timing": "",
      "seconds": 0,
      "slot": 5,
      "from": 0,
      "to": -1,
      "step": 6
    },
    {
      "name": "Stir in peanuts and sesame",
      "timing": "",
      "seconds": 0,
      "slot": 6,
      "from": 0,
      "to": -1,
      "step": 7
    }
  ],
  "Maple Cinnamon Nut Granola": [
    {
      "name": "Preheat the oven",
      "timing": "350°F",
      "seconds": 0,
      "slot": 0,
      "from": 0,
      "to": -1,
      "step": 0
    },
    {
      "name": "Combine the oats and nuts",
      "timing": "",
      "seconds": 0,
      "slot": 1,
      "from": 0,
      "to": 4,
      "step": 1
    },
    {
      "name": "Coconut oil and maple syrup",
      "timing": "",
      "seconds": 0,
      "slot": 2,
      "from": 5,
      "to": 6,
      "step": 2
    },
    {
      "name": "Cinnamon and salt",
      "timing": "",
      "seconds": 0,
      "slot": 3,
      "from": 7,
      "to": 8,
      "step": 3
    },
    {
      "name": "Spread on two trays",
      "timing": "",
      "seconds": 0,
      "slot": 4,
      "from": 0,
      "to": -1,
      "step": 4
    },
    {
      "name": "Bake until golden",
      "timing": "20–25 min",
      "seconds": 1350,
      "slot": 5,
      "from": 0,
      "to": -1,
      "step": 5
    },
    {
      "name": "Cool completely",
      "timing": "",
      "seconds": 0,
      "slot": 6,
      "from": 0,
      "to": -1,
      "step": 6
    }
  ],
  "Scrambled Eggs with Vegetables": [
    {
      "name": "Beat the eggs",
      "timing": "",
      "seconds": 0,
      "slot": 0,
      "from": 0,
      "to": 0,
      "step": 0
    },
    {
      "name": "Sauté the vegetables",
      "timing": "",
      "seconds": 0,
      "slot": 1,
      "from": 1,
      "to": 2,
      "step": 1
    },
    {
      "name": "Scramble in the eggs",
      "timing": "",
      "seconds": 0,
      "slot": 2,
      "from": 0,
      "to": -1,
      "step": 2
    },
    {
      "name": "Serve with tortillas and avocado",
      "timing": "",
      "seconds": 0,
      "slot": 3,
      "from": 4,
      "to": 5,
      "step": 3
    }
  ],
  "Arrachera Tacos": [
    {
      "name": "Toss the nopal salad",
      "timing": "",
      "seconds": 0,
      "slot": 0,
      "from": 5,
      "to": 8,
      "step": 0
    },
    {
      "name": "Fry the arrachera",
      "timing": "",
      "seconds": 0,
      "slot": 1,
      "from": 0,
      "to": 1,
      "step": 1
    },
    {
      "name": "Chop the steak",
      "timing": "",
      "seconds": 0,
      "slot": 2,
      "from": 0,
      "to": -1,
      "step": 2
    },
    {
      "name": "Warm the tortillas",
      "timing": "",
      "seconds": 0,
      "slot": 2,
      "from": 2,
      "to": 2,
      "meanwhile": true,
      "step": 3
    },
    {
      "name": "Fill and serve",
      "timing": "",
      "seconds": 0,
      "slot": 3,
      "from": 3,
      "to": 4,
      "step": 4
    }
  ],
  "Bacon Mozzarella Taco Potato Skillet": [
    {
      "name": "Brown the ground beef",
      "timing": "",
      "seconds": 0,
      "slot": 0,
      "from": 7,
      "to": 7,
      "step": 1
    },
    {
      "name": "Air fry the potatoes",
      "timing": "15–20 min",
      "seconds": 1050,
      "slot": 0,
      "from": 0,
      "to": 6,
      "meanwhile": true,
      "step": 0
    },
    {
      "name": "Soften the peppers and onion",
      "timing": "",
      "seconds": 0,
      "slot": 1,
      "from": 8,
      "to": 10,
      "step": 2
    },
    {
      "name": "Fold in the crispy potatoes",
      "timing": "",
      "seconds": 0,
      "slot": 2,
      "from": 0,
      "to": -1,
      "step": 3
    },
    {
      "name": "Top with bacon and mozzarella",
      "timing": "",
      "seconds": 0,
      "slot": 3,
      "from": 11,
      "to": 12,
      "step": 4
    },
    {
      "name": "Bake until the cheese melts",
      "timing": "15 min",
      "seconds": 900,
      "slot": 4,
      "from": 0,
      "to": -1,
      "step": 5
    },
    {
      "name": "Queso and parsley to finish",
      "timing": "",
      "seconds": 0,
      "slot": 5,
      "from": 13,
      "to": 14,
      "step": 6
    }
  ],
  "Pan-Seared Chicken Breast with Jasmine Rice": [
    {
      "name": "Butterfly and pound the chicken",
      "timing": "",
      "seconds": 0,
      "slot": 0,
      "from": 0,
      "to": 0,
      "step": 0
    },
    {
      "name": "Season both sides",
      "timing": "",
      "seconds": 0,
      "slot": 1,
      "from": 1,
      "to": 4,
      "step": 1
    },
    {
      "name": "Sear the first side",
      "timing": "4 min",
      "seconds": 240,
      "slot": 2,
      "from": 0,
      "to": -1,
      "step": 2
    },
    {
      "name": "Cook the rice and vegetables",
      "timing": "",
      "seconds": 0,
      "slot": 2,
      "from": 6,
      "to": 7,
      "meanwhile": true,
      "step": 5
    },
    {
      "name": "Flip, butter and baste",
      "timing": "",
      "seconds": 0,
      "slot": 3,
      "from": 5,
      "to": 5,
      "step": 3
    },
    {
      "name": "Pull at 155°F",
      "timing": "",
      "seconds": 0,
      "slot": 4,
      "from": 0,
      "to": -1,
      "step": 4
    },
    {
      "name": "Slice and serve over the rice",
      "timing": "",
      "seconds": 0,
      "slot": 5,
      "from": 0,
      "to": -1,
      "step": 6
    }
  ]
}

function isMachineLadder(stages, stepCount) {
  if (!Array.isArray(stages) || stages.length !== stepCount) return false
  return stages.every((s, i) => s && s.slot === i && !s.meanwhile && !s.seconds && !s.timing && !(s.to >= s.from))
}

module.exports = async (db) => {
  const { rows: meals } = await db.execute('SELECT id, title, steps, stages, ingredients FROM "Meal"')
  let written = 0, skipped = 0, absent = 0

  for (const m of meals) {
    const authored = AUTHORED[m.title]
    if (!authored) { absent++; continue }

    let steps, stages, ingredients
    try {
      steps = JSON.parse(m.steps)
      stages = JSON.parse(m.stages)
      ingredients = JSON.parse(m.ingredients)
    } catch { skipped++; continue }

    if (!isMachineLadder(stages, steps.length)) { skipped++; continue }
    // The authored ranges index this recipe's ingredient list; a different list means a different
    // recipe wearing the same name, so leave it as the ladder rather than mislabel its rows.
    if (authored.some((a) => a.to >= ingredients.length || a.from >= ingredients.length)) { skipped++; continue }
    if (authored.some((a) => steps[a.step] === undefined)) { skipped++; continue }

    const next = authored.map(({ step, ...rest }) => ({ ...rest, detail: steps[step] }))
    await db.execute({ sql: 'UPDATE "Meal" SET stages=? WHERE id=?', args: [JSON.stringify(next), m.id] })
    written++
  }

  console.log(`[migrate] stage_authoring: wrote ${written} meals, left ${skipped} already-edited, ${absent} not in the table`)
}
