import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createQueryPersister } from '../../lib/repositories/query-persist';
import type { ReactNode } from 'react';

/**
 * React Query Client の設定
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // キャッシュの鮮度期間（この期間内は再取得しない）
      staleTime: 5 * 60 * 1000, // 5分
      
      // ガベージコレクション期間（この期間を過ぎるとキャッシュ削除）
      gcTime: 24 * 60 * 60 * 1000, // 24時間
      
      // エラー時のリトライ回数
      retry: 1,
      
      // ウィンドウフォーカス時の自動再取得を無効化
      refetchOnWindowFocus: false,
      
      // ネットワーク再接続時の自動再取得を有効化
      refetchOnReconnect: true,
    },
    mutations: {
      // ミューテーション失敗時のリトライ回数
      retry: 0,
    },
  },
});

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
        buster: '', // アプリバージョンアップ時にキャッシュクリアする場合は設定
        dehydrateOptions: {
          // 永続化するクエリを制限してサイズを抑える
          shouldDehydrateQuery: (query) => {
            // エラー状態のクエリは永続化しない
            if (query.state.status !== 'success') {
              return false;
            }
            
            // マスターデータのみ永続化（他のクエリは除外）
            const queryKey = query.queryKey[0];
            return queryKey === 'masters' || queryKey === 'usage';
          },
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}

/**
 * QueryClient をエクスポート（手動でクエリ操作する場合）
 */
export { queryClient };