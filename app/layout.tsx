import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "KAAL — The Many Forms of Krishna",
  description: "An interactive cinematic meditation on transformation, sound and time."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
