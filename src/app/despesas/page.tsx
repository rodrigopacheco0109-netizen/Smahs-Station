import { getCategoriasDespesa, getDespesas } from "@/server/actions/despesas";
import { DespesaForm } from "@/components/despesa-form";
import { formatBRL } from "@/lib/calculations";

// Lê do banco a cada request — não pode ser pré-renderizada em build.
export const dynamic = "force-dynamic";

export default async function DespesasPage() {
  const [categorias, despesas] = await Promise.all([getCategoriasDespesa(), getDespesas()]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Despesas</h1>
        <p className="text-sm text-neutral-500">
          Lançamento único, sem vincular loja — a atribuição por loja vem do controle de estoque/transferências
        </p>
      </div>

      <DespesaForm categorias={categorias} />

      <div>
        <p className="text-sm font-medium text-neutral-900 mb-3">Despesas lançadas</p>
        {despesas.length === 0 ? (
          <p className="text-sm text-neutral-500">Nenhuma despesa lançada ainda.</p>
        ) : (
          <div className="rounded-xl border border-neutral-200 bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-left text-xs text-neutral-500">
                  <th className="px-4 py-3 font-medium">Descrição</th>
                  <th className="px-4 py-3 font-medium">Categoria</th>
                  <th className="px-4 py-3 font-medium">Competência</th>
                  <th className="px-4 py-3 font-medium text-right">Valor</th>
                  <th className="px-4 py-3 font-medium">Vencimento</th>
                  <th className="px-4 py-3 font-medium">Pagamento</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {despesas.map((d) => (
                  <tr key={d.id} className="border-b border-neutral-50 last:border-0">
                    <td className="px-4 py-3 text-neutral-900">{d.descricao}</td>
                    <td className="px-4 py-3 text-neutral-500">{d.categoriaNome}</td>
                    <td className="px-4 py-3 text-neutral-500">{d.competencia}</td>
                    <td className="px-4 py-3 text-right text-neutral-900">{formatBRL(d.valor)}</td>
                    <td className="px-4 py-3 text-neutral-500">{d.dataVencimento ?? "—"}</td>
                    <td className="px-4 py-3 text-neutral-500">{d.dataPagamento ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          d.status === "pago" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"
                        }`}
                      >
                        {d.status === "pago" ? "Pago" : "Pendente"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
