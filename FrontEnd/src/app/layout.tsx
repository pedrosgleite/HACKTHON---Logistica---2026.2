import type { Metadata } from "next";
import "./globals.css";
import { ReactBitsTacticalBackground } from "@/components/ReactBitsTacticalBackground";

export const metadata: Metadata = {
  title: "ARGOS IA LOGISTIC | Sistema Integrado de Inteligência Logística v3.0",
  description: "Plataforma Tática de Torre de Controle Logística, Triagem XML/NF-e, Romaneios, Portaria OCR e 10 Docas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="antialiased selection:bg-cyan-500/30 selection:text-cyan-200 bg-[#04080f]">
        <ReactBitsTacticalBackground />
        <div className="relative z-10 min-h-screen">{children}</div>
      </body>
    </html>
  );
}
