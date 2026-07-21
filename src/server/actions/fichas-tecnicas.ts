"use server";

import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { menuItems, recipeVersions, recipeIngredients, products, stores } from "@/server/db/schema";

export interface FichaTecnicaIngrediente {
  produto: string;
  quantidade: number;
  unidade: string;
}

export interface FichaTecnica {
  id: string;
  nome: string;
  storeNome: string;
  precoVenda: number;
  custoIngredientes: number;
  ingredientes: FichaTecnicaIngrediente[];
}

export async function getFichasTecnicas(): Promise<FichaTecnica[]> {
  if (!db) throw new Error("DATABASE_URL não configurada");

  const items = await db
    .select({
      id: menuItems.id,
      nome: menuItems.nome,
      storeNome: stores.nome,
      precoVenda: menuItems.precoVenda,
      recipeVersionId: recipeVersions.id,
      custoTotalCalculado: recipeVersions.custoTotalCalculado,
    })
    .from(menuItems)
    .innerJoin(stores, eq(stores.id, menuItems.storeId))
    .innerJoin(recipeVersions, eq(recipeVersions.menuItemId, menuItems.id))
    .orderBy(stores.nome, menuItems.nome);

  const ingredientRows = await db
    .select({
      recipeVersionId: recipeIngredients.recipeVersionId,
      produto: products.nome,
      quantidade: recipeIngredients.quantidade,
      unidade: recipeIngredients.unidade,
    })
    .from(recipeIngredients)
    .innerJoin(products, eq(products.id, recipeIngredients.productId));

  const ingredientesPorReceita = new Map<string, FichaTecnicaIngrediente[]>();
  for (const row of ingredientRows) {
    const list = ingredientesPorReceita.get(row.recipeVersionId) ?? [];
    list.push({ produto: row.produto, quantidade: Number(row.quantidade), unidade: row.unidade });
    ingredientesPorReceita.set(row.recipeVersionId, list);
  }

  return items.map((item) => ({
    id: item.id,
    nome: item.nome,
    storeNome: item.storeNome,
    precoVenda: Number(item.precoVenda),
    custoIngredientes: Number(item.custoTotalCalculado ?? 0),
    ingredientes: ingredientesPorReceita.get(item.recipeVersionId) ?? [],
  }));
}
