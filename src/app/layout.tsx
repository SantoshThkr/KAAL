import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond } from "next/font/google";
import "./globals.css";

const serif = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "400", "500"], variable: "--font-serif", display: "swap" });

export const metadata: Metadata = {
  title: "KAAL: The Many Forms of Krishna",
  description: "An animated film about Krishna, played in the browser.",
  applicationName: "KAAL"
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
  viewportFit: "cover"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={serif.variable}>
      <body>
        {children}
        <noscript>KAAL is a film that needs JavaScript and WebGL 2 to play.</noscript>
      </body>
    </html>
  );
}
