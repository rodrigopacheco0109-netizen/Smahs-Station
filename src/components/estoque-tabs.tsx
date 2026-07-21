"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { stockCountByStore, stores } from "@/lib/mock-data";
import { diferencaEstoquePercentual, formatPercent } from "@/lib/calculations";
import { PrototypeNotice } from "@/components/prototype-notice";
import type { CentralStockItem } from "@/server/actions/stock";

type Tab = "central" | "club" | "dom";

const tabs: { id: Tab; label: string }[] = [
  { id: "central", label: "Estoque central" },
  { id: "club", label: "Smash Station Club" },
  { id: "dom", label: "Smash Station Dom" },
];

function nivelDiferenca(diferencaPercentual: number): "ok" | "atencao" | "critico" {
  const abs = Math.abs(diferencaPercentual);
  if (abs <= 5) return "ok";
  if (abs <= 10) return "atencao";
  return "critico";
}

const nivelStyle = {
  ok: "bg-emerald-50 text-emerald-700",
  atencao: "bg-amber-50 text-amber-700",
  critico: "bg-red-50 text-red-700",
};

export function EstoqueTabs({ central }: { central: CentralStockItem[] }) {
  const [tab, setTab] = useState<Tab>("central");

  return (
    <div className="space-y-6">
      <div className="flex gap-1 border-b border-neutral-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? "border-orange-600 text-orange-700"
                : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "central" && <EstoqueCentral items={central} />}
      {tab === "club" && <ContagemLoja storeId="club" />}
      {tab === "dom" && <ContagemLoja storeId="dom" />}
    </div>
  );
}

function EstoqueCentral({ items }: { items: CentralStockItem[] }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-100 text-left text-xs text-neutral-500">
            <th className="px-4 py-3 font-medium">Produto</th>
            <th className="px-4 py-3 font-medium">Categoria</th>
            <th className="px-4 py-3 font-medium text-right">Estoque</th>
            <th className="px-4 py-3 font-medium text-right">Mínimo</th>
            <th className="px-4 py-3 font-medium text-right">Custo médio</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((p) => {
            const abaixoMinimo = p.saldoAtual < p.estoqueMin;
            return (
              <tr key={p.id} className="border-b border-neutral-50 last:border-0">
                <td className="px-4 py-3 text-neutral-900">{p.nome}</td>
                <td className="px-4 py-3 text-neutral-500">{p.categoria ?? "—"}</td>
                <td className="px-4 py-3 text-right text-neutral-900">
                  {p.saldoAtual.toLocaleString("pt-BR")} {p.unidadeConsumo}
                </td>
                <td className="px-4 py-3 text-right text-neutral-500">
                  {p.estoqueMin.toLocaleString("pt-BR")} {p.unidadeConsumo}
                </td>
                <td className="px-4 py-3 text-right text-neutral-500">
                  {p.custoMedio !== null ? `R$ ${p.custoMedio.toFixed(3)} / ${p.unidadeConsumo}` : "—"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      abaixoMinimo ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {abaixoMinimo ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
                    {abaixoMinimo ? "Abaixo do mínimo" : "OK"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ContagemLoja({ storeId }: { storeId: keyof typeof stockCountByStore }) {
  const store = stores.find((s) => s.id === storeId);
  const contagens = stockCountByStore[storeId];

  return (
    <div className="space-y-3">
      <PrototypeNotice>
        Contagem de estoque por loja ainda não está ligada ao banco — os valores abaixo são dados de
        exemplo.
      </PrototypeNotice>
      <p className="text-sm text-neutral-500">
        Última contagem de estoque — {store?.nome ?? storeId}
      </p>
      <div className="rounded-xl border border-neutral-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 text-left text-xs text-neutral-500">
              <th className="px-4 py-3 font-medium">Produto</th>
              <th className="px-4 py-3 font-medium text-right">Esperado</th>
              <th className="px-4 py-3 font-medium text-right">Contado</th>
              <th className="px-4 py-3 font-medium text-right">Diferença</th>
              <th className="px-4 py-3 font-medium text-right">% Diferença</th>
            </tr>
          </thead>
          <tbody>
            {contagens.map((c, i) => {
              const diferenca = c.esperado - c.contado;
              const diferencaPercentual = diferencaEstoquePercentual(c.esperado, c.contado);
              const nivel = nivelDiferenca(diferencaPercentual);
              return (
                <tr key={i} className="border-b border-neutral-50 last:border-0">
                  <td className="px-4 py-3 text-neutral-900">{c.produto}</td>
                  <td className="px-4 py-3 text-right text-neutral-500">
                    {c.esperado.toLocaleString("pt-BR")} {c.unidade}
                  </td>
                  <td className="px-4 py-3 text-right text-neutral-500">
                    {c.contado.toLocaleString("pt-BR")} {c.unidade}
                  </td>
                  <td className="px-4 py-3 text-right text-neutral-500">
                    {diferenca.toLocaleString("pt-BR")} {c.unidade}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${nivelStyle[nivel]}`}>
                      {formatPercent(diferencaPercentual)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
