"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DespesaForm } from "./despesa-form";
import { NotaFiscalUpload } from "./nota-fiscal-upload";
import { ItensNotaFiscalForm } from "./itens-nota-fiscal-form";
import type { CategoriaDespesa } from "@/server/actions/despesas";
import type { DadosExtraidosNotaFiscal } from "@/server/actions/nota-fiscal";

export function LancamentoDespesa({ categorias }: { categorias: CategoriaDespesa[] }) {
  const router = useRouter();
  const [dados, setDados] = useState<DadosExtraidosNotaFiscal | null>(null);

  return (
    <div className="space-y-4">
      <NotaFiscalUpload onExtraido={setDados} />
      {dados ? (
        <ItensNotaFiscalForm
          dados={dados}
          categorias={categorias}
          onCancelar={() => setDados(null)}
          onSalvo={() => {
            setDados(null);
            router.refresh();
          }}
        />
      ) : (
        <DespesaForm categorias={categorias} />
      )}
    </div>
  );
}
