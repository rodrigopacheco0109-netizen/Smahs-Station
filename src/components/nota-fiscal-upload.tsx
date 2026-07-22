"use client";

import { useState, useTransition } from "react";
import { lerNotaFiscal, type DadosExtraidosNotaFiscal } from "@/server/actions/nota-fiscal";

export function NotaFiscalUpload({ onExtraido }: { onExtraido: (dados: DadosExtraidosNotaFiscal) => void }) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function lerArquivo() {
    if (!arquivo) return;
    setErro(null);
    const formData = new FormData();
    formData.set("nota", arquivo);
    startTransition(async () => {
      const resultado = await lerNotaFiscal(formData);
      if (resultado.status === "erro") {
        setErro(resultado.mensagem);
        return;
      }
      onExtraido(resultado.dados);
    });
  }

  return (
    <div className="rounded-xl border border-dashed border-orange-300 bg-orange-50/40 p-5">
      <p className="text-sm font-medium text-neutral-900 mb-1">Lançar por foto da nota fiscal (IA)</p>
      <p className="text-xs text-neutral-500 mb-3">
        Envie uma foto ou PDF da nota — a IA preenche descrição, valor e categoria no formulário abaixo para você
        revisar antes de salvar.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
        <button
          type="button"
          onClick={lerArquivo}
          disabled={!arquivo || isPending}
          className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? "Lendo nota…" : "Ler nota com IA"}
        </button>
      </div>
      {erro && <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{erro}</p>}
    </div>
  );
}
