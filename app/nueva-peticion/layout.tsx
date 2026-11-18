import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nueva petición de oración",
  description: "Formulario público para compartir una petición de oración.",
};

export default function NewPrayerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
