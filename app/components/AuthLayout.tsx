"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "./AuthProvider";
import TopBar from "./TopBar";
import BottomNav from "./BottomNav";
import OnlineSidebar from "./OnlineSidebar";
import NotificationToast from "./NotificationToast";
import GuideTour from "./GuideTour";

const PUBLIC_PATHS = ["/login", "/signup", "/reset-password", "/update-password", "/onboarding"];
// Pages viewable without login (don't redirect, but also don't show full chrome)
const GUEST_VIEWABLE_PATHS = ["/"];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, needsOnboarding } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isPublicPage = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isGuestViewable = GUEST_VIEWABLE_PATHS.some((p) => pathname === p);
  const isOnboardingPage = pathname.startsWith("/onboarding");
  const isChatRoom = /^\/chats\/[^/]+$/.test(pathname);
  const showFullLayout = !!user && !isPublicPage;
  const hideChrome = isPublicPage || isChatRoom;

  // Redirect to login if not authenticated and not on a public or guest-viewable page
  useEffect(() => {
    if (!loading && !user && !isPublicPage && !isGuestViewable) {
      router.replace("/login");
    }
  }, [loading, user, isPublicPage, isGuestViewable, router]);

  // Redirect to onboarding if profile is incomplete
  useEffect(() => {
    if (!loading && user && needsOnboarding && !isOnboardingPage) {
      router.replace("/onboarding");
    }
  }, [loading, user, needsOnboarding, isOnboardingPage, router]);

  // Show nothing while checking auth or redirecting (but not for guest-viewable pages)
  if (!loading && !user && !isPublicPage && !isGuestViewable) {
    return null;
  }

  return (
    <>
      {!hideChrome && <TopBar />}

      <main className={`min-h-screen ${hideChrome ? "" : "pt-14 pb-[72px]"} ${showFullLayout && !isChatRoom ? "xl:mr-[340px]" : ""}`}>
        {children}
      </main>

      {showFullLayout && !isChatRoom && (
        <>
          <OnlineSidebar />
          <BottomNav />
          <GuideTour />
        </>
      )}

      {!!user && <NotificationToast />}
    </>
  );
}
