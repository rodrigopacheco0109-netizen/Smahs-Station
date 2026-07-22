"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DespesaForm } from "./despesa-form";
import { NotaFiscalUpload } from "./nota-fiscal-upload";
import { ItensNotaFiscalForm } from "./itens-nota-fiscal-form";
import type { CategoriaDespesa, LojaParaRateio } from "@/server/actions/despesas";
import type { DadosExtraidosNotaFiscal } from "@/server/actions/nota-fiscal";

export function LancamentoDespesa({ categorias, lojas }: { categorias: CategoriaDespesa[]; lojas: LojaParaRateio[] }) {
  const router = useRouter();
  const [dados, setDados] = useState<DadosExtraidosNotaFiscal | null>(null);
  const [sucesso, setSucesso] = useState(false);

  return (
    <div className="space-y-4">
      <NotaFiscalUpload
        onExtraido={(d) => {
          setDados(d);
          setSucesso(false);
        }}
      />
      {sucesso ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-sm font-medium text-emerald-800">Despesas lançadas com sucesso.</p>
          <button
            type="button"
            onClick={() => {
              setDados(null);
              setSucesso(false);
            }}
            className="mt-3 rounded-lg border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-800"
          >
            Lançar outra nota
          </button>
        </div>
      ) : dados ? (
        <ItensNotaFiscalForm
          dados={dados}
          categorias={categorias}
          onCancelar={() => setDados(null)}
          onSalvo={() => {
            setSucesso(true);
            router.refresh();
          }}
        />
      ) : (
        <DespesaForm categorias={categorias} lojas={lojas} />
      )}
    </div>
  );
}
