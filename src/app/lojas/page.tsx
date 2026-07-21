import { Store, MapPin, User, Clock } from "lucide-react";
import { stores, products, menuItems } from "@/lib/mock-data";

export default function LojasPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-neutral-900">Lojas</h1>
        <p className="text-sm text-neutral-500">Smash Station Club e Smash Station Dom</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {stores.map((store) => {
          const itensCardapio = menuItems.filter((m) => m.storeId === store.id).length;
          return (
            <div key={store.id} className="rounded-xl border border-neutral-200 bg-white p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-orange-50 p-2">
                    <Store size={18} className="text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900">{store.nome}</p>
                    <p className="text-xs text-neutral-500">Código: {store.codigoInterno}</p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    store.ativo ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"
                  }`}
                >
                  {store.ativo ? "Ativa" : "Inativa"}
                </span>
              </div>

              <dl className="mt-4 space-y-2 text-sm text-neutral-600">
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-neutral-400" />
                  <dt className="sr-only">Endereço</dt>
                  <dd>Endereço não cadastrado</dd>
                </div>
                <div className="flex items-center gap-2">
                  <User size={14} className="text-neutral-400" />
                  <dt className="sr-only">Responsável</dt>
                  <dd>Responsável não cadastrado</dd>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-neutral-400" />
                  <dt className="sr-only">Horário</dt>
                  <dd>Horário não cadastrado</dd>
                </div>
              </dl>

              <div className="mt-4 pt-4 border-t border-neutral-100 text-sm text-neutral-500">
                {itensCardapio} {itensCardapio === 1 ? "item" : "itens"} no cardápio
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <p className="text-sm font-medium text-neutral-900 mb-1">Estoque central</p>
        <p className="text-sm text-neutral-500">
          {products.length} produtos cadastrados no estoque compartilhado entre as lojas.
        </p>
      </div>
    </div>
  );
}
