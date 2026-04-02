"use client";

import { getUtmParams, trackEvent } from "@/lib/client/analytics/ga";
import Link, { LinkProps } from "next/link";
import { PropsWithChildren } from "react";

type TrackedLinkProps = PropsWithChildren<
  LinkProps & {
    className?: string;
    placement: string;
    ctaName: string;
    pageName: string;
    targetType?: string;
    planCode?: string;
  }
>;

export function TrackedLink({
  children,
  placement,
  ctaName,
  pageName,
  targetType = "navigation",
  planCode,
  href,
  ...props
}: TrackedLinkProps) {
  const hrefValue = typeof href === "string" ? href : href.pathname ?? "";
  const targetPath = typeof hrefValue === "string" ? hrefValue : "";

  const handleClick = () => {
    const searchParams =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
    const platformIntent =
      targetPath === "/auth/signin" || targetPath.startsWith("/auth/")
        ? "web"
        : targetPath === "/" || targetPath === "/pricing" || targetPath === "/download"
          ? "app"
          : "unknown";

    trackEvent("cta_click", {
      page_name: pageName,
      placement,
      cta_name: ctaName,
      target_path: targetPath,
      target_type: targetType,
      plan_code: planCode ?? null,
      platform_intent: platformIntent,
      ...getUtmParams(searchParams),
    });
  };

  return (
    <Link {...props} href={href} onClick={handleClick}>
      {children}
    </Link>
  );
}
