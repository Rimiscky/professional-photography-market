import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Objectif — Photographies d’auteur",
  description: "Découvrez et achetez des photographies professionnelles directement auprès de leurs créateurs.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className="antialiased">{children}</body>
    </html>
  );
}
