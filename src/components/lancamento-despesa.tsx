"use client";

import { useState } from "react";
import { DespesaForm, type ValoresIniciaisDespesa } from "./despesa-form";
import { NotaFiscalUpload } from "./nota-fiscal-upload";
import type { CategoriaDespesa } from "@/server/actions/despesas";
import type { DadosExtraidosNotaFiscal } from "@/server/actions/nota-fiscal";

export function LancamentoDespesa({ categorias }: { categorias: CategoriaDespesa[] }) {
  const [dados, setDados] = useState<DadosExtraidosNotaFiscal | null>(null);
  const [versao, setVersao] = useState(0);

  function aoExtrair(novosDados: DadosExtraidosNotaFiscal) {
    setDados(novosDados);
    setVersao((v) => v + 1);
  }

  const valoresIniciais: ValoresIniciaisDespesa | undefined = dados
    ? {
        descricao: dados.fornecedor ? `${dados.fornecedor} — ${dados.descricao}` : dados.descricao,
        categoriaId: dados.categoriaId,
        valor: dados.valor,
        competencia: dados.dataEmissao?.slice(0, 7),
      }
    : undefined;

  return (
    <div className="space-y-4">
      <NotaFiscalUpload onExtraido={aoExtrair} />
      <DespesaForm
        key={versao}
        categorias={categorias}
        valoresIniciais={valoresIniciais}
        origem={dados ? "ocr_nota" : "manual"}
      />
    </div>
  );
}
