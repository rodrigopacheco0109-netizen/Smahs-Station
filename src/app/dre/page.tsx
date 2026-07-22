import Link from "next/link";
import { getMesesDisponiveis, getDreReal, type EscopoDre } from "@/server/actions/dre";
import { getStores } from "@/server/actions/stores";
import { calcularDre, cmvPercentual, formatBRL, formatPercent } from "@/lib/calculations";

// Lê do banco a cada request — não pode ser pré-renderizada em build.
export const dynamic = "force-dynamic";

export default async function DrePage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; escopo?: string }>;
}) {
  const params = await searchParams;
  const [meses, lojas] = await Promise.all([getMesesDisponiveis(), getStores()]);

  if (meses.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-neutral-900">DRE</h1>
          <p className="text-sm text-neutral-500">Demonstrativo de resultado</p>
        </div>
        <p className="text-sm text-neutral-500">Ainda não há vendas nem despesas lançadas para calcular o DRE.</p>
      </div>
    );
  }

  const mesAno = params.mes && meses.some((m) => m.valor === params.mes) ? params.mes : meses[0].valor;
  const escopoParam = params.escopo ?? "consolidado";
  const escopo: EscopoDre =
    escopoParam === "consolidado" ? { tipo: "consolidado" } : { tipo: "loja", storeId: escopoParam };

  const dadosReais = await getDreReal(mesAno, escopo);
  const dre = calcularDre(dadosReais);
  const cmv = cmvPercentual(dre.custosVariaveis, dre.receitaLiquida);
  const mesLabel = meses.find((m) => m.valor === mesAno)?.label ?? mesAno;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">DRE</h1>
        <p className="text-sm text-neutral-500">Demonstrativo de resultado — {mesLabel}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 border-b border-neutral-200">
          <AbaEscopo mes={mesAno} escopoAtual={escopoParam} escopoId="consolidado" label="Consolidado" />
          {lojas.map((loja) => (
            <AbaEscopo key={loja.id} mes={mesAno} escopoAtual={escopoParam} escopoId={loja.id} label={loja.nome} />
          ))}
        </div>

        <form method="GET" className="flex items-center gap-2">
          <input type="hidden" name="escopo" value={escopoParam} />
          <select name="mes" defaultValue={mesAno} className="rounded-lg border border-neutral-200 px-3 py-2 text-sm">
            {meses.map((m) => (
              <option key={m.valor} value={m.valor}>
                {m.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Ver
          </button>
        </form>
      </div>

      {dadosReais.avisoDespesas && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">⚠ {dadosReais.avisoDespesas}</p>
      )}

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

function AbaEscopo({
  mes,
  escopoAtual,
  escopoId,
  label,
}: {
  mes: string;
  escopoAtual: string;
  escopoId: string;
  label: string;
}) {
  const ativo = escopoAtual === escopoId;
  return (
    <Link
      href={`/dre?mes=${mes}&escopo=${escopoId}`}
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
        ativo ? "border-orange-600 text-orange-700" : "border-transparent text-neutral-500 hover:text-neutral-800"
      }`}
    >
      {label}
    </Link>
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
