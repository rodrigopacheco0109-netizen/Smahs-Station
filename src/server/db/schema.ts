import {
  pgTable,
  uuid,
  text,
  numeric,
  timestamp,
  boolean,
  jsonb,
  integer,
} from "drizzle-orm/pg-core";

/**
 * Schema núcleo do MVP (seção 11 do documento de planejamento).
 * Módulos de v1/v2 (funcionários, faturas de cartão, alertas, IA, cenários)
 * serão adicionados como novas migrations quando entrarmos nessas fases,
 * sem precisar alterar o que já existe aqui.
 */

// ---------- Núcleo: empresas, lojas, usuários, permissões ----------

export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  nome: text("nome").notNull(),
  cnpjMatriz: text("cnpj_matriz"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const stores = pgTable("stores", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id).notNull(),
  nome: text("nome").notNull(),
  codigoInterno: text("codigo_interno").notNull(),
  endereco: text("endereco"),
  cnpj: text("cnpj"),
  responsavel: text("responsavel"),
  horarioFuncionamento: text("horario_funcionamento"),
  centroCusto: text("centro_custo"),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const roles = pgTable("roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  nome: text("nome").notNull(), // proprietario, admin, gerente, financeiro, estoquista, funcionario, contador
  permissoes: jsonb("permissoes").notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  nome: text("nome").notNull(),
  email: text("email").notNull().unique(),
  telefone: text("telefone"),
  ativo: boolean("ativo").default(true).notNull(),
  twoFaEnabled: boolean("two_fa_enabled").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userStoreRoles = pgTable("user_store_roles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  storeId: uuid("store_id").references(() => stores.id).notNull(),
  roleId: uuid("role_id").references(() => roles.id).notNull(),
});

// ---------- Estoque e produtos ----------

export const productCategories = pgTable("product_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  nome: text("nome").notNull(),
  categoriaPaiId: uuid("categoria_pai_id"),
});

export const suppliers = pgTable("suppliers", {
  id: uuid("id").defaultRandom().primaryKey(),
  nome: text("nome").notNull(),
  razaoSocial: text("razao_social"),
  cnpj: text("cnpj"),
  telefone: text("telefone"),
  email: text("email"),
  condicoesPagamento: text("condicoes_pagamento"),
  prazoEntregaDias: integer("prazo_entrega_dias"),
});

export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  codigoInterno: text("codigo_interno"),
  categoriaId: uuid("categoria_id").references(() => productCategories.id),
  marca: text("marca"),
  fornecedorPrincipalId: uuid("fornecedor_principal_id").references(() => suppliers.id),
  unidadeCompra: text("unidade_compra").notNull(), // kg, l, unidade, pacote, caixa...
  unidadeConsumo: text("unidade_consumo").notNull(), // g, ml, unidade
  fatorConversao: numeric("fator_conversao", { precision: 14, scale: 4 }).notNull(), // 1 unidade_compra = N unidade_consumo
  pesoVolumeEmbalagem: numeric("peso_volume_embalagem", { precision: 14, scale: 4 }),
  qtdPorPacote: numeric("qtd_por_pacote", { precision: 14, scale: 4 }),
  rendimentoPorPacote: numeric("rendimento_por_pacote", { precision: 14, scale: 4 }),
  estoqueMin: numeric("estoque_min", { precision: 14, scale: 4 }).default("0"),
  estoqueMax: numeric("estoque_max", { precision: 14, scale: 4 }),
  custoUltimaCompra: numeric("custo_ultima_compra", { precision: 14, scale: 4 }),
  custoMedio: numeric("custo_medio", { precision: 14, scale: 4 }),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const stockLocations = pgTable("stock_locations", {
  id: uuid("id").defaultRandom().primaryKey(),
  storeId: uuid("store_id").references(() => stores.id), // nulo = estoque central
  nome: text("nome").notNull(),
});

export const stockMovements = pgTable("stock_movements", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").references(() => products.id).notNull(),
  stockLocationId: uuid("stock_location_id").references(() => stockLocations.id).notNull(),
  tipo: text("tipo").notNull(), // compra, transferencia, venda, perda, descarte, ajuste, devolucao, consumo_interno, inventario, cancelamento
  quantidade: numeric("quantidade", { precision: 14, scale: 4 }).notNull(),
  quantidadeAnterior: numeric("quantidade_anterior", { precision: 14, scale: 4 }),
  quantidadeNova: numeric("quantidade_nova", { precision: 14, scale: 4 }),
  custoUnitario: numeric("custo_unitario", { precision: 14, scale: 4 }),
  motivo: text("motivo"),
  documentoRelacionadoTipo: text("documento_relacionado_tipo"),
  documentoRelacionadoId: uuid("documento_relacionado_id"),
  userId: uuid("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const stockTransfers = pgTable("stock_transfers", {
  id: uuid("id").defaultRandom().primaryKey(),
  origemStockLocationId: uuid("origem_stock_location_id").references(() => stockLocations.id).notNull(),
  destinoStockLocationId: uuid("destino_stock_location_id").references(() => stockLocations.id).notNull(),
  status: text("status").default("pendente").notNull(), // pendente, recebido, cancelado
  data: timestamp("data").defaultNow().notNull(),
  dataRecebimento: timestamp("data_recebimento"),
  userId: uuid("user_id").references(() => users.id),
  userRecebimentoId: uuid("user_recebimento_id").references(() => users.id),
  observacao: text("observacao"),
});

export const stockTransferItems = pgTable("stock_transfer_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  transferId: uuid("transfer_id").references(() => stockTransfers.id).notNull(),
  productId: uuid("product_id").references(() => products.id).notNull(),
  quantidade: numeric("quantidade", { precision: 14, scale: 4 }).notNull(),
  custoUnitario: numeric("custo_unitario", { precision: 14, scale: 4 }),
});

export const stockCounts = pgTable("stock_counts", {
  id: uuid("id").defaultRandom().primaryKey(),
  storeId: uuid("store_id").references(() => stores.id).notNull(),
  tipo: text("tipo").notNull(), // diaria, semanal, mensal, extraordinaria
  status: text("status").default("aberta").notNull(), // aberta, finalizada
  data: timestamp("data").defaultNow().notNull(),
  userId: uuid("user_id").references(() => users.id),
  observacao: text("observacao"),
});

export const stockCountItems = pgTable("stock_count_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  stockCountId: uuid("stock_count_id").references(() => stockCounts.id).notNull(),
  productId: uuid("product_id").references(() => products.id).notNull(),
  quantidadeEsperada: numeric("quantidade_esperada", { precision: 14, scale: 4 }),
  quantidadeContada: numeric("quantidade_contada", { precision: 14, scale: 4 }),
  diferenca: numeric("diferenca", { precision: 14, scale: 4 }),
  valorDiferenca: numeric("valor_diferenca", { precision: 14, scale: 4 }),
  fotoUrl: text("foto_url"),
});

// ---------- Fichas técnicas e vendas ----------

export const menuItems = pgTable("menu_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  storeId: uuid("store_id").references(() => stores.id).notNull(),
  nome: text("nome").notNull(),
  categoria: text("categoria"),
  precoVenda: numeric("preco_venda", { precision: 14, scale: 4 }).notNull(),
  ativo: boolean("ativo").default(true).notNull(),
});

export const recipeVersions = pgTable("recipe_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  menuItemId: uuid("menu_item_id").references(() => menuItems.id).notNull(),
  versao: integer("versao").notNull(),
  vigenteDe: timestamp("vigente_de").defaultNow().notNull(),
  vigenteAte: timestamp("vigente_ate"),
  custoTotalCalculado: numeric("custo_total_calculado", { precision: 14, scale: 4 }),
});

export const recipeIngredients = pgTable("recipe_ingredients", {
  id: uuid("id").defaultRandom().primaryKey(),
  recipeVersionId: uuid("recipe_version_id").references(() => recipeVersions.id).notNull(),
  productId: uuid("product_id").references(() => products.id).notNull(),
  quantidade: numeric("quantidade", { precision: 14, scale: 4 }).notNull(),
  unidade: text("unidade").notNull(),
});

export const salesChannels = pgTable("sales_channels", {
  id: uuid("id").defaultRandom().primaryKey(),
  nome: text("nome").notNull(), // balcão, salão, ifood, 99food, keeta...
  taxaPercentual: numeric("taxa_percentual", { precision: 6, scale: 3 }).default("0"),
  taxaFixa: numeric("taxa_fixa", { precision: 14, scale: 4 }).default("0"),
  comissao: numeric("comissao", { precision: 6, scale: 3 }).default("0"),
});

export const salesImports = pgTable("sales_imports", {
  id: uuid("id").defaultRandom().primaryKey(),
  storeId: uuid("store_id").references(() => stores.id).notNull(),
  arquivoNome: text("arquivo_nome").notNull(),
  hashArquivo: text("hash_arquivo").notNull().unique(),
  status: text("status").default("processando").notNull(),
  userId: uuid("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const salesOrders = pgTable("sales_orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  storeId: uuid("store_id").references(() => stores.id).notNull(),
  salesImportId: uuid("sales_import_id").references(() => salesImports.id),
  numeroPedido: text("numero_pedido"),
  data: timestamp("data").notNull(),
  canalId: uuid("canal_id").references(() => salesChannels.id),
  valorBruto: numeric("valor_bruto", { precision: 14, scale: 4 }).notNull(),
  desconto: numeric("desconto", { precision: 14, scale: 4 }).default("0"),
  acrescimo: numeric("acrescimo", { precision: 14, scale: 4 }).default("0"),
  formaPagamento: text("forma_pagamento"),
  cancelado: boolean("cancelado").default(false).notNull(),
});

export const salesOrderItems = pgTable("sales_order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  salesOrderId: uuid("sales_order_id").references(() => salesOrders.id).notNull(),
  menuItemId: uuid("menu_item_id").references(() => menuItems.id).notNull(),
  recipeVersionId: uuid("recipe_version_id").references(() => recipeVersions.id).notNull(),
  quantidade: numeric("quantidade", { precision: 14, scale: 4 }).notNull(),
  valorUnitario: numeric("valor_unitario", { precision: 14, scale: 4 }).notNull(),
  valorTotal: numeric("valor_total", { precision: 14, scale: 4 }).notNull(),
});

// ---------- Despesas e DRE ----------

export const expenseCategories = pgTable("expense_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  nome: text("nome").notNull(),
  tipoDre: text("tipo_dre").notNull(), // custo_variavel, despesa_operacional, despesa_financeira
});

export const expenses = pgTable("expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  descricao: text("descricao").notNull(),
  categoriaId: uuid("categoria_id").references(() => expenseCategories.id).notNull(),
  competencia: timestamp("competencia").notNull(),
  dataVencimento: timestamp("data_vencimento"),
  dataPagamento: timestamp("data_pagamento"),
  valor: numeric("valor", { precision: 14, scale: 4 }).notNull(),
  formaPagamento: text("forma_pagamento"),
  recorrencia: text("recorrencia"), // unica, mensal, etc.
  status: text("status").default("pendente").notNull(),
  documentoUrl: text("documento_url"),
  origem: text("origem").default("manual").notNull(), // manual, ocr_nota, ocr_fatura
});

export const expenseAllocations = pgTable("expense_allocations", {
  id: uuid("id").defaultRandom().primaryKey(),
  expenseId: uuid("expense_id").references(() => expenses.id).notNull(),
  storeId: uuid("store_id").references(() => stores.id).notNull(),
  percentual: numeric("percentual", { precision: 6, scale: 3 }),
  valor: numeric("valor", { precision: 14, scale: 4 }).notNull(),
  criterioRateio: text("criterio_rateio").notNull(), // percentual_fixo, faturamento, qtd_vendas, num_funcionarios, manual
});

export const dreSnapshots = pgTable("dre_snapshots", {
  id: uuid("id").defaultRandom().primaryKey(),
  storeId: uuid("store_id").references(() => stores.id), // nulo = consolidado
  competencia: text("competencia").notNull(), // formato YYYY-MM
  regime: text("regime").default("competencia").notNull(), // competencia, caixa
  receitaBruta: numeric("receita_bruta", { precision: 14, scale: 4 }).default("0"),
  deducoes: numeric("deducoes", { precision: 14, scale: 4 }).default("0"),
  receitaLiquida: numeric("receita_liquida", { precision: 14, scale: 4 }).default("0"),
  custosVariaveis: numeric("custos_variaveis", { precision: 14, scale: 4 }).default("0"),
  lucroBruto: numeric("lucro_bruto", { precision: 14, scale: 4 }).default("0"),
  despesasOperacionais: numeric("despesas_operacionais", { precision: 14, scale: 4 }).default("0"),
  resultadoOperacional: numeric("resultado_operacional", { precision: 14, scale: 4 }).default("0"),
  despesasFinanceiras: numeric("despesas_financeiras", { precision: 14, scale: 4 }).default("0"),
  lucroLiquido: numeric("lucro_liquido", { precision: 14, scale: 4 }).default("0"),
  geradoEm: timestamp("gerado_em").defaultNow().notNull(),
});
