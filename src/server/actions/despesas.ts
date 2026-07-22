"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/server/db";
import { expenseAllocations, expenseCategories, expenses, stores } from "@/server/db/schema";

export interface CategoriaDespesa {
  id: string;
  nome: string;
  tipoDre: string;
}

export async function getCategoriasDespesa(): Promise<CategoriaDespesa[]> {
  if (!db) throw new Error("DATABASE_URL não configurada");
  return db.select({ id: expenseCategories.id, nome: expenseCategories.nome, tipoDre: expenseCategories.tipoDre }).from(expenseCategories).orderBy(expenseCategories.nome);
}

export interface LojaParaRateio {
  id: string;
  nome: string;
}

export async function getLojasParaRateio(): Promise<LojaParaRateio[]> {
  if (!db) throw new Error("DATABASE_URL não configurada");
  return db.select({ id: stores.id, nome: stores.nome }).from(stores).where(eq(stores.ativo, true)).orderBy(stores.nome);
}

export interface Despesa {
  id: string;
  descricao: string;
  categoriaNome: string;
  competencia: string;
  dataVencimento: string | null;
  dataPagamento: string | null;
  valor: number;
  formaPagamento: string | null;
  status: string;
}

export async function getDespesas(): Promise<Despesa[]> {
  if (!db) throw new Error("DATABASE_URL não configurada");

  const rows = await db
    .select({
      id: expenses.id,
      descricao: expenses.descricao,
      categoriaNome: expenseCategories.nome,
      competencia: sql<string>`to_char(${expenses.competencia}, 'MM/YYYY')`,
      dataVencimento: sql<string | null>`to_char(${expenses.dataVencimento}, 'DD/MM/YYYY')`,
      dataPagamento: sql<string | null>`to_char(${expenses.dataPagamento}, 'DD/MM/YYYY')`,
      valor: expenses.valor,
      formaPagamento: expenses.formaPagamento,
      status: expenses.status,
    })
    .from(expenses)
    .innerJoin(expenseCategories, eq(expenseCategories.id, expenses.categoriaId))
    .orderBy(expenses.competencia);

  return rows.reverse().map((r) => ({ ...r, valor: Number(r.valor) }));
}

export type ResultadoDespesa = { status: "ok" } | { status: "erro"; mensagem: string };

export async function criarDespesa(formData: FormData): Promise<ResultadoDespesa> {
  if (!db) throw new Error("DATABASE_URL não configurada");

  const descricao = formData.get("descricao") as string;
  const categoriaId = formData.get("categoriaId") as string;
  const competenciaStr = formData.get("competencia") as string; // "YYYY-MM"
  const valorStr = formData.get("valor") as string;
  const vencimentoStr = formData.get("dataVencimento") as string | null;
  const pagamentoStr = formData.get("dataPagamento") as string | null;
  const formaPagamento = formData.get("formaPagamento") as string | null;
  const status = (formData.get("status") as string) || "pendente";
  const origem = (formData.get("origem") as string) || "manual";

  if (!descricao || !categoriaId || !competenciaStr || !valorStr) {
    return { status: "erro", mensagem: "Preencha descrição, categoria, competência e valor." };
  }

  const valor = Number(valorStr.replace(",", "."));
  if (Number.isNaN(valor) || valor <= 0) {
    return { status: "erro", mensagem: "Valor inválido." };
  }

  const rateio: { storeId: string; percentual: number }[] = [];
  for (const [chave, valorCampo] of formData.entries()) {
    if (!chave.startsWith("rateio_")) continue;
    const percentual = Number(String(valorCampo).replace(",", "."));
    if (percentual > 0) {
      rateio.push({ storeId: chave.replace("rateio_", ""), percentual });
    }
  }
  if (rateio.length > 0) {
    const somaPercentual = rateio.reduce((soma, r) => soma + r.percentual, 0);
    if (Math.abs(somaPercentual - 100) > 0.5) {
      return { status: "erro", mensagem: `O rateio entre lojas deve somar 100% (está somando ${somaPercentual}%).` };
    }
  }

  const [despesaInserida] = await db
    .insert(expenses)
    .values({
      descricao,
      categoriaId,
      competencia: new Date(`${competenciaStr}-01T00:00:00`),
      dataVencimento: vencimentoStr ? new Date(`${vencimentoStr}T00:00:00`) : null,
      dataPagamento: pagamentoStr ? new Date(`${pagamentoStr}T00:00:00`) : null,
      valor: valor.toString(),
      formaPagamento: formaPagamento || null,
      status,
      origem,
    })
    .returning({ id: expenses.id });

  if (rateio.length > 0) {
    await db.insert(expenseAllocations).values(
      rateio.map((r) => ({
        expenseId: despesaInserida.id,
        storeId: r.storeId,
        percentual: r.percentual.toString(),
        valor: ((valor * r.percentual) / 100).toString(),
        criterioRateio: "percentual_fixo",
      })),
    );
  }

  return { status: "ok" };
}

export interface ItemDespesaEntrada {
  descricao: string;
  categoriaId: string;
  valor: number;
}

export interface DadosComunsDespesa {
  competencia: string; // "YYYY-MM"
  dataVencimento: string | null;
  dataPagamento: string | null;
  formaPagamento: string | null;
  status: string;
  origem: string;
}

export async function criarDespesasEmLote(
  itens: ItemDespesaEntrada[],
  comuns: DadosComunsDespesa,
): Promise<ResultadoDespesa> {
  if (!db) throw new Error("DATABASE_URL não configurada");

  if (itens.length === 0) {
    return { status: "erro", mensagem: "Selecione ao menos um item para lançar." };
  }
  if (!comuns.competencia) {
    return { status: "erro", mensagem: "Informe a competência." };
  }
  for (const item of itens) {
    if (!item.descricao || !item.categoriaId || !Number.isFinite(item.valor) || item.valor <= 0) {
      return { status: "erro", mensagem: `Item inválido: ${item.descricao || "sem descrição"}.` };
    }
  }

  await db.insert(expenses).values(
    itens.map((item) => ({
      descricao: item.descricao,
      categoriaId: item.categoriaId,
      competencia: new Date(`${comuns.competencia}-01T00:00:00`),
      dataVencimento: comuns.dataVencimento ? new Date(`${comuns.dataVencimento}T00:00:00`) : null,
      dataPagamento: comuns.dataPagamento ? new Date(`${comuns.dataPagamento}T00:00:00`) : null,
      valor: item.valor.toString(),
      formaPagamento: comuns.formaPagamento || null,
      status: comuns.status,
      origem: comuns.origem,
    })),
  );

  revalidatePath("/despesas");
  return { status: "ok" };
}
