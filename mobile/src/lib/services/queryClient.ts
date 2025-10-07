import { QueryClient } from "@tanstack/react-query";

/**
 * React Query Client の設定
 */
export const queryClient = new QueryClient({
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
