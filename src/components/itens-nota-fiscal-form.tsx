"use client";

import { useState, useTransition } from "react";
import { criarDespesasEmLote, type CategoriaDespesa } from "@/server/actions/despesas";
import type { DadosExtraidosNotaFiscal } from "@/server/actions/nota-fiscal";

interface LinhaItem {
  descricao: string;
  categoriaId: string;
  quantidade: string;
  unidade: string;
  valorUnitario: string;
  medidaValor: string;
  medidaTipo: "kg" | "l" | "";
  unidadesPorCaixa: string;
  incluir: boolean;
}

function paraNumero(valor: string): number {
  const n = Number(valor.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function formatarNumero(n: number): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 3 });
}

export function ItensNotaFiscalForm({
  dados,
  categorias,
  onCancelar,
  onSalvo,
}: {
  dados: DadosExtraidosNotaFiscal;
  categorias: CategoriaDespesa[];
  onCancelar: () => void;
  onSalvo: () => void;
}) {
  const [linhas, setLinhas] = useState<LinhaItem[]>(
    dados.itens.map((item) => ({
      descricao: item.descricao,
      categoriaId: item.categoriaId,
      quantidade: item.quantidade.toString(),
      unidade: item.unidade,
      valorUnitario: item.valorUnitario.toFixed(2),
      medidaValor: item.medidaValorUnitario !== null ? item.medidaValorUnitario.toString() : "",
      medidaTipo: item.medidaUnidade ?? "",
      unidadesPorCaixa: item.unidadesPorCaixa !== null ? item.unidadesPorCaixa.toString() : "",
      incluir: true,
    })),
  );
  const [dataNota, setDataNota] = useState(dados.dataEmissao ?? "");
  const [numeroNota, setNumeroNota] = useState(dados.numeroNota ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function atualizarLinha(indice: number, campo: keyof LinhaItem, valor: string | boolean) {
    setLinhas((atual) => atual.map((linha, i) => (i === indice ? { ...linha, [campo]: valor } : linha)));
  }

  const linhasCalculadas = linhas.map((linha) => {
    const quantidade = paraNumero(linha.quantidade);
    const valorUnitario = paraNumero(linha.valorUnitario);
    const valorTotal = quantidade * valorUnitario;
    const medidaValor = linha.medidaValor === "" ? null : paraNumero(linha.medidaValor);
    const unidadesPorCaixa = linha.unidadesPorCaixa === "" ? null : paraNumero(linha.unidadesPorCaixa);
    const totalPacotes = unidadesPorCaixa !== null ? unidadesPorCaixa * quantidade : null;
    // medida unitária x pacotes por caixa x caixas pedidas (ou só x quantidade, se não vendido em caixa)
    const medidaTotal = medidaValor !== null ? medidaValor * (totalPacotes ?? quantidade) : null;
    return { ...linha, quantidade, valorUnitario, valorTotal, medidaValor, medidaTotal, unidadesPorCaixa, totalPacotes };
  });

  const selecionadas = linhasCalculadas.filter((l) => l.incluir);
  const totalValorSelecionado = selecionadas.reduce((soma, l) => soma + l.valorTotal, 0);
  const totalKgSelecionado = selecionadas
    .filter((l) => l.medidaTipo === "kg")
    .reduce((soma, l) => soma + (l.medidaTotal ?? 0), 0);
  const totalLSelecionado = selecionadas
    .filter((l) => l.medidaTipo === "l")
    .reduce((soma, l) => soma + (l.medidaTotal ?? 0), 0);

  function salvar() {
    setErro(null);
    if (selecionadas.length === 0) {
      setErro("Selecione ao menos um item.");
      return;
    }
    if (!dataNota) {
      setErro("Informe a data da nota.");
      return;
    }
    startTransition(async () => {
      try {
        const sufixoNota = numeroNota ? ` — NF ${numeroNota}` : "";
        const resultado = await criarDespesasEmLote(
          selecionadas.map((l) => ({
            descricao: `${l.descricao} — ${formatarNumero(l.quantidade)} ${l.unidade}${
              l.unidadesPorCaixa !== null ? ` (${formatarNumero(l.unidadesPorCaixa)} un./cx)` : ""
            } x R$ ${l.valorUnitario.toFixed(2).replace(".", ",")}${sufixoNota}`,
            categoriaId: l.categoriaId,
            valor: l.valorTotal,
          })),
          {
            competencia: dataNota.slice(0, 7),
            dataVencimento: null,
            dataPagamento: null,
            formaPagamento: null,
            status: "pendente",
            origem: "ocr_nota",
          },
        );
        if (resultado.status === "erro") {
          setErro(resultado.mensagem);
          return;
        }
        onSalvo();
      } catch (err) {
        setErro(err instanceof Error ? err.message : "Erro ao salvar as despesas.");
      }
    });
  }

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-neutral-900">Itens lidos da nota fiscal</p>
          <p className="text-xs text-neutral-500">
            {dados.fornecedor ? `Fornecedor: ${dados.fornecedor} — ` : ""}revise cada item antes de lançar
          </p>
        </div>
        <button type="button" onClick={onCancelar} className="shrink-0 text-xs text-neutral-500 hover:text-neutral-800">
          Cancelar e lançar manualmente
        </button>
      </div>

      {dados.avisoDivergencia && (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">⚠ {dados.avisoDivergencia}</p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 text-left text-xs text-neutral-500">
              <th className="py-2 pr-2 font-medium" />
              <th className="py-2 pr-2 font-medium">Descrição</th>
              <th className="py-2 pr-2 font-medium">Categoria</th>
              <th className="py-2 pr-2 font-medium">Tipo</th>
              <th className="py-2 pr-2 font-medium text-right">Qtd</th>
              <th className="py-2 pr-2 font-medium text-right">Un./cx</th>
              <th className="py-2 pr-2 font-medium text-right">Total un.</th>
              <th className="py-2 pr-2 font-medium text-right">V. unit. (R$)</th>
              <th className="py-2 pr-2 font-medium text-right">V. total (R$)</th>
              <th className="py-2 pr-2 font-medium text-right">Peso/vol. unit.</th>
              <th className="py-2 pr-2 font-medium text-right">Total (kg/L)</th>
            </tr>
          </thead>
          <tbody>
            {linhasCalculadas.map((linha, i) => (
              <tr key={i} className="border-b border-neutral-50 last:border-0">
                <td className="py-2 pr-2">
                  <input
                    type="checkbox"
                    checked={linha.incluir}
                    onChange={(e) => atualizarLinha(i, "incluir", e.target.checked)}
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    type="text"
                    value={linha.descricao}
                    onChange={(e) => atualizarLinha(i, "descricao", e.target.value)}
                    className="w-40 rounded-lg border border-neutral-200 px-2 py-1.5 text-sm"
                  />
                </td>
                <td className="py-2 pr-2">
                  <select
                    value={linha.categoriaId}
                    onChange={(e) => atualizarLinha(i, "categoriaId", e.target.value)}
                    className="w-full rounded-lg border border-neutral-200 px-2 py-1.5 text-sm"
                  >
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="py-2 pr-2">
                  <input
                    type="text"
                    value={linha.unidade}
                    onChange={(e) => atualizarLinha(i, "unidade", e.target.value)}
                    className="w-16 rounded-lg border border-neutral-200 px-2 py-1.5 text-sm"
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    type="number"
                    step="0.001"
                    value={linhas[i].quantidade}
                    onChange={(e) => atualizarLinha(i, "quantidade", e.target.value)}
                    className="w-20 rounded-lg border border-neutral-200 px-2 py-1.5 text-right text-sm"
                  />
                </td>
                <td className="py-2 pr-2">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="—"
                    value={linhas[i].unidadesPorCaixa}
                    onChange={(e) => atualizarLinha(i, "unidadesPorCaixa", e.target.value)}
                    className="w-20 rounded-lg border border-neutral-200 px-2 py-1.5 text-right text-sm"
                  />
                </td>
                <td className="py-2 pr-2 text-right text-neutral-500">
                  {linha.totalPacotes !== null ? formatarNumero(linha.totalPacotes) : "—"}
                </td>
                <td className="py-2 pr-2">
                  <input
                    type="number"
                    step="0.01"
                    value={linhas[i].valorUnitario}
                    onChange={(e) => atualizarLinha(i, "valorUnitario", e.target.value)}
                    className="w-24 rounded-lg border border-neutral-200 px-2 py-1.5 text-right text-sm"
                  />
                </td>
                <td className="py-2 pr-2 text-right text-neutral-900">{formatarNumero(linha.valorTotal)}</td>
                <td className="py-2 pr-2">
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.001"
                      placeholder="—"
                      value={linhas[i].medidaValor}
                      onChange={(e) => atualizarLinha(i, "medidaValor", e.target.value)}
                      className="w-16 rounded-lg border border-neutral-200 px-2 py-1.5 text-right text-sm"
                    />
                    <select
                      value={linhas[i].medidaTipo}
                      onChange={(e) => atualizarLinha(i, "medidaTipo", e.target.value)}
                      className="rounded-lg border border-neutral-200 px-1 py-1.5 text-xs"
                    >
                      <option value="">—</option>
                      <option value="kg">kg</option>
                      <option value="l">L</option>
                    </select>
                  </div>
                </td>
                <td className="py-2 pr-2 text-right text-neutral-500">
                  {linha.medidaTotal !== null ? `${formatarNumero(linha.medidaTotal)} ${linha.medidaTipo}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-right text-xs text-neutral-500">
        Total selecionado: <span className="font-medium text-neutral-900">R$ {formatarNumero(totalValorSelecionado)}</span>
        {totalKgSelecionado > 0 && (
          <>
            {" · "}
            <span className="font-medium text-neutral-900">{formatarNumero(totalKgSelecionado)} kg</span>
          </>
        )}
        {totalLSelecionado > 0 && (
          <>
            {" · "}
            <span className="font-medium text-neutral-900">{formatarNumero(totalLSelecionado)} L</span>
          </>
        )}
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-500">Data da nota</label>
          <input
            type="date"
            value={dataNota}
            onChange={(e) => setDataNota(e.target.value)}
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-500">Número da nota</label>
          <input
            type="text"
            value={numeroNota}
            onChange={(e) => setNumeroNota(e.target.value)}
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-end sm:col-span-2 lg:col-span-2">
          <button
            type="button"
            onClick={salvar}
            disabled={isPending || selecionadas.length === 0}
            className="w-full rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {isPending ? "Salvando…" : `Lançar ${selecionadas.length} despesa${selecionadas.length === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>

      {erro && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
    </div>
  );
}
