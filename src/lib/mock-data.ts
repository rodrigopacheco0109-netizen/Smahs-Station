// Dados de exemplo (modo protótipo). Substitua por consultas reais assim que
// o banco estiver conectado — a forma dos objetos já espelha o schema Drizzle.

export const stores = [
  { id: "club", nome: "Smash Station Club", codigoInterno: "CLUB", ativo: true },
  { id: "dom", nome: "Smash Station Dom", codigoInterno: "DOM", ativo: true },
];

export const products = [
  {
    id: "queijo",
    nome: "Queijo cheddar fatiado",
    categoria: "Laticínios",
    unidadeCompra: "pacote (2,5kg)",
    unidadeConsumo: "g",
    fatorConversao: 2500,
    estoqueCentral: 12500, // g
    estoqueMin: 5000,
    custoMedio: 0.052, // por grama
    ultimaCompra: "2026-07-10",
  },
  {
    id: "carne",
    nome: "Blend de carne smash 90g",
    categoria: "Carnes",
    unidadeCompra: "caixa (5kg)",
    unidadeConsumo: "unidade (90g)",
    fatorConversao: 55,
    estoqueCentral: 620, // unidades
    estoqueMin: 200,
    custoMedio: 3.85,
    ultimaCompra: "2026-07-18",
  },
  {
    id: "batata",
    nome: "Batata pré-frita congelada",
    categoria: "Congelados",
    unidadeCompra: "pacote (2kg)",
    unidadeConsumo: "g",
    fatorConversao: 2000,
    estoqueCentral: 18000,
    estoqueMin: 6000,
    custoMedio: 0.018,
    ultimaCompra: "2026-07-15",
  },
  {
    id: "pao",
    nome: "Pão brioche",
    categoria: "Pães",
    unidadeCompra: "pacote (12un)",
    unidadeConsumo: "unidade",
    fatorConversao: 12,
    estoqueCentral: 480,
    estoqueMin: 150,
    custoMedio: 1.35,
    ultimaCompra: "2026-07-19",
  },
];

export const stockCountByStore = {
  club: [
    { produto: "Batata pré-frita congelada", esperado: 4200, contado: 3100, unidade: "g" },
    { produto: "Blend de carne smash 90g", esperado: 180, contado: 176, unidade: "un" },
    { produto: "Pão brioche", esperado: 96, contado: 96, unidade: "un" },
  ],
  dom: [
    { produto: "Batata pré-frita congelada", esperado: 3800, contado: 3750, unidade: "g" },
    { produto: "Queijo cheddar fatiado", esperado: 3200, contado: 3180, unidade: "g" },
  ],
};

export const menuItems = [
  {
    id: "smash-burger",
    storeId: "club",
    nome: "Smash Burger",
    precoVenda: 27.9,
    custoIngredientes: 9.85,
    ingredientes: [
      { produto: "Pão brioche", quantidade: 1, unidade: "un" },
      { produto: "Blend de carne smash 90g", quantidade: 2, unidade: "un" },
      { produto: "Queijo cheddar fatiado", quantidade: 40, unidade: "g" },
    ],
  },
  {
    id: "smash-bacon",
    storeId: "club",
    nome: "Smash Bacon",
    precoVenda: 34.9,
    custoIngredientes: 14.2,
    ingredientes: [
      { produto: "Pão brioche", quantidade: 1, unidade: "un" },
      { produto: "Blend de carne smash 90g", quantidade: 2, unidade: "un" },
      { produto: "Queijo cheddar fatiado", quantidade: 40, unidade: "g" },
    ],
  },
  {
    id: "smash-classico-dom",
    storeId: "dom",
    nome: "Smash Clássico",
    precoVenda: 24.9,
    custoIngredientes: 8.4,
    ingredientes: [
      { produto: "Pão brioche", quantidade: 1, unidade: "un" },
      { produto: "Blend de carne smash 90g", quantidade: 1, unidade: "un" },
      { produto: "Queijo cheddar fatiado", quantidade: 40, unidade: "g" },
    ],
  },
];

export const dreMensal = {
  club: {
    receitaBruta: 128500,
    deducoes: 14300,
    custosVariaveis: 46200,
    despesasOperacionais: 41800,
    despesasFinanceiras: 1200,
  },
  dom: {
    receitaBruta: 96200,
    deducoes: 9800,
    custosVariaveis: 31500,
    despesasOperacionais: 38200,
    despesasFinanceiras: 900,
  },
};

export const alertas = [
  {
    nivel: "critico" as const,
    titulo: "Divergência de estoque — Batata (Smash Station Club)",
    descricao:
      "Esperado 4.200g, contado 3.100g. Diferença de 1.100g (≈26%). Possíveis causas: desperdício, porção maior que o previsto na ficha técnica, ou venda não importada.",
  },
  {
    nivel: "atencao" as const,
    titulo: "CMV acima da média — Smash Station Dom",
    descricao: "CMV do mês está em 34%, acima da média histórica de 29% para esta loja.",
  },
  {
    nivel: "informativo" as const,
    titulo: "Fornecedor de queijo aumentou o preço",
    descricao: "Custo médio subiu de R$ 0,048/g para R$ 0,052/g nos últimos 30 dias (+8,3%).",
  },
];
