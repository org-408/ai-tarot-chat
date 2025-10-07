import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import type { ReactNode } from "react";
import { createQueryPersister } from "../../lib/repositories/query-persist";
import { queryClient } from "../../lib/services/queryClient";

/**
 * Persister インスタンス（シングルトン）
 */
const persister = createQueryPersister();

interface QueryProviderProps {
  children: ReactNode;
}

/**
 * React Query Provider
 * - キャッシュの永続化対応
 * - プラットフォーム別の最適化
 */
export function QueryProvider({ children }: QueryProviderProps) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 24 * 60 * 60 * 1000, // 24時間
        buster: "", // アプリバージョンアップ時にキャッシュクリアする場合は設定
        dehydrateOptions: {
          // 永続化するクエリを制限してサイズを抑える
          shouldDehydrateQuery: (query) => {
            // エラー状態のクエリは永続化しない
            if (query.state.status !== "success") {
              return false;
            }

            // マスターデータのみ永続化（他のクエリは除外）
            const queryKey = query.queryKey[0];
            return queryKey === "masters" || queryKey === "usage";
          },
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
