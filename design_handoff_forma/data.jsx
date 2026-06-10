// === Forma Mock Data ===
// Mirrors the Prisma schema the builder should implement.
// All shapes here = what the API routes must return.

export const mockProfile = {
  id: 'profile-1',
  // Section 1 — Stats
  age: 32,
  sex: 'male',
  heightCm: 180,
  weightKg: 82,
  goalWeightKg: 75,
  pace: 'steady',           // 'steady' | 'fast'
  // Section 2 — Lifestyle
  jobType: 'desk',          // 'desk' | 'light-physical' | 'manual'
  exerciseDaysPerWeek: 3,
  exerciseType: 'gym weights',
  sleepHours: 7,
  stressLevel: 'moderate',  // 'low' | 'moderate' | 'high'
  alcoholDrinksPerWeek: 8,
  // Section 3 — Food
  favoriteFoods: ['tacos', 'sushi', 'pasta', 'BBQ', 'steak'],
  dislikedFoods: ['liver', 'anchovies'],
  dietaryRestrictions: [],
  cookingStyle: 'quick',    // 'scratch' | 'quick' | 'batch'
  adventurousness: 7,       // 1–10
  // Section 4 — Snacks
  currentSnacks: ['chips', 'chocolate', 'granola bars'],
  snackTrigger: 'boredom',  // 'hunger' | 'boredom' | 'habit'
  snackPreference: 'both',  // 'sweet' | 'savoury' | 'both'
  nightSnacking: true,
};

export const mockNutritionPlan = {
  id: 'plan-1',
  profileId: 'profile-1',
  createdAt: '2026-06-07T10:00:00Z',
  label: 'Jun 7–8 Weekend Plan',
  // Calculated values
  bmr: 1856,
  tdee: 2700,
  activityMultiplier: 1.375,
  deficit: 500,
  // Daily targets
  targetKcal: 2200,
  targetProtein: 175,
  targetCarbs: 220,
  targetFats: 70,
  // 7-day plan (weekend plan only uses Sat/Sun; full plan uses all 7)
  days: [
    {
      day: 'Saturday',
      theme: 'Tex-Mex Saturday',
      totalKcal: 2195,
      totalProtein: 174,
      totalCarbs: 218,
      totalFats: 71,
      meals: [
        { type: 'breakfast', name: 'Huevos Rancheros',              kcal: 480, protein: 28, carbs: 42, fats: 18 },
        { type: 'lunch',     name: 'Grilled Chicken Burrito Bowl',  kcal: 620, protein: 52, carbs: 60, fats: 14 },
        { type: 'dinner',    name: 'Carne Asada Tacos ×3',          kcal: 680, protein: 48, carbs: 72, fats: 22 },
        { type: 'snack',     name: 'Greek Yogurt + Mango',          kcal: 215, protein: 20, carbs: 28, fats:  3 },
        { type: 'dessert',   name: 'Churro Protein Shake',          kcal: 200, protein: 26, carbs: 16, fats:  4 },
      ],
    },
    {
      day: 'Sunday',
      theme: 'Mediterranean Sunday',
      totalKcal: 2210,
      totalProtein: 176,
      totalCarbs: 222,
      totalFats: 69,
      meals: [
        { type: 'breakfast', name: 'Greek Yogurt Parfait + Granola', kcal: 420, protein: 30, carbs: 48, fats:  9 },
        { type: 'lunch',     name: 'Grilled Halloumi Salad + Pitta', kcal: 560, protein: 32, carbs: 55, fats: 22 },
        { type: 'dinner',    name: 'Lamb Koftas + Tzatziki + Bulgar',kcal: 710, protein: 52, carbs: 62, fats: 24 },
        { type: 'snack',     name: 'Hummus + Carrots + Rice Cakes', kcal: 320, protein: 10, carbs: 46, fats: 10 },
        { type: 'dessert',   name: 'Frozen Yogurt + Honey + Walnuts',kcal: 200, protein: 12, carbs: 22, fats:  8 },
      ],
    },
    // Remaining 5 days (stubs for 7-day full plan)
    { day: 'Monday',    theme: 'Sushi Monday',     totalKcal: 2200, totalProtein: 175, totalCarbs: 220, totalFats: 70, meals: [] },
    { day: 'Tuesday',   theme: 'Taco Tuesday',     totalKcal: 2200, totalProtein: 175, totalCarbs: 220, totalFats: 70, meals: [] },
    { day: 'Wednesday', theme: 'Pasta Wednesday',  totalKcal: 2200, totalProtein: 175, totalCarbs: 220, totalFats: 70, meals: [] },
    { day: 'Thursday',  theme: 'BBQ Thursday',     totalKcal: 2200, totalProtein: 175, totalCarbs: 220, totalFats: 70, meals: [] },
    { day: 'Friday',    theme: 'Steak Friday',     totalKcal: 2200, totalProtein: 175, totalCarbs: 220, totalFats: 70, meals: [] },
  ],
  snackSwaps: [
    { before: 'Doritos (30g)',         after: 'Roasted Edamame + Sea Salt',       kcal: 100 },
    { before: 'Snickers Bar',          after: 'Medjool Date + Almond Butter',     kcal: 120 },
    { before: 'Granola Bar',           after: 'Rice Cake + PB + Banana',          kcal: 190 },
    { before: 'Late-night cereal',     after: 'Cottage Cheese + Pineapple',       kcal: 140 },
    { before: 'Chocolate biscuits',    after: 'Dark Chocolate 85% (2 squares)',   kcal:  95 },
  ],
  rules: [
    'Hit 175g protein every day — track it. Everything else follows.',
    'Alcohol budget: 8 drinks/week max. Count those calories and cut carbs 50g on drinking days.',
    'Never eat from the bag. Portion everything into a bowl first.',
    'One treat meal per week, not a treat day. Back on plan next meal.',
    'Miss the gym? Go for a 30-min walk. Movement every day protects the metabolism.',
  ],
  timeline: [
    { period: 'Week 1–2',  text: 'Water weight drops 1–3 kg. Energy fluctuates. Stay consistent.' },
    { period: 'Month 1',   text: 'Visible fat loss. Expect 1–2 kg real fat. Clothes feel looser.' },
    { period: 'Month 2–3', text: '3–4 kg down. Changes obvious in mirror. Strength maintains.' },
    { period: 'Month 6',   text: 'Goal weight territory. Sustainable habits locked in.' },
  ],
  hydration: {
    targetL: 3.2,
    tips: [
      'Keep a 1L bottle at your desk — refill twice before 5pm.',
      'Drink 500ml first thing before coffee — body is dehydrated from sleep.',
      'Set a 2pm reminder — afternoon slump is often dehydration.',
      'Add electrolytes on workout days — improves performance.',
    ],
  },
  supplements: [
    { icon: '💪', name: 'Creatine Monohydrate', dose: '5g daily',       timing: 'Anytime — consistency matters', why: 'Biggest ROI supplement. Strength + body comp.' },
    { icon: '🐟', name: 'Omega-3 Fish Oil',     dose: '2–3g EPA/DHA',   timing: 'With largest meal',            why: 'Inflammation + joint health. Critical for 3× gym/week.' },
    { icon: '☀️', name: 'Vitamin D3 + K2',      dose: '2000–4000 IU/d', timing: 'Morning with food',            why: 'Desk job = low sun. Impacts testosterone + mood.' },
    { icon: '🥛', name: 'Whey Protein',         dose: '30–40g post-WO', timing: 'Within 2hrs of training',     why: 'Hitting 175g/day through food alone is hard.' },
  ],
};

export const mockWorkout = {
  id: 'w-1',
  profileId: 'profile-1',
  createdAt: '2026-06-02T10:00:00Z',
  label: 'Upper/Lower Split',
  goal: 'fat-loss',       // 'fat-loss' | 'muscle' | 'maintain'
  daysPerWeek: 4,
  equipment: 'full-gym',  // 'full-gym' | 'home-basic' | 'bodyweight'
  isActive: true,
  days: [
    {
      label: 'Day A — Upper Push',
      focus: 'Chest, Shoulders, Triceps',
      exercises: [
        { name: 'Barbell Bench Press',    sets: 4, reps: '6–8',   notes: 'RPE 8' },
        { name: 'Incline DB Press',       sets: 3, reps: '10–12', notes: '' },
        { name: 'Overhead Press',         sets: 3, reps: '8–10',  notes: '' },
        { name: 'Cable Lateral Raises',   sets: 4, reps: '15–20', notes: 'Light' },
        { name: 'Tricep Rope Pushdowns',  sets: 3, reps: '12–15', notes: '' },
      ],
    },
    {
      label: 'Day B — Lower Quad',
      focus: 'Quads, Glutes, Calves',
      exercises: [
        { name: 'Barbell Back Squat',     sets: 4, reps: '6–8',   notes: 'RPE 8' },
        { name: 'Bulgarian Split Squat',  sets: 3, reps: '10 ea.', notes: 'Dumbbells' },
        { name: 'Leg Press',              sets: 3, reps: '12–15', notes: '' },
        { name: 'Leg Extensions',         sets: 3, reps: '15–20', notes: 'Slow eccentric' },
        { name: 'Standing Calf Raise',    sets: 4, reps: '15–20', notes: '' },
      ],
    },
    {
      label: 'Day C — Upper Pull',
      focus: 'Back, Biceps, Rear Delts',
      exercises: [
        { name: 'Pull-Ups / Lat Pulldown', sets: 4, reps: '6–10',  notes: 'Weighted if able' },
        { name: 'Pendlay Rows',            sets: 3, reps: '8–10',  notes: '' },
        { name: 'Seated Cable Rows',       sets: 3, reps: '12–15', notes: '' },
        { name: 'Face Pulls',              sets: 3, reps: '15–20', notes: 'Shoulder health' },
        { name: 'Dumbbell Curls',          sets: 3, reps: '12–15', notes: '' },
      ],
    },
    {
      label: 'Day D — Lower Hinge',
      focus: 'Hamstrings, Glutes, Core',
      exercises: [
        { name: 'Romanian Deadlift',   sets: 4, reps: '8–10',  notes: 'RPE 8' },
        { name: 'Leg Curl Machine',    sets: 3, reps: '12–15', notes: '' },
        { name: 'Hip Thrust',          sets: 3, reps: '12–15', notes: 'Heavy' },
        { name: 'Walking Lunges',      sets: 3, reps: '12 ea.', notes: 'Dumbbells' },
        { name: 'Ab Wheel Rollout',    sets: 3, reps: '10–15', notes: '' },
      ],
    },
  ],
};

// Chat message shape (stored with NutritionPlan or WorkoutPlan)
export const mockChatHistory = [
  { role: 'assistant', section: 1, content: "Hey! Let's build your plan. Tell me: age, sex, height, weight, goal weight, and how fast you want to lose it." },
  { role: 'user',      section: 1, content: '32 / male / 180cm / 82kg. Goal 75kg, ~1 year, steady.' },
  { role: 'assistant', section: 2, content: 'Solid. Now lifestyle: job type, exercise days+type, sleep, stress, alcohol/week?' },
  { role: 'user',      section: 2, content: 'Desk job. Gym 3×/week, weights. 7hrs sleep. Moderate stress. ~8 drinks/week.' },
  { role: 'assistant', section: 3, content: 'Got it. Food preferences: top 5 meals, foods you hate, restrictions, cooking style, adventurousness 1–10?' },
  { role: 'user',      section: 3, content: 'Love tacos, sushi, pasta, BBQ, steak. Hate liver/anchovies. No restrictions. Quick meals. 7/10.' },
  { role: 'assistant', section: 4, content: 'Fun picks. Snack habits: what do you reach for, why (hunger/boredom/habit), sweet or savoury, late night?' },
  { role: 'user',      section: 4, content: 'Chips, chocolate, granola bars. Boredom mostly. Both. Yeah, late night sometimes — cereal or biscuits.' },
  { role: 'assistant', section: null, content: null, isPlanResult: true, planId: 'plan-1' },
];
