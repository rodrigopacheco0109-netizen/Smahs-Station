import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { isPrototypeMode } from "@/server/db";

export const metadata: Metadata = {
  title: "Smash Station Manager",
  description: "Gestão de estoque, custos, vendas e DRE para hamburguerias",
  manifest: "/manifest.json",
};

export const viewport = {
  themeColor: "#ea580c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex bg-neutral-50 font-sans">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {isPrototypeMode && (
            <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-xs font-medium text-amber-800">
              Nenhum banco conectado — todas as telas mostram dados de exemplo. Conecte um Postgres
              real (veja o README) para começar a usar dados de verdade.
            </div>
          )}
          <main className="flex-1 px-4 py-6 md:px-8 md:py-8 max-w-6xl w-full mx-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
