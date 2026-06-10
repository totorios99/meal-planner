// Mock data for the Meal Planner prototype.
// Mirrors the shape your Prisma backend probably uses: Meal { id, name, description, photoUrl, kcal, protein, carbs, fats, tag }.

window.MEALS = [
  {
    id: "granola",
    name: "Granola Bowl",
    description: "High carb pre-workout",
    tag: "Pre-workout",
    photo: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=900&auto=format&fit=crop&q=70",
    kcal: 450, protein: 30, carbs: 70, fats: 8,
  },
  {
    id: "arrachera",
    name: "Arrachera Tacos",
    description: "Mexican-style grilled arrachera tacos",
    tag: "Dinner",
    photo: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=900&auto=format&fit=crop&q=70",
    kcal: 820, protein: 43, carbs: 105, fats: 26,
  },
  {
    id: "pancakes",
    name: "Protein Pancakes",
    description: "High-protein banana pancakes",
    tag: "Breakfast",
    photo: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=900&auto=format&fit=crop&q=70",
    kcal: 900, protein: 45, carbs: 90, fats: 23,
  },
  {
    id: "salmon",
    name: "Salmon & Sweet Potato",
    description: "Pan-seared salmon with roasted sweet potato",
    tag: "High protein",
    photo: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=900&auto=format&fit=crop&q=70",
    kcal: 620, protein: 48, carbs: 55, fats: 22,
  },
  {
    id: "chickenbowl",
    name: "Chicken Rice Bowl",
    description: "Grilled chicken, jasmine rice, charred broccoli",
    tag: "Lunch",
    photo: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=900&auto=format&fit=crop&q=70",
    kcal: 680, protein: 52, carbs: 78, fats: 16,
  },
  {
    id: "oats",
    name: "Overnight Oats",
    description: "Greek yogurt, oats, berries, honey",
    tag: "Breakfast",
    photo: "https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=900&auto=format&fit=crop&q=70",
    kcal: 380, protein: 22, carbs: 58, fats: 9,
  },
  {
    id: "steak",
    name: "Steak & Greens",
    description: "Sirloin with chimichurri and grilled asparagus",
    tag: "High protein",
    photo: "https://images.unsplash.com/photo-1600891964092-4316c288032e?w=900&auto=format&fit=crop&q=70",
    kcal: 720, protein: 58, carbs: 18, fats: 42,
  },
  {
    id: "smoothie",
    name: "Recovery Smoothie",
    description: "Whey, banana, peanut butter, oat milk",
    tag: "Post-workout",
    photo: "https://images.unsplash.com/photo-1502740479091-635887520276?w=900&auto=format&fit=crop&q=70",
    kcal: 420, protein: 40, carbs: 48, fats: 11,
  },
  {
    id: "shakshuka",
    name: "Shakshuka",
    description: "Eggs poached in spiced tomato sauce",
    tag: "Breakfast",
    photo: "https://images.unsplash.com/photo-1590412200988-a436970781fa?w=900&auto=format&fit=crop&q=70",
    kcal: 480, protein: 28, carbs: 32, fats: 24,
  },
];

window.TARGETS = {
  kcal: 2400,
  protein: 180,
  carbs: 240,
  fats: 80,
};

window.MACRO_COLORS = {
  kcal: "var(--kcal)",
  protein: "var(--protein)",
  carbs: "var(--carbs)",
  fats: "var(--fats)",
};

// Initial 7-day plan (Mon → Sun for week of May 18, 2026)
window.INITIAL_PLAN = {
  Mon: { date: 18, off: false, note: "", items: [
    { mealId: "pancakes", qty: 1 },
    { mealId: "granola", qty: 1 },
    { mealId: "arrachera", qty: 1 },
  ]},
  Tue: { date: 19, off: false, note: "Can swap dinner for optional go-out date", items: [
    { mealId: "oats", qty: 1 },
    { mealId: "chickenbowl", qty: 1 },
    { mealId: "salmon", qty: 1 },
  ]},
  Wed: { date: 20, off: true, note: "Enana Trip", items: [] },
  Thu: { date: 21, off: true, note: "Enana Trip", items: [] },
  Fri: { date: 22, off: false, note: "", items: [
    { mealId: "pancakes", qty: 1 },
    { mealId: "chickenbowl", qty: 1 },
    { mealId: "steak", qty: 1 },
  ]},
  Sat: { date: 23, off: true, note: "Enana Trip", items: [] },
  Sun: { date: 24, off: true, note: "Enana Trip", items: [] },
};

window.DAY_KEYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
window.DAY_FULL = {
  Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday",
  Fri: "Friday", Sat: "Saturday", Sun: "Sunday",
};

// Helpers
window.getMeal = (id) => window.MEALS.find(m => m.id === id);

window.dayTotals = (day) => {
  if (!day || day.off) return { kcal: 0, protein: 0, carbs: 0, fats: 0 };
  return day.items.reduce((acc, it) => {
    const m = window.getMeal(it.mealId);
    if (!m) return acc;
    acc.kcal += m.kcal * it.qty;
    acc.protein += m.protein * it.qty;
    acc.carbs += m.carbs * it.qty;
    acc.fats += m.fats * it.qty;
    return acc;
  }, { kcal: 0, protein: 0, carbs: 0, fats: 0 });
};

window.pct = (val, target) => Math.round((val / target) * 100);
