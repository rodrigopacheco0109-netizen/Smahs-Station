import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

export function PrototypeNotice({ children }: { children?: ReactNode }) {
  return (
    <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
      <AlertTriangle size={14} className="mt-0.5 shrink-0" />
      <span>
        {children ??
          "Modo protótipo — esta tela mostra dados de exemplo, nada aqui está salvo em banco."}
      </span>
    </div>
  );
}
