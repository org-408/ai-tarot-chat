"use client";

import { getEntryPoint, trackEvent } from "@/lib/client/analytics/ga";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export function SignInViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) {
      return;
    }

    trackEvent("signin_view", {
      entry_point: searchParams.get("from") ?? getEntryPoint(pathname),
      is_mobile_app: searchParams.get("isMobile") === "true",
      callback_url_present: Boolean(searchParams.get("callbackUrl")),
    });
  }, [pathname, searchParams]);

  return null;
}
