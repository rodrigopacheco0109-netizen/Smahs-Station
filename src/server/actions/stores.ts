"use server";

import { count, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { menuItems, stores } from "@/server/db/schema";

export interface StoreSummary {
  id: string;
  nome: string;
  codigoInterno: string;
  ativo: boolean;
  itensCardapio: number;
}

export async function getStores(): Promise<StoreSummary[]> {
  if (!db) throw new Error("DATABASE_URL não configurada");

  return db
    .select({
      id: stores.id,
      nome: stores.nome,
      codigoInterno: stores.codigoInterno,
      ativo: stores.ativo,
      itensCardapio: count(menuItems.id),
    })
    .from(stores)
    .leftJoin(menuItems, eq(menuItems.storeId, stores.id))
    .groupBy(stores.id, stores.nome, stores.codigoInterno, stores.ativo)
    .orderBy(stores.nome);
}
