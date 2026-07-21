import { AlertTriangle, Info, AlertCircle } from "lucide-react";
import type { ReactElement } from "react";

type Nivel = "informativo" | "atencao" | "importante" | "critico";

const styles: Record<Nivel, { bg: string; border: string; icon: ReactElement; text: string }> = {
  informativo: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-800",
    icon: <Info size={16} className="text-blue-600" />,
  },
  atencao: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-800",
    icon: <AlertCircle size={16} className="text-amber-600" />,
  },
  importante: {
    bg: "bg-orange-50",
    border: "border-orange-200",
    text: "text-orange-800",
    icon: <AlertTriangle size={16} className="text-orange-600" />,
  },
  critico: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-800",
    icon: <AlertTriangle size={16} className="text-red-600" />,
  },
};

export function AlertItem({
  nivel,
  titulo,
  descricao,
}: {
  nivel: Nivel;
  titulo: string;
  descricao: string;
}) {
  const s = styles[nivel];
  return (
    <div className={`flex gap-3 rounded-lg border ${s.border} ${s.bg} p-3`}>
      <div className="mt-0.5">{s.icon}</div>
      <div>
        <p className={`text-sm font-medium ${s.text}`}>{titulo}</p>
        <p className="mt-0.5 text-sm text-neutral-600">{descricao}</p>
      </div>
    </div>
  );
}
