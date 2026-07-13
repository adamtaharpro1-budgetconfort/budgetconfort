export const SHOPPING_AISLES = [
  "Fruits & Légumes",
  "Boucherie & Poisson",
  "Crémerie",
  "Boulangerie",
  "Épicerie",
  "Surgelés",
  "Boissons",
  "Hygiène & Entretien",
  "Autre",
] as const;

export type ShoppingAisle = (typeof SHOPPING_AISLES)[number];
