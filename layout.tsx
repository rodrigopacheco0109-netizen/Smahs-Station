import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";

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
          <main className="flex-1 px-4 py-6 md:px-8 md:py-8 max-w-6xl w-full mx-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
