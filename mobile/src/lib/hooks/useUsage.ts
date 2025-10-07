import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientService } from '../../lib/services/client';
import type { UsageStats } from '../../../../shared/lib/types';

/**
 * 利用状況取得フック
 * - 1分キャッシュ
 * - ユーザーIDがない場合は実行しない
 */
export function useUsage(clientId: string | null) {
  return useQuery<UsageStats>({
    queryKey: ['usage', clientId],
    queryFn: async () => {
      console.log('[useUsage] Fetching usage stats...');
      const data = await clientService.getUsageAndReset();
      console.log('[useUsage] Usage stats fetched:', data);
      return data;
    },
    enabled: !!clientId, // clientIdがある場合のみ実行
    staleTime: 60_000, // 1分
    gcTime: 5 * 60_000, // 5分
    refetchOnMount: false, // マウント時の再取得を無効化
    retry: false, // エラー時の再試行を無効化
  });
}

/**
 * 利用状況を更新するミューテーション
 * - 占い実行後に使用
 * - 楽観的更新対応
 */
export function useUpdateUsage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: { spreadId: string; categoryId: string }) => {
      console.log('[useUpdateUsage] Starting reading...', params);
      // ここで実際の占い実行APIを呼ぶ
      // 今は仮実装
      return params;
    },
    
    onMutate: async (variables) => {
      // 楽観的更新：即座にUIを更新
      const userId = queryClient.getQueryData<string>(['currentUserId']);
      
      await queryClient.cancelQueries({ queryKey: ['usage', userId] });
      
      const previousUsage = queryClient.getQueryData(['usage', userId]);
      
      queryClient.setQueryData(['usage', userId], (old: UsageStats | undefined) => {
        if (!old) return old;
        return {
          ...old,
          remainingReadings: Math.max(0, (old.remainingReadings || 0) - 1),
        };
      });
      
      console.log('[useUpdateUsage] Optimistic update applied');
      
      return { previousUsage };
    },
    
    onError: (err, variables, context) => {
      // エラー時はロールバック
      const userId = queryClient.getQueryData<string>(['currentUserId']);
      if (context?.previousUsage) {
        queryClient.setQueryData(['usage', userId], context.previousUsage);
      }
      console.error('[useUpdateUsage] Error, rolled back:', err);
    },
    
    onSettled: () => {
      // 最終的にサーバーと同期
      const userId = queryClient.getQueryData<string>(['currentUserId']);
      queryClient.invalidateQueries({ queryKey: ['usage', userId] });
      console.log('[useUpdateUsage] Invalidated usage query');
    },
  });
}