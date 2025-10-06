import { useQuery } from '@tanstack/react-query';
import { masterService } from '../services/master';
import type { MasterData } from '../../../../shared/lib/types';

/**
 * マスターデータ取得フック
 * - 24時間キャッシュ
 * - バックグラウンド自動更新
 */
export function useMaster(refresh: boolean = true) {
  return useQuery<MasterData>({
    queryKey: ['masters', refresh],
    queryFn: async () => {
      console.log('[useMaster] Fetching master data...');
      const data = await masterService.getMasterData();
      console.log('[useMaster] Master data fetched:', data);
      return data;
    },
    enabled: refresh, // 認証初期化後に実行
    staleTime: 24 * 60 * 60 * 1000, // 24時間
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7日間
    retry: 3, // マスターデータは重要なので3回リトライ
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}