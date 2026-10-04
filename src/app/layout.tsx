import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Teman Les",
    template: "%s · Teman Les",
  },
  description:
    "Ruang kerja sederhana untuk mengatur kegiatan les dan komunikasi dengan orang tua.",
  applicationName: "Teman Les",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F7F8F3",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
