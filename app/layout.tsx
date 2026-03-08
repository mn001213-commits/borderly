import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Home, Users, Calendar, MessageCircle, User } from "lucide-react";
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
  title: "Borderly",
  description: "Community platform",
};

function BottomNav() {
  const item =
    "flex flex-col items-center justify-center gap-1 text-[11px] text-gray-400 transition";

  const active =
    "flex flex-col items-center justify-center gap-1 text-[11px] font-medium text-gray-900";

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto grid h-16 max-w-md grid-cols-5">

        <Link href="/" className={item}>
          <Home className="h-5 w-5" />
          Home
        </Link>

        <Link href="/ngo" className={item}>
          <Users className="h-5 w-5" />
          NGO
        </Link>

        <Link href="/meet" className={item}>
          <Calendar className="h-5 w-5" />
          Meet
        </Link>

        <Link href="/chats" className={item}>
          <MessageCircle className="h-5 w-5" />
          Chats
        </Link>

        <Link href="/profile" className={item}>
          <User className="h-5 w-5" />
          Profile
        </Link>

      </div>
    </nav>
  );
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 text-gray-900`}
      >
        <main className="min-h-screen pb-20">
          {children}
        </main>

        <BottomNav />
      </body>
    </html>
  );
}