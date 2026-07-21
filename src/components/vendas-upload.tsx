"use client";

import { useActionState } from "react";
import { importarVendas, type ResultadoImportacao } from "@/server/actions/vendas";

type EstadoImportacao = ResultadoImportacao | { status: "erro"; mensagem: string } | null;

async function acao(_anterior: EstadoImportacao, formData: FormData): Promise<EstadoImportacao> {
  try {
    return await importarVendas(formData);
  } catch (err) {
    return { status: "erro", mensagem: err instanceof Error ? err.message : "Erro ao importar o arquivo." };
  }
}

export function VendasUpload({ lojas }: { lojas: { id: string; nome: string }[] }) {
  const [resultado, formAction, isPending] = useActionState<EstadoImportacao, FormData>(acao, null);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <p className="text-sm font-medium text-neutral-900 mb-1">Importar vendas (Excel)</p>
      <p className="text-xs text-neutral-500 mb-4">
        Relatório do PDV. Reenviar o mesmo arquivo não duplica — dias já importados são pulados
        automaticamente. Se o relatório não tiver data própria (ex: Smash Dom), informe a data de
        referência abaixo.
      </p>
      <form action={formAction} className="flex flex-col sm:flex-row gap-3 items-start sm:items-end flex-wrap">
        <div className="flex flex-col gap-1">
          <label htmlFor="storeId" className="text-xs font-medium text-neutral-500">
            Loja
          </label>
          <select
            id="storeId"
            name="storeId"
            required
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm"
          >
            {lojas.map((loja) => (
              <option key={loja.id} value={loja.id}>
                {loja.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="arquivo" className="text-xs font-medium text-neutral-500">
            Arquivo (.xlsx)
          </label>
          <input
            id="arquivo"
            name="arquivo"
            type="file"
            accept=".xlsx"
            required
            className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-orange-50 file:px-3 file:py-1.5 file:text-orange-700"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="dataReferencia" className="text-xs font-medium text-neutral-500">
            Data de referência (só p/ relatórios sem data)
          </label>
          <input
            id="dataReferencia"
            name="dataReferencia"
            type="date"
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? "Importando…" : "Importar"}
        </button>
      </form>

      {resultado && "status" in resultado && resultado.status === "erro" && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{resultado.mensagem}</p>
      )}
      {resultado && "status" in resultado && resultado.status === "duplicado" && (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Esse arquivo já foi importado antes (mesmo conteúdo) — nada foi alterado.
        </p>
      )}
      {resultado && "status" in resultado && resultado.status === "ok" && (
        <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <p>
            {resultado.diasImportados} {resultado.diasImportados === 1 ? "dia importado" : "dias importados"},{" "}
            {resultado.diasJaExistentes} já existiam ({resultado.totalLinhas} linhas de venda).
          </p>
          {resultado.produtosNovosCriados.length > 0 && (
            <p className="mt-1">
              {resultado.produtosNovosCriados.length} produto(s) novo(s) cadastrado(s) sem ficha técnica:{" "}
              {resultado.produtosNovosCriados.join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
