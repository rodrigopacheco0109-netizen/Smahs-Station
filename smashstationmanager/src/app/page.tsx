import { StatCard } from "@/components/stat-card";
import { AlertItem } from "@/components/alert-item";
import { PrototypeNotice } from "@/components/prototype-notice";
import { alertas, dreMensal } from "@/lib/mock-data";
import { calcularDre, formatBRL, formatPercent, cmvPercentual } from "@/lib/calculations";

export default function DashboardPage() {
  const club = calcularDre(dreMensal.club);
  const dom = calcularDre(dreMensal.dom);
  const consolidado = calcularDre({
    receitaBruta: dreMensal.club.receitaBruta + dreMensal.dom.receitaBruta,
    deducoes: dreMensal.club.deducoes + dreMensal.dom.deducoes,
    custosVariaveis: dreMensal.club.custosVariaveis + dreMensal.dom.custosVariaveis,
    despesasOperacionais: dreMensal.club.despesasOperacionais + dreMensal.dom.despesasOperacionais,
    despesasFinanceiras: dreMensal.club.despesasFinanceiras + dreMensal.dom.despesasFinanceiras,
  });

  const cmvConsolidado = cmvPercentual(consolidado.custosVariaveis, consolidado.receitaLiquida);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Visão geral</h1>
        <p className="text-sm text-neutral-500">Resumo consolidado das duas lojas — julho de 2026</p>
      </div>

      <PrototypeNotice>
        Este resumo (vendas, DRE e alertas) ainda é calculado sobre dados de exemplo — Lojas e
        Estoque central já usam o banco real.
      </PrototypeNotice>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Venda do mês" value={formatBRL(consolidado.receitaBruta)} hint="Club + Dom" />
        <StatCard
          label="Lucro líquido estimado"
          value={formatBRL(consolidado.lucroLiquido)}
          tone={consolidado.lucroLiquido >= 0 ? "positive" : "negative"}
        />
        <StatCard
          label="CMV"
          value={formatPercent(cmvConsolidado)}
          hint={`De cada R$ 100 vendidos, ~R$ ${cmvConsolidado.toFixed(0)} viram custo de ingredientes`}
        />
        <StatCard label="Estoque com divergência" value="1 crítico" tone="negative" hint="Batata — Smash Station Club" />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-sm font-medium text-neutral-900 mb-3">Smash Station Club</p>
          <dl className="space-y-2 text-sm">
            <Row label="Venda do mês" value={formatBRL(club.receitaBruta)} />
            <Row label="Lucro estimado" value={formatBRL(club.lucroLiquido)} tone={club.lucroLiquido >= 0 ? "positive" : "negative"} />
            <Row label="CMV" value={formatPercent(cmvPercentual(club.custosVariaveis, club.receitaLiquida))} />
          </dl>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <p className="text-sm font-medium text-neutral-900 mb-3">Smash Station Dom</p>
          <dl className="space-y-2 text-sm">
            <Row label="Venda do mês" value={formatBRL(dom.receitaBruta)} />
            <Row label="Lucro estimado" value={formatBRL(dom.lucroLiquido)} tone={dom.lucroLiquido >= 0 ? "positive" : "negative"} />
            <Row label="CMV" value={formatPercent(cmvPercentual(dom.custosVariaveis, dom.receitaLiquida))} />
          </dl>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-neutral-900 mb-3">Alertas importantes</p>
        <div className="space-y-2">
          {alertas.map((a, i) => (
            <AlertItem key={i} nivel={a.nivel} titulo={a.titulo} descricao={a.descricao} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "positive" | "negative" }) {
  const color = tone === "positive" ? "text-emerald-600" : tone === "negative" ? "text-red-600" : "text-neutral-900";
  return (
    <div className="flex justify-between">
      <dt className="text-neutral-500">{label}</dt>
      <dd className={`font-medium ${color}`}>{value}</dd>
    </div>
  );
}
