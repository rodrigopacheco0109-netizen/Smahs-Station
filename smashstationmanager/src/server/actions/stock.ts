"use server";

import { count, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { productCategories, products } from "@/server/db/schema";

export interface CentralStockItem {
  id: string;
  nome: string;
  categoria: string | null;
  unidadeConsumo: string;
  estoqueMin: number;
  custoMedio: number | null;
  saldoAtual: number;
}

export async function getEstoqueCentral(): Promise<CentralStockItem[]> {
  if (!db) throw new Error("DATABASE_URL não configurada");

  // Não existe uma coluna de quantidade fixa no produto — o saldo atual é
  // sempre o "quantidade_nova" do movimento mais recente no estoque central
  // (stock_location com store_id nulo). DISTINCT ON pega só o último
  // movimento por produto.
  const saldosResult = await db.execute<{ product_id: string; saldo: string }>(sql`
    select distinct on (sm.product_id)
      sm.product_id,
      sm.quantidade_nova as saldo
    from stock_movements sm
    join stock_locations sl on sl.id = sm.stock_location_id
    where sl.store_id is null
    order by sm.product_id, sm.created_at desc
  `);

  const saldoPorProduto = new Map<string, number>();
  for (const row of saldosResult) {
    saldoPorProduto.set(row.product_id, Number(row.saldo));
  }

  const rows = await db
    .select({
      id: products.id,
      nome: products.nome,
      categoria: productCategories.nome,
      unidadeConsumo: products.unidadeConsumo,
      estoqueMin: products.estoqueMin,
      custoMedio: products.custoMedio,
    })
    .from(products)
    .leftJoin(productCategories, eq(products.categoriaId, productCategories.id))
    .orderBy(products.nome);

  return rows.map((p) => ({
    id: p.id,
    nome: p.nome,
    categoria: p.categoria,
    unidadeConsumo: p.unidadeConsumo,
    estoqueMin: Number(p.estoqueMin ?? 0),
    custoMedio: p.custoMedio !== null ? Number(p.custoMedio) : null,
    saldoAtual: saldoPorProduto.get(p.id) ?? 0,
  }));
}

export async function getProductCount(): Promise<number> {
  if (!db) throw new Error("DATABASE_URL não configurada");

  const [row] = await db.select({ total: count() }).from(products);
  return row.total;
}
