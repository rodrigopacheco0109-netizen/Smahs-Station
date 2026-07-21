// Funções puras — sem I/O, sem banco. Isso permite reaproveitá-las tanto
// para dados reais quanto para o simulador de cenários (v2), conforme
// descrito na seção 21 do documento de planejamento.

export function cmvPercentual(custoIngredientesVendidos: number, receitaLiquida: number): number {
  if (receitaLiquida <= 0) return 0;
  return (custoIngredientesVendidos / receitaLiquida) * 100;
}

export function margemContribuicaoReais(precoVenda: number, custoVariavelUnitario: number): number {
  return precoVenda - custoVariavelUnitario;
}

export function margemContribuicaoPercentual(precoVenda: number, custoVariavelUnitario: number): number {
  if (precoVenda <= 0) return 0;
  return (margemContribuicaoReais(precoVenda, custoVariavelUnitario) / precoVenda) * 100;
}

export function precoMinimo(custoVariavelUnitario: number, margemMinimaDesejadaPercentual: number): number {
  const margem = margemMinimaDesejadaPercentual / 100;
  if (margem >= 1) return Infinity;
  return custoVariavelUnitario / (1 - margem);
}

export function pontoDeEquilibrioReais(custosFixos: number, margemContribuicaoMediaPercentual: number): number {
  if (margemContribuicaoMediaPercentual <= 0) return Infinity;
  return custosFixos / (margemContribuicaoMediaPercentual / 100);
}

export function faturamentoParaMeta(
  custosFixos: number,
  metaLucro: number,
  margemContribuicaoMediaPercentual: number
): number {
  if (margemContribuicaoMediaPercentual <= 0) return Infinity;
  return (custosFixos + metaLucro) / (margemContribuicaoMediaPercentual / 100);
}

export function diferencaEstoquePercentual(esperado: number, contado: number): number {
  if (esperado <= 0) return 0;
  return ((esperado - contado) / esperado) * 100;
}

export interface DreInput {
  receitaBruta: number;
  deducoes: number;
  custosVariaveis: number;
  despesasOperacionais: number;
  despesasFinanceiras: number;
}

export interface DreResult extends DreInput {
  receitaLiquida: number;
  lucroBruto: number;
  resultadoOperacional: number;
  lucroLiquido: number;
}

export function calcularDre(input: DreInput): DreResult {
  const receitaLiquida = input.receitaBruta - input.deducoes;
  const lucroBruto = receitaLiquida - input.custosVariaveis;
  const resultadoOperacional = lucroBruto - input.despesasOperacionais;
  const lucroLiquido = resultadoOperacional - input.despesasFinanceiras;
  return { ...input, receitaLiquida, lucroBruto, resultadoOperacional, lucroLiquido };
}

export function formatBRL(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatPercent(valor: number, casasDecimais = 1): string {
  return `${valor.toFixed(casasDecimais)}%`;
}
