import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Les Server Actions limitent le corps de requête à 1 Mo par défaut — trop
    // petit pour une photo prise directement au téléphone (frigo, ticket de
    // caisse), qui dépasse quasi toujours cette taille. Le scan de frigo peut
    // envoyer plusieurs photos d'un coup, d'où une limite plus large.
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
