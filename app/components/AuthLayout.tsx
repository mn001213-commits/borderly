"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "./AuthProvider";
import TopBar from "./TopBar";
import BottomNav from "./BottomNav";
import OnlineSidebar from "./OnlineSidebar";
import NotificationToast from "./NotificationToast";

const PUBLIC_PATHS = ["/login", "/signup", "/reset-password", "/update-password"];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isPublicPage = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const showFullLayout = !!user && !isPublicPage;

  // Redirect to login if not authenticated and not on a public page
  useEffect(() => {
    if (!loading && !user && !isPublicPage) {
      router.replace("/login");
    }
  }, [loading, user, isPublicPage, router]);

  // Show nothing while checking auth or redirecting
  if (!loading && !user && !isPublicPage) {
    return null;
  }

  return (
    <>
      {!isPublicPage && <TopBar />}

      <main className={`min-h-screen ${isPublicPage ? "" : "pt-[60px] pb-[80px]"} ${showFullLayout ? "xl:mr-[340px]" : ""}`}>
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
