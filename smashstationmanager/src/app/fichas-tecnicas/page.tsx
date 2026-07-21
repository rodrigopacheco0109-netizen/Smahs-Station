import { menuItems, stores } from "@/lib/mock-data";
import {
  cmvPercentual,
  margemContribuicaoPercentual,
  margemContribuicaoReais,
  formatBRL,
  formatPercent,
} from "@/lib/calculations";
import { PrototypeNotice } from "@/components/prototype-notice";

export default function FichasTecnicasPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Fichas técnicas</h1>
        <p className="text-sm text-neutral-500">Custo, margem e CMV calculados por produto do cardápio</p>
      </div>

      <PrototypeNotice>
        Fichas técnicas ainda não estão ligadas ao banco — os itens abaixo são dados de exemplo.
      </PrototypeNotice>

      <div className="grid md:grid-cols-2 gap-4">
        {menuItems.map((item) => {
          const store = stores.find((s) => s.id === item.storeId);
          const margemReais = margemContribuicaoReais(item.precoVenda, item.custoIngredientes);
          const margemPercent = margemContribuicaoPercentual(item.precoVenda, item.custoIngredientes);
          const cmv = cmvPercentual(item.custoIngredientes, item.precoVenda);

          return (
            <div key={item.id} className="rounded-xl border border-neutral-200 bg-white p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-neutral-900">{item.nome}</p>
                  <p className="text-xs text-neutral-500">{store?.nome ?? item.storeId}</p>
                </div>
                <p className="text-lg font-semibold text-neutral-900">{formatBRL(item.precoVenda)}</p>
              </div>

              <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
                <div className="rounded-lg bg-neutral-50 p-2.5">
                  <dt className="text-xs text-neutral-500">Custo ingredientes</dt>
                  <dd className="font-medium text-neutral-900">{formatBRL(item.custoIngredientes)}</dd>
                </div>
                <div className="rounded-lg bg-neutral-50 p-2.5">
                  <dt className="text-xs text-neutral-500">Margem</dt>
                  <dd className="font-medium text-emerald-600">
                    {formatBRL(margemReais)} ({formatPercent(margemPercent)})
                  </dd>
                </div>
                <div className="rounded-lg bg-neutral-50 p-2.5">
                  <dt className="text-xs text-neutral-500">CMV</dt>
                  <dd className="font-medium text-neutral-900">{formatPercent(cmv)}</dd>
                </div>
              </dl>

              <div className="mt-4 pt-4 border-t border-neutral-100">
                <p className="text-xs font-medium text-neutral-500 mb-2">Ingredientes</p>
                <ul className="space-y-1 text-sm text-neutral-600">
                  {item.ingredientes.map((ing, i) => (
                    <li key={i} className="flex justify-between">
                      <span>{ing.produto}</span>
                      <span className="text-neutral-400">
                        {ing.quantidade} {ing.unidade}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
