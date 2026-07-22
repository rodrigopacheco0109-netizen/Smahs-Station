"use server";

import crypto from "node:crypto";
import { and, eq, gte, inArray, lt, sql } from "drizzle-orm";
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

  // Tudo abaixo roda em lote (poucas idas ao banco, independente do tamanho
  // do arquivo) — a versão anterior fazia uma consulta por produto por dia,
  // o que passava fácil de centenas de idas ao banco e arriscava estourar o
  // tempo limite de uma função serverless (a causa mais provável da
  // importação "sumir" — a transação nunca chegava a commitar).
  return db.transaction(async (tx) => {
    const diasDasSessoes = sessoes.map((s) => {
      const d = new Date(s.data);
      d.setHours(0, 0, 0, 0);
      return d;
    });
    const menorDia = new Date(Math.min(...diasDasSessoes.map((d) => d.getTime())));
    const maiorDiaExclusivo = new Date(Math.max(...diasDasSessoes.map((d) => d.getTime())));
    maiorDiaExclusivo.setDate(maiorDiaExclusivo.getDate() + 1);

    const ordensExistentes = await tx
      .select({ data: salesOrders.data })
      .from(salesOrders)
      .where(and(eq(salesOrders.storeId, storeId), gte(salesOrders.data, menorDia), lt(salesOrders.data, maiorDiaExclusivo)));
    const diasComVendas = new Set(ordensExistentes.map((o) => new Date(o.data).setHours(0, 0, 0, 0)));

    const sessoesNovas = sessoes.filter((s) => {
      const d = new Date(s.data);
      d.setHours(0, 0, 0, 0);
      return !diasComVendas.has(d.getTime());
    });
    const diasJaExistentes = sessoes.length - sessoesNovas.length;
    const diasImportados = sessoesNovas.length;

    const [importRow] = await tx
      .insert(salesImports)
      .values({ storeId, arquivoNome: file.name, hashArquivo: hash, status: "concluido" })
      .returning();

    if (sessoesNovas.length === 0) {
      return { status: "ok" as const, diasImportados: 0, diasJaExistentes, produtosNovosCriados: [], totalLinhas: 0 };
    }

    const linhas = sessoesNovas.flatMap((sessao) =>
      sessao.produtos.map((produto) => ({
        data: sessao.data,
        nomeResolvido: MAPEAMENTO_PRODUTOS[produto.nome.toUpperCase()] ?? produto.nome,
        quantidade: produto.quantidade,
        totalVenda: produto.totalVenda,
        ticketMedio: produto.ticketMedio,
        totalDesconto: produto.totalDesconto,
      }))
    );

    const nomesUnicos = [...new Set(linhas.map((l) => l.nomeResolvido))];
    const precoPorNome = new Map<string, number>();
    for (const l of linhas) {
      if (!precoPorNome.has(l.nomeResolvido)) precoPorNome.set(l.nomeResolvido, l.ticketMedio);
    }

    const itensExistentes = await tx
      .select({ id: menuItems.id, nome: menuItems.nome })
      .from(menuItems)
      .where(eq(menuItems.storeId, storeId));
    const idPorNome = new Map(itensExistentes.map((i) => [i.nome, i.id]));

    const nomesNovos = nomesUnicos.filter((n) => !idPorNome.has(n));
    if (nomesNovos.length > 0) {
      const novosItens = await tx
        .insert(menuItems)
        .values(nomesNovos.map((nome) => ({ storeId, nome, precoVenda: (precoPorNome.get(nome) ?? 0).toString() })))
        .returning({ id: menuItems.id, nome: menuItems.nome });
      for (const item of novosItens) idPorNome.set(item.nome, item.id);
    }

    const todosOsIds = [...new Set(nomesUnicos.map((n) => idPorNome.get(n)!))];
    const versoesExistentes = await tx
      .select({ id: recipeVersions.id, menuItemId: recipeVersions.menuItemId })
      .from(recipeVersions)
      .where(inArray(recipeVersions.menuItemId, todosOsIds));
    const versaoPorItem = new Map(versoesExistentes.map((v) => [v.menuItemId, v.id]));

    const itensSemVersao = todosOsIds.filter((id) => !versaoPorItem.has(id));
    if (itensSemVersao.length > 0) {
      const novasVersoes = await tx
        .insert(recipeVersions)
        .values(itensSemVersao.map((menuItemId) => ({ menuItemId, versao: 1 })))
        .returning({ id: recipeVersions.id, menuItemId: recipeVersions.menuItemId });
      for (const v of novasVersoes) versaoPorItem.set(v.menuItemId, v.id);
    }

    const pedidosInseridos = await tx
      .insert(salesOrders)
      .values(
        linhas.map((l) => ({
          storeId,
          salesImportId: importRow.id,
          data: l.data,
          valorBruto: l.totalVenda.toString(),
          desconto: l.totalDesconto.toString(),
        }))
      )
      .returning({ id: salesOrders.id });

    await tx.insert(salesOrderItems).values(
      linhas.map((l, i) => {
        const menuItemId = idPorNome.get(l.nomeResolvido)!;
        return {
          salesOrderId: pedidosInseridos[i].id,
          menuItemId,
          recipeVersionId: versaoPorItem.get(menuItemId)!,
          quantidade: l.quantidade.toString(),
          valorUnitario: l.ticketMedio.toString(),
          valorTotal: l.totalVenda.toString(),
        };
      })
    );

    return {
      status: "ok" as const,
      diasImportados,
      diasJaExistentes,
      produtosNovosCriados: nomesNovos,
      totalLinhas: linhas.length,
    };
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
