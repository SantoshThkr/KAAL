import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Tiro_Devanagari_Sanskrit } from "next/font/google";
import "./globals.css";

const serif = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "400", "500"], variable: "--font-serif", display: "swap" });
// Designed for Sanskrit: conjuncts and vowel signs stay legible at any size.
const devanagari = Tiro_Devanagari_Sanskrit({ subsets: ["devanagari", "latin"], weight: "400", variable: "--font-devanagari", display: "swap" });

export const metadata: Metadata = {
  title: "KAAL: The Many Forms of Krishna",
  description: "An animated short about Krishna: Vrindavan, the flute, and the many forms of time.",
  applicationName: "KAAL"
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
  viewportFit: "cover"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${serif.variable} ${devanagari.variable}`}>
      <body>
        {children}
        <noscript>KAAL is a film that needs JavaScript and WebGL 2 to play.</noscript>
      </body>
    </html>
  );
}
