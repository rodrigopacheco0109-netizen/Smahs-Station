import { getStores } from "@/server/actions/stores";
import { getImportacoes } from "@/server/actions/vendas";
import { VendasUpload } from "@/components/vendas-upload";

// Lê do banco a cada request — não pode ser pré-renderizada em build.
export const dynamic = "force-dynamic";

export default async function VendasPage() {
  const [lojas, importacoes] = await Promise.all([getStores(), getImportacoes()]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Vendas</h1>
        <p className="text-sm text-neutral-500">Importação semanal do relatório de vendas do PDV</p>
      </div>

      <VendasUpload lojas={lojas} />

      <div>
        <p className="text-sm font-medium text-neutral-900 mb-3">Importações anteriores</p>
        {importacoes.length === 0 ? (
          <p className="text-sm text-neutral-500">Nenhuma importação feita ainda.</p>
        ) : (
          <div className="rounded-xl border border-neutral-200 bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-left text-xs text-neutral-500">
                  <th className="px-4 py-3 font-medium">Arquivo</th>
                  <th className="px-4 py-3 font-medium">Loja</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {importacoes.map((imp) => (
                  <tr key={imp.id} className="border-b border-neutral-50 last:border-0">
                    <td className="px-4 py-3 text-neutral-900">{imp.arquivoNome}</td>
                    <td className="px-4 py-3 text-neutral-500">{imp.storeNome}</td>
                    <td className="px-4 py-3 text-neutral-500">{imp.status}</td>
                    <td className="px-4 py-3 text-neutral-500">{imp.criadoEm}</td>
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
