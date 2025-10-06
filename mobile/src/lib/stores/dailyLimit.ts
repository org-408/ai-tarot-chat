import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UsageStats } from '../../../../shared/lib/types';
import { clientService } from '../services/client';
import { storeRepository } from '../repositories/store';
import { getTodayJST, isSameDayJST } from '../utils/date';

interface DailyLimitState {
  isReady: boolean;
  usage: UsageStats | null;
  lastFetchedDate: string | null; // YYYY-MM-DD形式
  
  // アクション
  init: () => Promise<void>;
  refresh: () => Promise<void>;
  checkDateAndReset: () => Promise<boolean>;
}

export const useDailyLimitStore = create<DailyLimitState>()(
  persist(
    (set, get) => ({
      isReady: false,
      usage: null,
      lastFetchedDate: null,
      
      init: async () => {
        console.log('[DailyLimit] Initializing...');
        try {
          const usage = await clientService.getUsageAndReset();
          const today = getTodayJST();
          
          set({ 
            usage, 
            lastFetchedDate: today,
            isReady: true 
          });
          console.log('[DailyLimit] Initialized:', usage);
        } catch (error) {
          console.error('[DailyLimit] Init failed:', error);
          set({ isReady: true });
        }
      },
      
      refresh: async () => {
        console.log('[DailyLimit] Refreshing usage...');
        try {
          const usage = await clientService.getUsageAndReset();
          const today = getTodayJST();
          
          set({ 
            usage,
            lastFetchedDate: today
          });
          console.log('[DailyLimit] Refreshed:', usage);
        } catch (error) {
          console.error('[DailyLimit] Refresh failed:', error);
        }
      },
      
      // 日付が変わったかチェック＆必要ならリセット
      checkDateAndReset: async () => {
        console.log('[DailyLimit] Checking date change...');
        
        const { lastFetchedDate } = get();
        const today = getTodayJST();
        
        // 日付が変わっていない場合はスキップ
        if (isSameDayJST(lastFetchedDate ? new Date(lastFetchedDate) : undefined)) {
          console.log('[DailyLimit] Same day, skipping reset');
          return false;
        }
        
        try {
          // 日付が変わっているのでサーバーから最新データ取得
          // サーバー側で日次リセットが実行される
          const usage = await clientService.getUsageAndReset();
          
          set({ 
            usage,
            lastFetchedDate: today
          });
          
          console.log('[DailyLimit] Date changed, limits reset:', usage);
          return true; // リセットされた
        } catch (error) {
          console.error('[DailyLimit] Date check failed:', error);
          return false;
        }
      },
    }),
    {
      name: 'daily-limit-storage',
      storage: createJSONStorage(() => ({
        getItem: async (name: string) => {
          const value = await storeRepository.get(name);
          return value ? JSON.stringify(value) : null;
        },
        setItem: async (name: string, value: string) => {
          const parsed = JSON.parse(value);
          await storeRepository.set(name, parsed);
        },
        removeItem: async (name: string) => {
          await storeRepository.delete(name);
        },
      })),
    }
  )
);

// 便利なセレクター
export const useDailyLimit = () => {
  const { usage, refresh, checkDateAndReset } = useDailyLimitStore();
  
  return {
    usage,
    remainingReadings: usage?.remainingReadings ?? 0,
    canRead: (usage?.remainingReadings ?? 0) > 0,
    refresh,
    checkDateAndReset,
  };
};