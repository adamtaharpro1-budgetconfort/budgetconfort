"use server";

import { generateObject } from "ai";
import { z } from "zod";
import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSessionHousehold } from "@/lib/actions/helpers";
import { AI_VISION_MODEL } from "@/lib/ai";
import type { ActionResult } from "@/lib/actions/auth";

const fridgeSchema = z.object({
  items: z.array(
    z.object({
      name: z.string(),
      estimatedQuantity: z.string(),
      category: z.string(),
      estimatedDaysUntilExpiry: z.number().int().min(0).max(365).nullable(),
    })
  ),
  recipeIdeas: z.array(z.string()).max(3),
});

const receiptSchema = z.object({
  store: z.string().nullable(),
  date: z.string().nullable(),
  total: z.number(),
  items: z.array(z.object({ name: z.string(), price: z.number() })),
});

async function uploadImage(file: File, prefix: string) {
  const blob = await put(`${prefix}/${Date.now()}-${file.name}`, file, {
    access: "public",
    addRandomSuffix: true,
  });
  return blob.url;
}

export async function scanFridge(formData: FormData): Promise<ActionResult & { recipeIdeas?: string[]; itemCount?: number }> {
  try {
    const { householdId } = await requireSessionHousehold();
    const files = formData.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
    if (files.length === 0) return { ok: false, error: "Aucune image reçue" };

    let imageUrls: string[];
    try {
      imageUrls = await Promise.all(files.map((file) => uploadImage(file, "fridge")));
    } catch (error) {
      console.error("[scanFridge] blob upload failed:", error);
      return { ok: false, error: "Le stockage d'images (Vercel Blob) n'est pas encore configuré." };
    }

    const multi = imageUrls.length > 1;
    let result;
    try {
      result = await generateObject({
        model: AI_VISION_MODEL,
        schema: fridgeSchema,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Voici ${multi ? `${imageUrls.length} photos` : "une photo"} d'espaces de rangement de nourriture du même foyer (frigo, congélateur, placards...). Analyse-${multi ? "les TOUTES ensemble" : "la"} de façon EXHAUSTIVE. Sois minutieux : inspecte chaque étagère, la porte, les bacs à légumes, les zones d'ombre et les emballages partiellement cachés ou empilés derrière d'autres produits — pas seulement les 3-4 objets les plus visibles au premier plan. Liste séparément chaque produit différent que tu identifies, même en petite quantité ou en arrière-plan.
${multi ? "\nSi le même produit apparaît sur plusieurs photos, ne le liste qu'une seule fois dans le résultat final (sauf si les quantités sont clairement différentes)." : ""}
Pour chaque aliment : son nom, une quantité estimée, une catégorie, et une estimation du nombre de jours avant péremption si un indice est visible (date, état visuel). Propose aussi jusqu'à 3 idées de recettes rapides avec l'ensemble de ces ingrédients.`,
              },
              ...imageUrls.map((url) => ({
                type: "image" as const,
                image: url,
                providerOptions: { openai: { imageDetail: "high" as const } },
              })),
            ],
          },
        ],
      });
    } catch (error) {
      console.error("[scanFridge] vision analysis failed:", error);
      return { ok: false, error: "L'analyse IA a échoué (peut-être trop de demandes en peu de temps). Réessaie dans quelques instants." };
    }

    const detected = result.object;

    await prisma.pantryItem.createMany({
      data: detected.items.map((item) => ({
        householdId,
        name: item.name,
        quantity: undefined,
        unit: item.estimatedQuantity,
        category: item.category,
        photo: imageUrls[0],
        expiryDate:
          item.estimatedDaysUntilExpiry != null
            ? new Date(Date.now() + item.estimatedDaysUntilExpiry * 24 * 60 * 60 * 1000)
            : undefined,
      })),
    });

    revalidatePath("/stock");
    revalidatePath("/dashboard");

    return { ok: true, recipeIdeas: detected.recipeIdeas, itemCount: detected.items.length };
  } catch (error) {
    console.error("[scanFridge] failed:", error);
    return { ok: false, error: "Une erreur est survenue pendant l'analyse. Réessaie." };
  }
}

export async function scanReceipt(formData: FormData): Promise<ActionResult & { total?: number; itemCount?: number }> {
  try {
    const { householdId, userId } = await requireSessionHousehold();
    const file = formData.get("image") as File | null;
    if (!file) return { ok: false, error: "Aucune image reçue" };

    let imageUrl: string;
    try {
      imageUrl = await uploadImage(file, "receipts");
    } catch (error) {
      console.error("[scanReceipt] blob upload failed:", error);
      return { ok: false, error: "Le stockage d'images (Vercel Blob) n'est pas encore configuré." };
    }

    let result;
    try {
      result = await generateObject({
        model: AI_VISION_MODEL,
        schema: receiptSchema,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyse ce ticket de caisse. Extrait le nom du magasin, la date, le montant total, et la liste des produits avec leur prix.",
              },
              { type: "image", image: imageUrl, providerOptions: { openai: { imageDetail: "high" } } },
            ],
          },
        ],
      });
    } catch (error) {
      console.error("[scanReceipt] vision analysis failed:", error);
      return { ok: false, error: "L'analyse IA a échoué (peut-être trop de demandes en peu de temps). Réessaie dans quelques instants." };
    }

    const extracted = result.object;

    await prisma.$transaction(async (tx) => {
      const receipt = await tx.receipt.create({
        data: {
          householdId,
          userId,
          imageUrl,
          store: extracted.store,
          total: extracted.total,
          date: extracted.date ? new Date(extracted.date) : new Date(),
          rawExtraction: extracted,
          status: "PROCESSED",
        },
      });

      await tx.transaction.create({
        data: {
          householdId,
          userId,
          label: extracted.store ? `Courses — ${extracted.store}` : "Courses",
          category: "COURSES",
          amount: extracted.total,
          source: "RECEIPT_SCAN",
          receiptId: receipt.id,
        },
      });

      if (extracted.items.length > 0) {
        await tx.pantryItem.createMany({
          data: extracted.items.map((item) => ({
            householdId,
            name: item.name,
            category: "Épicerie",
          })),
        });
      }
    });

    revalidatePath("/budget");
    revalidatePath("/stock");
    revalidatePath("/dashboard");

    return { ok: true, total: extracted.total, itemCount: extracted.items.length };
  } catch (error) {
    console.error("[scanReceipt] failed:", error);
    return { ok: false, error: "Une erreur est survenue pendant l'analyse. Réessaie." };
  }
}
