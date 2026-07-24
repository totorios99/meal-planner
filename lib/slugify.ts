// Shared by lib/foodSchema.ts (server) and FoodModal.tsx (client) so a nutrient's machine
// key converges on the same string regardless of who writes it — a human editing the form,
// or an agent calling upsert_food with just a label.
export function slugify(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}
