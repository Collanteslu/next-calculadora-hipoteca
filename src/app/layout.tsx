import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://calculadora-hipoteca.vercel.app"),
  title: "Calculadora de Amortización de Hipoteca | Simulador Financiero",
  description:
    "Calcula la amortización de tu hipoteca con el sistema francés. Simula pagos adicionales, compara reducir cuota vs plazo, y obtén una tabla detallada mes a mes. Gratuito y sin registro.",
  keywords: [
    "amortización",
    "hipoteca",
    "calculadora hipoteca",
    "sistema francés",
    "simulador hipotecario",
    "tabla amortización",
    "calcular cuota hipoteca",
  ],
  authors: [{ name: "Calculadora Hipoteca" }],
  robots: { index: true, follow: true },
  alternates: {
    canonical: "https://calculadora-hipoteca.vercel.app",
  },
  openGraph: {
    title: "Calculadora de Amortización de Hipoteca",
    description:
      "Simula la amortización de tu hipoteca con pagos adicionales y obtén una tabla detallada.",
    type: "website",
    locale: "es_ES",
    siteName: "Calculadora de Amortización de Hipoteca",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Calculadora de Amortización de Hipoteca",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Calculadora de Amortización de Hipoteca",
    description:
      "Simula la amortización de tu hipoteca con pagos adicionales.",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>

      </body>
    </html>
  );
}
