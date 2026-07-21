"use server";

import crypto from "node:crypto";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { salesImports, salesOrders, salesOrderItems, menuItems, recipeVersions, stores } from "@/server/db/schema";
import { parseVendas } from "@/lib/parse-vendas-xlsx";

// Nomes como aparecem nos relatórios de PDV (Smash Club — SysCashPay, e
// Smash Dom — Crl Automação) mapeados para os itens de cardápio já
// cadastrados via ficha técnica. Produtos vendidos que não aparecem aqui
// viram itens novos automaticamente (sem ficha técnica, até serem
// completados manualmente).
const MAPEAMENTO_PRODUTOS: Record<string, string> = {
  // Smash Club
  "CHEESE SMASH CLASSICO": "Cheese Burger",
  "CHEDDAR BACON CLASSICO": "Cheddar Bacon",
  "QUARTER CLASSICO": "Quarter",
  "EGG STATION CLASSICO": "Cheese Egg",
  "SALAD SMASH CLASSICO": "Cheese Salada",
  "VEGETARIANO CLASSICO": "Vegetariano",
  "BIG STATION ESPECIAL": "Big Smash",
  "SMASH TASTY ESPECIAL": "Tasty Smash",
  "PORCAO DE FRITAS": "Batata Palito",
  "PORCAO DE NUGGETS": "Nuggets",
  "MILK SHAKE MORANGO": "Milkshake Morango",
  "MILK SHAKE OVOMALTINE": "Milkshake Ovomaltine",
  // Smash Dom (nomes base, após remover sufixo "- modificador")
  "CHEESE SMASH": "Cheese Burger",
  "CHEESE SMASH DUPLO": "Cheese Burger Duplo",
  "CHEDDAR BACON": "Cheddar Bacon",
  "QUARTER": "Quarter",
  "EGG STATION": "Cheese Egg",
  "SALAD SMASH": "Cheese Salada",
  "SALADA SMASH": "Cheese Salada",
  "VEGETARIANO": "Vegetariano",
  "BIG STATION": "Big Smash",
  "SMASH TASTY": "Tasty Smash",
  "BATATA FRITA": "Batata Palito",
  "FRITAS": "Batata Palito",
  "NUGGETS": "Nuggets",
  "ALMOFADA GOUDA": "Almofada Gouda",
};

export interface ResultadoImportacao {
  status: "ok" | "duplicado";
  diasImportados: number;
  diasJaExistentes: number;
  produtosNovosCriados: string[];
  totalLinhas: number;
}

export async function importarVendas(formData: FormData): Promise<ResultadoImportacao> {
  if (!db) throw new Error("DATABASE_URL não configurada");

  const file = formData.get("arquivo") as File | null;
  const storeId = formData.get("storeId") as string | null;
  const dataReferenciaStr = formData.get("dataReferencia") as string | null;
  if (!file || !storeId) {
    throw new Error("Selecione o arquivo e a loja antes de importar.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");

  const existente = await db
    .select({ id: salesImports.id })
    .from(salesImports)
    .where(eq(salesImports.hashArquivo, hash))
    .limit(1);
  if (existente.length > 0) {
    return { status: "duplicado", diasImportados: 0, diasJaExistentes: 0, produtosNovosCriados: [], totalLinhas: 0 };
  }

  const dataReferencia = dataReferenciaStr ? new Date(`${dataReferenciaStr}T00:00:00`) : undefined;
  const sessoes = await parseVendas(buffer, { dataReferencia });

  return db.transaction(async (tx) => {
    const [importRow] = await tx
      .insert(salesImports)
      .values({ storeId, arquivoNome: file.name, hashArquivo: hash, status: "concluido" })
      .returning();

    const menuItemCache = new Map<string, { menuItemId: string; recipeVersionId: string }>();
    const produtosNovosCriados: string[] = [];
    let diasImportados = 0;
    let diasJaExistentes = 0;
    let totalLinhas = 0;

    for (const sessao of sessoes) {
      const inicioDia = new Date(sessao.data);
      inicioDia.setHours(0, 0, 0, 0);
      const fimDia = new Date(inicioDia);
      fimDia.setDate(fimDia.getDate() + 1);

      const jaExiste = await tx
        .select({ id: salesOrders.id })
        .from(salesOrders)
        .where(
          and(eq(salesOrders.storeId, storeId), gte(salesOrders.data, inicioDia), lt(salesOrders.data, fimDia))
        )
        .limit(1);

      if (jaExiste.length > 0) {
        diasJaExistentes++;
        continue;
      }
      diasImportados++;

      for (const produto of sessao.produtos) {
        const nomeResolvido = MAPEAMENTO_PRODUTOS[produto.nome.toUpperCase()] ?? produto.nome;

        let cacheEntry = menuItemCache.get(nomeResolvido);
        if (!cacheEntry) {
          const existenteItem = await tx
            .select({ id: menuItems.id })
            .from(menuItems)
            .where(and(eq(menuItems.storeId, storeId), eq(menuItems.nome, nomeResolvido)))
            .limit(1);

          if (existenteItem.length > 0) {
            const menuItemId = existenteItem[0].id;
            const [versao] = await tx
              .select({ id: recipeVersions.id })
              .from(recipeVersions)
              .where(eq(recipeVersions.menuItemId, menuItemId))
              .limit(1);
            cacheEntry = { menuItemId, recipeVersionId: versao.id };
          } else {
            const [novoItem] = await tx
              .insert(menuItems)
              .values({ storeId, nome: nomeResolvido, precoVenda: produto.ticketMedio.toString() })
              .returning();
            const [novaVersao] = await tx
              .insert(recipeVersions)
              .values({ menuItemId: novoItem.id, versao: 1 })
              .returning();
            cacheEntry = { menuItemId: novoItem.id, recipeVersionId: novaVersao.id };
            produtosNovosCriados.push(nomeResolvido);
          }
          menuItemCache.set(nomeResolvido, cacheEntry);
        }

        const [order] = await tx
          .insert(salesOrders)
          .values({
            storeId,
            salesImportId: importRow.id,
            data: sessao.data,
            valorBruto: produto.totalVenda.toString(),
            desconto: produto.totalDesconto.toString(),
          })
          .returning();

        await tx.insert(salesOrderItems).values({
          salesOrderId: order.id,
          menuItemId: cacheEntry.menuItemId,
          recipeVersionId: cacheEntry.recipeVersionId,
          quantidade: produto.quantidade.toString(),
          valorUnitario: produto.ticketMedio.toString(),
          valorTotal: produto.totalVenda.toString(),
        });
        totalLinhas++;
      }
    }

    return { status: "ok" as const, diasImportados, diasJaExistentes, produtosNovosCriados, totalLinhas };
  });
}

export interface ImportacaoResumo {
  id: string;
  arquivoNome: string;
  storeNome: string;
  status: string;
  criadoEm: string;
}

export async function getImportacoes(): Promise<ImportacaoResumo[]> {
  if (!db) throw new Error("DATABASE_URL não configurada");

  // Formata a data no próprio Postgres (to_char) em vez de deixar o driver
  // converter timestamp -> Date no lado do Node — postgres.js e drizzle têm
  // uma incompatibilidade conhecida nessa conversão que produz "Invalid Date".
  const rows = await db
    .select({
      id: salesImports.id,
      arquivoNome: salesImports.arquivoNome,
      storeNome: stores.nome,
      status: salesImports.status,
      criadoEm: sql<string>`to_char(${salesImports.createdAt}, 'DD/MM/YYYY HH24:MI')`,
    })
    .from(salesImports)
    .innerJoin(stores, eq(stores.id, salesImports.storeId))
    .orderBy(salesImports.createdAt);

  return rows.reverse();
}
