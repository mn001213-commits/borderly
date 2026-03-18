"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import TopBar from "./TopBar";
import BottomNav from "./BottomNav";
import OnlineSidebar from "./OnlineSidebar";
import NotificationToast from "./NotificationToast";

const PUBLIC_PATHS = ["/login", "/signup", "/reset-password", "/update-password"];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  const isPublicPage = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const showFullLayout = !!user && !isPublicPage;

  return (
    <>
      <TopBar />

      <main className={`min-h-screen pt-[60px] pb-[80px] ${showFullLayout ? "xl:mr-[340px]" : ""}`}>
        {children}
      </main>

      {showFullLayout && (
        <>
          <OnlineSidebar />
          <BottomNav />
        </>
      )}

      {!!user && <NotificationToast />}
    </>
  );
}
