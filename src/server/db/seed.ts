import { db } from "./index";
import {
  companies,
  stores,
  productCategories,
  products,
  stockLocations,
  stockMovements,
  menuItems,
  recipeVersions,
  recipeIngredients,
  expenseCategories,
} from "./schema";
import { stores as mockStores, products as mockProducts } from "../../lib/mock-data";
import { insumos, itensCardapio } from "./ficha-tecnica-data";

async function main() {
  if (!db) {
    throw new Error("DATABASE_URL não configurada — defina no .env antes de rodar o seed.");
  }

  const [company] = await db
    .insert(companies)
    .values({ nome: "Smash Station" })
    .returning();

  const storeIdByMockId = new Map<string, string>();
  for (const s of mockStores) {
    const [row] = await db
      .insert(stores)
      .values({
        companyId: company.id,
        nome: s.nome,
        codigoInterno: s.codigoInterno,
        ativo: s.ativo,
      })
      .returning();
    storeIdByMockId.set(s.id, row.id);
  }

  const categoriaIdByNome = new Map<string, string>();
  const categoriasUnicas = [...new Set(mockProducts.map((p) => p.categoria))];
  for (const nome of categoriasUnicas) {
    const [row] = await db.insert(productCategories).values({ nome }).returning();
    categoriaIdByNome.set(nome, row.id);
  }

  // Estoque não é uma coluna fixa no produto — o saldo é sempre derivado da
  // soma dos stock_movements por stock_location, então o seed cria um
  // movimento de tipo "inventario" para registrar o saldo inicial de cada
  // produto no estoque central, em vez de uma quantidade solta na tabela.
  const [central] = await db
    .insert(stockLocations)
    .values({ storeId: null, nome: "Estoque central" })
    .returning();

  for (const p of mockProducts) {
    const [row] = await db
      .insert(products)
      .values({
        nome: p.nome,
        categoriaId: categoriaIdByNome.get(p.categoria),
        unidadeCompra: p.unidadeCompra,
        unidadeConsumo: p.unidadeConsumo,
        fatorConversao: p.fatorConversao.toString(),
        estoqueMin: p.estoqueMin.toString(),
        custoMedio: p.custoMedio.toString(),
        custoUltimaCompra: p.custoMedio.toString(),
      })
      .returning();

    await db.insert(stockMovements).values({
      productId: row.id,
      stockLocationId: central.id,
      tipo: "inventario",
      quantidade: p.estoqueCentral.toString(),
      quantidadeAnterior: "0",
      quantidadeNova: p.estoqueCentral.toString(),
      custoUnitario: p.custoMedio.toString(),
      motivo: "Saldo inicial (seed)",
    });
  }

  for (const s of mockStores) {
    await db.insert(stockLocations).values({
      storeId: storeIdByMockId.get(s.id),
      nome: `Estoque — ${s.nome}`,
    });
  }

  // ---------- Fichas técnicas (a partir da planilha real do cliente) ----------

  const insumoIdByNome = new Map<string, string>();
  for (const insumo of insumos) {
    const [row] = await db
      .insert(products)
      .values({
        nome: insumo.nome,
        unidadeCompra: insumo.unidadeConsumo,
        unidadeConsumo: insumo.unidadeConsumo,
        fatorConversao: "1",
        custoMedio: insumo.custoMedio.toString(),
        custoUltimaCompra: insumo.custoMedio.toString(),
      })
      .returning();
    insumoIdByNome.set(insumo.nome, row.id);
  }

  for (const storeId of storeIdByMockId.values()) {
    for (const item of itensCardapio) {
      const [menuItem] = await db
        .insert(menuItems)
        .values({
          storeId,
          nome: item.nome,
          categoria: item.categoria,
          precoVenda: item.precoVenda.toString(),
        })
        .returning();

      const [recipe] = await db
        .insert(recipeVersions)
        .values({
          menuItemId: menuItem.id,
          versao: 1,
          custoTotalCalculado: item.custoTotalCalculado.toString(),
        })
        .returning();

      for (const ing of item.ingredientes) {
        const produtoId = insumoIdByNome.get(ing.produtoNome);
        if (!produtoId) continue;
        await db.insert(recipeIngredients).values({
          recipeVersionId: recipe.id,
          productId: produtoId,
          quantidade: ing.quantidade.toString(),
          unidade: ing.unidade,
        });
      }
    }
  }

  // ---------- Despesas: categorias padrão ----------

  const categoriasDespesa: { nome: string; tipoDre: string }[] = [
    { nome: "Aluguel", tipoDre: "despesa_operacional" },
    { nome: "Energia", tipoDre: "despesa_operacional" },
    { nome: "Água", tipoDre: "despesa_operacional" },
    { nome: "Internet/Telefone", tipoDre: "despesa_operacional" },
    { nome: "Salários", tipoDre: "despesa_operacional" },
    { nome: "Marketing", tipoDre: "despesa_operacional" },
    { nome: "Manutenção", tipoDre: "despesa_operacional" },
    { nome: "Contador/Sistema", tipoDre: "despesa_operacional" },
    { nome: "Impostos", tipoDre: "despesa_operacional" },
    { nome: "Taxas Bancárias/Juros", tipoDre: "despesa_financeira" },
    { nome: "Outras", tipoDre: "despesa_operacional" },
  ];
  await db.insert(expenseCategories).values(categoriasDespesa);

  console.log(
    `Seed concluído: 1 empresa, ${mockStores.length} lojas, ${mockProducts.length} produtos de estoque, ` +
      `${insumos.length} insumos, ${itensCardapio.length} itens de cardápio (x${storeIdByMockId.size} lojas), ` +
      `${categoriasDespesa.length} categorias de despesa.`
  );
  process.exit(0);
}

main().catch((err) => {
  console.error("Erro ao rodar o seed:", err);
  process.exit(1);
});
