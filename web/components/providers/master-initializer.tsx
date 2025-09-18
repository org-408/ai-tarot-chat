"use client";

import { useMasterStore } from "@/lib/store/master-store";
import { useEffect } from "react";

export function MasterInitializer() {
  const fetchMasters = useMasterStore((state) => state.fetchMasters);

  useEffect(() => {
    fetchMasters();
  }, [fetchMasters]);

  return null; // 何もレンダリングしない
}
