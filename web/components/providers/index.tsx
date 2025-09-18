"use client";

import { ReactNode } from "react";
import { MasterInitializer } from "./master-initializer";
import { QueryProvider } from "./query-provider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      {/* Zustandストアのマスタデータを初期化 */}
      <MasterInitializer />
      {children}
    </QueryProvider>
  );
}
