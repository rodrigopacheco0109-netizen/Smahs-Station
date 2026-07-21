import { getEstoqueCentral } from "@/server/actions/stock";
import { EstoqueTabs } from "@/components/estoque-tabs";

// Lê do banco a cada request — não pode ser pré-renderizada em build,
// senão o estoque ficaria congelado no momento do build.
export const dynamic = "force-dynamic";

export default async function EstoquePage() {
  const central = await getEstoqueCentral();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Estoque</h1>
        <p className="text-sm text-neutral-500">Estoque central e contagens por loja</p>
      </div>

      <EstoqueTabs central={central} />
    </div>
  );
}
