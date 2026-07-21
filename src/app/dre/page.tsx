"use client";

import { useState } from "react";
import { dreMensal } from "@/lib/mock-data";
import { calcularDre, cmvPercentual, formatBRL, formatPercent, type DreInput } from "@/lib/calculations";
import { PrototypeNotice } from "@/components/prototype-notice";

type Escopo = "consolidado" | "club" | "dom";

const escopos: { id: Escopo; label: string }[] = [
  { id: "consolidado", label: "Consolidado" },
  { id: "club", label: "Smash Station Club" },
  { id: "dom", label: "Smash Station Dom" },
];

function somarDre(a: DreInput, b: DreInput): DreInput {
  return {
    receitaBruta: a.receitaBruta + b.receitaBruta,
    deducoes: a.deducoes + b.deducoes,
    custosVariaveis: a.custosVariaveis + b.custosVariaveis,
    despesasOperacionais: a.despesasOperacionais + b.despesasOperacionais,
    despesasFinanceiras: a.despesasFinanceiras + b.despesasFinanceiras,
  };
}

export default function DrePage() {
  const [escopo, setEscopo] = useState<Escopo>("consolidado");

  const input =
    escopo === "consolidado" ? somarDre(dreMensal.club, dreMensal.dom) : dreMensal[escopo];
  const dre = calcularDre(input);
  const cmv = cmvPercentual(dre.custosVariaveis, dre.receitaLiquida);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">DRE</h1>
        <p className="text-sm text-neutral-500">Demonstrativo de resultado do mês — julho de 2026</p>
      </div>

      <PrototypeNotice>
        DRE ainda não está ligado ao banco — os valores abaixo são dados de exemplo.
      </PrototypeNotice>

      <div className="flex gap-1 border-b border-neutral-200">
        {escopos.map((e) => (
          <button
            key={e.id}
            onClick={() => setEscopo(e.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              escopo === e.id
                ? "border-orange-600 text-orange-700"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {e.label}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-xs font-medium text-neutral-500">CMV</p>
          <p className="mt-1.5 text-2xl font-semibold text-neutral-900">{formatPercent(cmv)}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-xs font-medium text-neutral-500">Resultado operacional</p>
          <p
            className={`mt-1.5 text-2xl font-semibold ${
              dre.resultadoOperacional >= 0 ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {formatBRL(dre.resultadoOperacional)}
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-xs font-medium text-neutral-500">Lucro líquido</p>
          <p
            className={`mt-1.5 text-2xl font-semibold ${
              dre.lucroLiquido >= 0 ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {formatBRL(dre.lucroLiquido)}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <dl className="divide-y divide-neutral-100 text-sm">
          <Linha label="Receita bruta" valor={dre.receitaBruta} />
          <Linha label="(-) Deduções" valor={-dre.deducoes} />
          <Linha label="(=) Receita líquida" valor={dre.receitaLiquida} destaque />
          <Linha label="(-) Custos variáveis (CMV)" valor={-dre.custosVariaveis} />
          <Linha label="(=) Lucro bruto" valor={dre.lucroBruto} destaque />
          <Linha label="(-) Despesas operacionais" valor={-dre.despesasOperacionais} />
          <Linha label="(=) Resultado operacional" valor={dre.resultadoOperacional} destaque />
          <Linha label="(-) Despesas financeiras" valor={-dre.despesasFinanceiras} />
          <Linha label="(=) Lucro líquido" valor={dre.lucroLiquido} destaque final />
        </dl>
      </div>
    </div>
  );
}

function Linha({
  label,
  valor,
  destaque,
  final,
}: {
  label: string;
  valor: number;
  destaque?: boolean;
  final?: boolean;
}) {
  const cor = valor < 0 ? "text-red-600" : destaque ? "text-neutral-900" : "text-neutral-600";
  return (
    <div className={`flex justify-between py-2.5 ${final ? "pt-3 border-t-2 border-neutral-200" : ""}`}>
      <dt className={destaque ? "font-medium text-neutral-900" : "text-neutral-500"}>{label}</dt>
      <dd className={`${destaque ? "font-semibold" : "font-medium"} ${cor}`}>{formatBRL(valor)}</dd>
    </div>
  );
}
