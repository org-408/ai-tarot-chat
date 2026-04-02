"use client";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export type AnalyticsEventParams = Record<string, string | number | boolean | null | undefined>;

const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export function isAnalyticsEnabled(): boolean {
  return Boolean(measurementId);
}

export function getMeasurementId(): string | undefined {
  return measurementId;
}

export function trackEvent(eventName: string, params: AnalyticsEventParams = {}) {
  if (!isAnalyticsEnabled() || typeof window === "undefined" || !window.gtag) {
    return;
  }

  window.gtag("event", eventName, params);
}

export function normalizePathname(pathname: string): string {
  if (pathname === "/") return "/";
  return pathname.replace(/\/+$/, "");
}

export function getPageName(pathname: string): string {
  const normalized = normalizePathname(pathname);

  switch (normalized) {
    case "/":
      return "landing";
    case "/pricing":
      return "pricing";
    case "/download":
      return "download";
    case "/auth/signin":
      return "signin";
    default:
      return normalized.replace(/^\//, "").replaceAll("/", "_") || "unknown";
  }
}

export function getPageCategory(pathname: string): string {
  const normalized = normalizePathname(pathname);

  if (normalized === "/" || normalized === "/pricing" || normalized === "/download") {
    return "marketing";
  }

  if (normalized.startsWith("/auth/")) {
    return "auth";
  }

  return "app";
}

export function getPlatformIntent(pathname: string): string {
  const normalized = normalizePathname(pathname);

  if (normalized === "/" || normalized === "/pricing" || normalized === "/download") {
    return "app";
  }

  return "web";
}

export function getEntryPoint(pathname: string): string {
  return getPageName(pathname);
}

export function getUtmParams(searchParams: URLSearchParams): AnalyticsEventParams {
  return {
    utm_source: searchParams.get("utm_source"),
    utm_medium: searchParams.get("utm_medium"),
    utm_campaign: searchParams.get("utm_campaign"),
    utm_content: searchParams.get("utm_content"),
    utm_term: searchParams.get("utm_term"),
  };
}
