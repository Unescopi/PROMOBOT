import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/contexts/AppContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PromoBot - Sistema de Marketing para WhatsApp",
  description: "Sistema de marketing e promoções para cafeteria via WhatsApp",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <AppProvider>
          <div className="min-h-screen bg-gray-100 text-gray-900">
            {children}
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
