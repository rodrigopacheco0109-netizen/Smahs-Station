"use client";

import { useActionState } from "react";
import { criarDespesa, type ResultadoDespesa } from "@/server/actions/despesas";
import type { CategoriaDespesa } from "@/server/actions/despesas";

async function acao(_anterior: ResultadoDespesa | null, formData: FormData): Promise<ResultadoDespesa> {
  try {
    return await criarDespesa(formData);
  } catch (err) {
    return { status: "erro", mensagem: err instanceof Error ? err.message : "Erro ao salvar a despesa." };
  }
}

export function DespesaForm({ categorias }: { categorias: CategoriaDespesa[] }) {
  const [resultado, formAction, isPending] = useActionState<ResultadoDespesa | null, FormData>(acao, null);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <p className="text-sm font-medium text-neutral-900 mb-4">Lançar despesa</p>
      <form action={formAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-2">
          <label htmlFor="descricao" className="text-xs font-medium text-neutral-500">
            Descrição
          </label>
          <input
            id="descricao"
            name="descricao"
            type="text"
            required
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="categoriaId" className="text-xs font-medium text-neutral-500">
            Categoria
          </label>
          <select
            id="categoriaId"
            name="categoriaId"
            required
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm"
          >
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="competencia" className="text-xs font-medium text-neutral-500">
            Competência
          </label>
          <input
            id="competencia"
            name="competencia"
            type="month"
            required
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="valor" className="text-xs font-medium text-neutral-500">
            Valor (R$)
          </label>
          <input
            id="valor"
            name="valor"
            type="number"
            step="0.01"
            min="0.01"
            required
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="dataVencimento" className="text-xs font-medium text-neutral-500">
            Vencimento
          </label>
          <input
            id="dataVencimento"
            name="dataVencimento"
            type="date"
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="dataPagamento" className="text-xs font-medium text-neutral-500">
            Pagamento
          </label>
          <input
            id="dataPagamento"
            name="dataPagamento"
            type="date"
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="formaPagamento" className="text-xs font-medium text-neutral-500">
            Forma de pagamento
          </label>
          <select
            id="formaPagamento"
            name="formaPagamento"
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
          <label htmlFor="status" className="text-xs font-medium text-neutral-500">
            Status
          </label>
          <select id="status" name="status" className="rounded-lg border border-neutral-200 px-3 py-2 text-sm">
            <option value="pendente">Pendente</option>
            <option value="pago">Pago</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={isPending}
            className="w-full rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {isPending ? "Salvando…" : "Lançar despesa"}
          </button>
        </div>
      </form>

      {resultado?.status === "erro" && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{resultado.mensagem}</p>
      )}
      {resultado?.status === "ok" && (
        <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Despesa lançada.</p>
      )}
    </div>
  );
}
