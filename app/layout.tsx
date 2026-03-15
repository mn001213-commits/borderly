import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { LangProvider } from "./components/LangProvider";
import { AuthProvider } from "./components/AuthProvider";
import TopBar from "./components/TopBar";
import BottomNav from "./components/BottomNav";
import OnlineSidebar from "./components/OnlineSidebar";
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
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#F7FAFF" />
        <link rel="icon" href="/icons/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ background: "var(--bg-snow)", color: "var(--deep-navy)" }}
      >
        <LangProvider>
          <AuthProvider>
            <TopBar />

            <main className="min-h-screen pb-[80px] xl:mr-[340px]">
              {children}
            </main>

            <OnlineSidebar />
            <BottomNav />
            <PWAInstall />
          </AuthProvider>
        </LangProvider>
      </body>
    </html>
  );
}
