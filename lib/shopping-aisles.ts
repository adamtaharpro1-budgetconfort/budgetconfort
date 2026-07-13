export const SHOPPING_AISLES = [
  "Fruits & Légumes",
  "Boucherie",
  "Poissonnerie",
  "Charcuterie & Traiteur",
  "Crémerie",
  "Boulangerie & Pâtisserie",
  "Épicerie salée",
  "Épicerie sucrée",
  "Surgelés",
  "Boissons",
  "Hygiène & Beauté",
  "Entretien & Maison",
  "Bébé",
  "Autre",
] as const;

export type ShoppingAisle = (typeof SHOPPING_AISLES)[number];

export const AISLE_EXAMPLES: Record<ShoppingAisle, string> = {
  "Fruits & Légumes": "fruits frais, légumes frais, herbes fraîches, salades, ail, oignon, pommes de terre",
  "Boucherie": "viande de boeuf, poulet, porc, agneau, dinde, steak haché, saucisses crues",
  "Poissonnerie": "poisson frais, saumon, crevettes, fruits de mer, thon frais",
  "Charcuterie & Traiteur": "jambon, saucisson, pâté, rillettes, plats préparés, quiches, salades traiteur",
  "Crémerie": "lait, yaourt, fromage, beurre, crème fraîche, oeufs, margarine",
  "Boulangerie & Pâtisserie": "pain, baguette, viennoiseries, brioche, gâteaux, pâte à tarte",
  "Épicerie salée": "pâtes, riz, semoule, farine, sucre, sel, huile, vinaigre, conserves de légumes, conserves de poisson, sauces, bouillon, épices, légumineuses sèches",
  "Épicerie sucrée": "biscuits, chocolat, confiture, miel, céréales du petit-déjeuner, pâte à tartiner, bonbons, gâteaux industriels",
  "Surgelés": "légumes surgelés, plats surgelés, glaces, poisson pané surgelé, pizza surgelée",
  "Boissons": "eau, jus de fruits, soda, café, thé, vin, bière, alcool",
  "Hygiène & Beauté": "savon, shampoing, dentifrice, déodorant, papier toilette, protections hygiéniques, rasoirs",
  "Entretien & Maison": "produits ménagers, lessive, éponges, sacs poubelle, essuie-tout, ampoules",
  "Bébé": "couches, lait infantile, petits pots, lingettes bébé",
  "Autre": "tout produit qui ne correspond à aucune autre catégorie",
};
