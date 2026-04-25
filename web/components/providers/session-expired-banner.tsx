"use client";

import { Button } from "@/components/ui/button";
import { useClientStore } from "@/lib/client/stores/client-store";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";

export function SessionExpiredBanner() {
  const isSessionExpired = useClientStore((s) => s.isSessionExpired);
  const t = useTranslations("common");

  if (!isSessionExpired) return null;

  return (
    <div
      role="alert"
      className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-50 px-4 py-3 flex items-center justify-between gap-3 shadow-lg"
    >
      <p className="text-sm font-medium flex-1">{t("sessionExpiredMessage")}</p>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={() =>
          signIn(undefined, { callbackUrl: window.location.href })
        }
      >
        {t("signInAgain")}
      </Button>
    </div>
  );
}
