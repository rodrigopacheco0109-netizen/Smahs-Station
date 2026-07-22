"use server";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  expenseAllocations,
  expenseCategories,
  expenses,
  recipeVersions,
  salesOrderItems,
  salesOrders,
} from "@/server/db/schema";
import type { DreInput } from "@/lib/calculations";

export interface MesDisponivel {
  valor: string; // "YYYY-MM"
  label: string;
}

const NOMES_MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function formatarMes(mesAno: string): string {
  const [ano, mes] = mesAno.split("-");
  const nome = NOMES_MESES[Number(mes) - 1] ?? mes;
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)}/${ano}`;
}

export async function getMesesDisponiveis(): Promise<MesDisponivel[]> {
  if (!db) throw new Error("DATABASE_URL não configurada");

  const vendasMeses = await db.selectDistinct({ mes: sql<string>`to_char(${salesOrders.data}, 'YYYY-MM')` }).from(salesOrders);
  const despesasMeses = await db
    .selectDistinct({ mes: sql<string>`to_char(${expenses.competencia}, 'YYYY-MM')` })
    .from(expenses);

  const conjunto = new Set<string>([...vendasMeses.map((v) => v.mes), ...despesasMeses.map((d) => d.mes)]);
  return [...conjunto].sort((a, b) => (a < b ? 1 : -1)).map((mes) => ({ valor: mes, label: formatarMes(mes) }));
}

export type EscopoDre = { tipo: "consolidado" } | { tipo: "loja"; storeId: string };

export interface DreReal extends DreInput {
  avisoDespesas: string | null;
}

export async function getDreReal(mesAno: string, escopo: EscopoDre): Promise<DreReal> {
  if (!db) throw new Error("DATABASE_URL não configurada");

  const filtroMesVendas = sql`to_char(${salesOrders.data}, 'YYYY-MM') = ${mesAno}`;
  const filtroCancelado = eq(salesOrders.cancelado, false);
  const filtroLoja = escopo.tipo === "loja" ? eq(salesOrders.storeId, escopo.storeId) : undefined;
  const filtroVendas = filtroLoja ? and(filtroMesVendas, filtroCancelado, filtroLoja) : and(filtroMesVendas, filtroCancelado);

  const [vendasRow] = await db
    .select({
      valorBruto: sql<string>`coalesce(sum(${salesOrders.valorBruto}), 0)`,
      desconto: sql<string>`coalesce(sum(${salesOrders.desconto}), 0)`,
    })
    .from(salesOrders)
    .where(filtroVendas);

  const receitaBruta = Number(vendasRow?.valorBruto ?? 0);
  const deducoes = Number(vendasRow?.desconto ?? 0);

  const [cmvRow] = await db
    .select({ custo: sql<string>`coalesce(sum(${salesOrderItems.quantidade} * ${recipeVersions.custoTotalCalculado}), 0)` })
    .from(salesOrderItems)
    .innerJoin(salesOrders, eq(salesOrders.id, salesOrderItems.salesOrderId))
    .innerJoin(recipeVersions, eq(recipeVersions.id, salesOrderItems.recipeVersionId))
    .where(filtroVendas);

  const custosVariaveis = Number(cmvRow?.custo ?? 0);

  let despesasOperacionais = 0;
  let despesasFinanceiras = 0;
  let avisoDespesas: string | null = null;

  const filtroMesDespesas = sql`to_char(${expenses.competencia}, 'YYYY-MM') = ${mesAno}`;

  if (escopo.tipo === "consolidado") {
    const despesasRows = await db
      .select({ tipoDre: expenseCategories.tipoDre, total: sql<string>`coalesce(sum(${expenses.valor}), 0)` })
      .from(expenses)
      .innerJoin(expenseCategories, eq(expenseCategories.id, expenses.categoriaId))
      .where(filtroMesDespesas)
      .groupBy(expenseCategories.tipoDre);

    for (const row of despesasRows) {
      if (row.tipoDre === "despesa_operacional") despesasOperacionais += Number(row.total);
      else if (row.tipoDre === "despesa_financeira") despesasFinanceiras += Number(row.total);
    }
  } else {
    const despesasRows = await db
      .select({ tipoDre: expenseCategories.tipoDre, total: sql<string>`coalesce(sum(${expenseAllocations.valor}), 0)` })
      .from(expenseAllocations)
      .innerJoin(expenses, eq(expenses.id, expenseAllocations.expenseId))
      .innerJoin(expenseCategories, eq(expenseCategories.id, expenses.categoriaId))
      .where(and(eq(expenseAllocations.storeId, escopo.storeId), filtroMesDespesas))
      .groupBy(expenseCategories.tipoDre);

    for (const row of despesasRows) {
      if (row.tipoDre === "despesa_operacional") despesasOperacionais += Number(row.total);
      else if (row.tipoDre === "despesa_financeira") despesasFinanceiras += Number(row.total);
    }

    avisoDespesas =
      "Só entram aqui despesas com divisão por loja registrada. Compras e demais despesas sem divisão aparecem apenas no consolidado.";
  }

  return { receitaBruta, deducoes, custosVariaveis, despesasOperacionais, despesasFinanceiras, avisoDespesas };
}
