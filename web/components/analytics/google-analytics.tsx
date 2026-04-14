"use client";

import { useEffect } from "react";
import { getMeasurementId } from "@/lib/client/analytics/ga";

export function GoogleAnalytics() {
  const measurementId = getMeasurementId();

  useEffect(() => {
    if (!measurementId) return;

    // Load gtag.js script
    const script1 = document.createElement("script");
    script1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    script1.async = true;
    document.head.appendChild(script1);

    // Initialize gtag
    window.dataLayer = window.dataLayer || [];
    function gtag(...args: unknown[]) {
      window.dataLayer.push(args);
    }
    window.gtag = gtag as (...args: unknown[]) => void;
    gtag("js", new Date());
    gtag("config", measurementId, { send_page_view: false });

    return () => {
      document.head.removeChild(script1);
    };
  }, [measurementId]);

  return null;
}
