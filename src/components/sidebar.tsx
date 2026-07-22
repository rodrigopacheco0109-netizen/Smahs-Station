"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Store,
  Boxes,
  ClipboardList,
  ShoppingCart,
  Wallet,
  Receipt,
  FileBarChart,
  Bell,
} from "lucide-react";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/lojas", label: "Lojas", icon: Store },
  { href: "/estoque", label: "Estoque", icon: Boxes },
  { href: "/fichas-tecnicas", label: "Fichas técnicas", icon: ClipboardList },
  { href: "/vendas", label: "Vendas", icon: ShoppingCart },
  { href: "/despesas", label: "Despesas", icon: Wallet },
  { href: "/dre", label: "DRE", icon: Receipt },
  { href: "/relatorios", label: "Relatórios", icon: FileBarChart },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col border-r border-neutral-200 bg-white">
      <div className="px-5 py-5 border-b border-neutral-100">
        <p className="text-sm font-semibold text-neutral-900">Smash Station</p>
        <p className="text-xs text-neutral-500">Manager · protótipo</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-orange-50 text-orange-700 font-medium"
                  : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
              }`}
            >
              <Icon size={17} strokeWidth={2} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 py-4 border-t border-neutral-100">
        <Link
          href="/alertas"
          className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-50"
        >
          <Bell size={17} />
          Central de alertas
        </Link>
      </div>
    </aside>
  );
}
