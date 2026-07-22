"use client";

import { useState, useTransition } from "react";
import { criarDespesasEmLote, type CategoriaDespesa } from "@/server/actions/despesas";
import type { DadosExtraidosNotaFiscal } from "@/server/actions/nota-fiscal";

interface LinhaItem {
  descricao: string;
  categoriaId: string;
  valor: string;
  incluir: boolean;
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
      valor: item.valor.toFixed(2),
      incluir: true,
    })),
  );
  const [competencia, setCompetencia] = useState(dados.dataEmissao ? dados.dataEmissao.slice(0, 7) : "");
  const [dataVencimento, setDataVencimento] = useState("");
  const [dataPagamento, setDataPagamento] = useState("");
  const [formaPagamento, setFormaPagamento] = useState("");
  const [status, setStatus] = useState("pendente");
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function atualizarLinha(indice: number, campo: keyof LinhaItem, valor: string | boolean) {
    setLinhas((atual) => atual.map((linha, i) => (i === indice ? { ...linha, [campo]: valor } : linha)));
  }

  const quantidadeSelecionada = linhas.filter((l) => l.incluir).length;
  const totalSelecionado = linhas
    .filter((l) => l.incluir)
    .reduce((soma, l) => soma + (Number(l.valor.replace(",", ".")) || 0), 0);

  function salvar() {
    setErro(null);
    const selecionadas = linhas.filter((l) => l.incluir);
    if (selecionadas.length === 0) {
      setErro("Selecione ao menos um item.");
      return;
    }
    if (!competencia) {
      setErro("Informe a competência.");
      return;
    }
    startTransition(async () => {
      const resultado = await criarDespesasEmLote(
        selecionadas.map((l) => ({
          descricao: l.descricao,
          categoriaId: l.categoriaId,
          valor: Number(l.valor.replace(",", ".")),
        })),
        {
          competencia,
          dataVencimento: dataVencimento || null,
          dataPagamento: dataPagamento || null,
          formaPagamento: formaPagamento || null,
          status,
          origem: "ocr_nota",
        },
      );
      if (resultado.status === "erro") {
        setErro(resultado.mensagem);
        return;
      }
      onSalvo();
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

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 text-left text-xs text-neutral-500">
              <th className="py-2 pr-2 font-medium" />
              <th className="py-2 pr-2 font-medium">Descrição</th>
              <th className="py-2 pr-2 font-medium">Categoria</th>
              <th className="py-2 pr-2 font-medium text-right">Valor (R$)</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((linha, i) => (
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
                    className="w-full rounded-lg border border-neutral-200 px-2 py-1.5 text-sm"
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
                    type="number"
                    step="0.01"
                    value={linha.valor}
                    onChange={(e) => atualizarLinha(i, "valor", e.target.value)}
                    className="w-28 rounded-lg border border-neutral-200 px-2 py-1.5 text-right text-sm"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-right text-xs text-neutral-500">
        Total selecionado:{" "}
        <span className="font-medium text-neutral-900">R$ {totalSelecionado.toFixed(2).replace(".", ",")}</span>
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-500">Competência</label>
          <input
            type="month"
            value={competencia}
            onChange={(e) => setCompetencia(e.target.value)}
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-500">Vencimento</label>
          <input
            type="date"
            value={dataVencimento}
            onChange={(e) => setDataVencimento(e.target.value)}
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-500">Pagamento</label>
          <input
            type="date"
            value={dataPagamento}
            onChange={(e) => setDataPagamento(e.target.value)}
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-500">Forma de pagamento</label>
          <select
            value={formaPagamento}
            onChange={(e) => setFormaPagamento(e.target.value)}
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm"
          >
            <option value="">—</option>
            <option value="pix">Pix</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="cartao">Cartão</option>
            <option value="boleto">Boleto</option>
            <option value="transferencia">Transferência</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-500">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm"
          >
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="button"
            onClick={salvar}
            disabled={isPending || quantidadeSelecionada === 0}
            className="w-full rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {isPending ? "Salvando…" : `Lançar ${quantidadeSelecionada} despesa${quantidadeSelecionada === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>

      {erro && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
    </div>
  );
}
