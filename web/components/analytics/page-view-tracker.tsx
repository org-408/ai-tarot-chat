"use client";

import {
  getPageCategory,
  getPageName,
  getPlatformIntent,
  getUtmParams,
  normalizePathname,
  trackEvent,
} from "@/lib/client/analytics/ga";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) {
      return;
    }

    trackEvent("page_view", {
      page_name: getPageName(pathname),
      page_category: getPageCategory(pathname),
      channel: "web",
      platform_intent: getPlatformIntent(pathname),
      page_path: normalizePathname(pathname),
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
      ...getUtmParams(searchParams),
    });
  }, [pathname, searchParams]);

  return null;
}
