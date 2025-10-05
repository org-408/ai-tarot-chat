import { useQuery } from '@tanstack/react-query';
import { syncService } from '../services/sync';
import type { MasterData } from '../../../../shared/lib/types';

/**
 * マスターデータ取得フック
 * - 24時間キャッシュ
 * - バックグラウンド自動更新
 */
export function useMaster() {
  return useQuery<MasterData>({
    queryKey: ['masters'],
    queryFn: async () => {
      console.log('[useMaster] Fetching master data...');
      const data = await syncService.getMasterData();
      console.log('[useMaster] Master data fetched:', {
        plans: data.plans?.length,
        categories: data.categories?.length,
        spreads: data.spreads?.length,
      });
      return data;
    },
    staleTime: 24 * 60 * 60 * 1000, // 24時間
    gcTime: 7 * 24 * 60 * 60 * 1000, // 7日間
    retry: 3, // マスターデータは重要なので3回リトライ
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}