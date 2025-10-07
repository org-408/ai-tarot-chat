import { useQuery } from '@tanstack/react-query';
import { masterService } from '../services/master';
import type { MasterData } from '../../../../shared/lib/types';

/**
 * マスターデータ取得フック
 * - 24時間キャッシュ
 * - バックグラウンド自動更新
 * - forceRefetch=true で強制再取得
 */
export function useMaster(refresh: boolean = true, forceRefetch: boolean = false) {
  return useQuery<MasterData>({
    queryKey: ['masters', refresh, forceRefetch],
    queryFn: async () => {
      console.log('[useMaster] Fetching master data...', { forceRefetch });
      const data = await masterService.getMasterData();
      console.log('[useMaster] Master data fetched:', data);
      return data;
    },
    enabled: refresh, // 認証初期化後に実行
    staleTime: forceRefetch ? 0 : 24 * 60 * 60 * 1000, // 強制取得時はキャッシュを無効化
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7日間
    retry: 3, // マスターデータは重要なので3回リトライ
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    // 強制再取得時はマウント時に必ず再取得
    refetchOnMount: forceRefetch ? 'always' : false,
  });
}