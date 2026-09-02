import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Directorio de miembros",
  description: "Directorio de contactos con información personal protegida.",
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
    <html lang="es" data-theme="corporate">
      <body className="antialiased">{children}</body>
    </html>
  );
}
