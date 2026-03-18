import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { LangProvider } from "./components/LangProvider";
import { AuthProvider } from "./components/AuthProvider";
import AuthLayout from "./components/AuthLayout";
import PWAInstall from "./components/PWAInstall";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Borderly",
    template: "%s | Borderly",
  },
  description:
    "Connect across borders. A community platform for foreigners, refugees, and locals in Japan.",
  keywords: [
    "community",
    "japan",
    "foreigners",
    "refugees",
    "meetup",
    "partners",
    "help",
  ],
  icons: {
    icon: "/BORDERLY3.png",
    apple: "/BORDERLY3.png",
  },
  openGraph: {
    title: "Borderly",
    description:
      "Connect across borders. A community platform for foreigners, refugees, and locals in Japan.",
    siteName: "Borderly",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#F7FAFF" />
        <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem("borderly-theme")==="dark")document.documentElement.classList.add("dark")}catch(e){}` }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ background: "var(--bg-snow)", color: "var(--deep-navy)" }}
      >
        <LangProvider>
          <AuthProvider>
            <AuthLayout>{children}</AuthLayout>
            <PWAInstall />
          </AuthProvider>
        </LangProvider>
      </body>
    </html>
  );
}
