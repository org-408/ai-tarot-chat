import { create } from 'zustand';
import { App as CapacitorApp } from '@capacitor/app';
import { useAuthStore } from './auth';
import { useDailyLimitStore } from './dailyLimit';
import { queryClient } from '../../components/providers/QueryProvider';
import { logWithContext } from '../logger/logger';

interface LifecycleState {
  // 状態（外から見える）
  isInitialized: boolean;
  isRefreshing: boolean;
  dateChanged: boolean; // 日付が変わった時にtrue
  lastResumedAt: Date | null;
  error: Error | null;
  isInitLocked: boolean; // 初期化中に二重initを防止するためのフラグ
  
  // アクション
  init: () => Promise<void>;
  setup: () => void;
  cleanup: () => void;
  onResume: () => Promise<void>;
  onPause: () => Promise<void>;
  clearDateChanged: () => void; // 通知を消すため
  clearError: () => void;
}

let appStateListener: any = null;
let resumeListener: any = null;
let visibilityHandler: (() => void) | null = null;

export const useLifecycleStore = create<LifecycleState>((set, get) => ({
  isInitialized: false,
  isRefreshing: false,
  dateChanged: false,
  lastResumedAt: null,
  error: null,
  isInitLocked: false, // 初期化中に二重initを防止するためのフラグ
  
  init: async () => {
    const isInitLocked = get().isInitLocked;
    const isInitialized = get().isInitialized;
    if (isInitialized || isInitLocked) {
      logWithContext('info', '[Lifecycle] Already initialized, skipping', { isInitLocked, isInitialized });
      return;
    }
    logWithContext('info', '[Lifecycle] Initializing...', { isInitLocked, isInitialized });
    set({ isInitLocked: true, isRefreshing: true, error: null });

    try {
      // 1. 認証初期化
      logWithContext('info', '[Lifecycle] Initializing AuthStore...');
      await useAuthStore.getState().init();

      // 2. マスターデータの取得
      logWithContext('info', '[Lifecycle] Fetching master data...');
      await queryClient.invalidateQueries({ queryKey: ['master', true, true] });

      // 3. ユーザー利用状況の取得
      logWithContext('info', '[Lifecycle] Fetching usage stats...');
      const clientId = useAuthStore.getState().payload?.clientId || null;
      if (clientId) {
        await queryClient.invalidateQueries({ queryKey: ['usage', clientId] });
      } else {
        logWithContext('info', '[Lifecycle] No clientId available, skipping usage fetch');
      }
      
      set({ 
        isInitialized: true,
        isRefreshing: false,
        lastResumedAt: new Date()
      });
      logWithContext('info', '[Lifecycle] Initialization complete');
    } catch (error) {
      logWithContext('error', '[Lifecycle] Initialization failed:', { error });
      set({ 
        isInitialized: true,
        isRefreshing: false,
        error: error as Error
      });
    } finally {
      set({ isInitLocked: false });
    }
  },
  
  setup: () => {
    logWithContext('info', '[Lifecycle] Setting up listeners');
    get().cleanup();
    
    // 1. appStateChange
    CapacitorApp.addListener('appStateChange', async (state) => {
      if (state.isActive) {
        await get().onResume();
      } else {
        await get().onPause();
      }
    }).then(listener => {
      appStateListener = listener;
    });
    
    // 2. resume
    CapacitorApp.addListener('resume', async () => {
      await get().onResume();
    }).then(listener => {
      resumeListener = listener;
    });
    
    // 3. visibilitychange
    visibilityHandler = async () => {
      if (document.visibilityState === 'visible') {
        await get().onResume();
      } else {
        await get().onPause();
      }
    };
    document.addEventListener('visibilitychange', visibilityHandler);
  },
  
  cleanup: () => {
    logWithContext('info', '[Lifecycle] Cleaning up listeners');
    
    if (appStateListener) {
      appStateListener.remove();
      appStateListener = null;
    }
    
    if (resumeListener) {
      resumeListener.remove();
      resumeListener = null;
    }
    
    if (visibilityHandler) {
      document.removeEventListener('visibilitychange', visibilityHandler);
      visibilityHandler = null;
    }
  },
  
  onResume: async () => {
    logWithContext('info', '[Lifecycle] App resumed');
    set({ 
      isRefreshing: true, 
      dateChanged: false,
      error: null 
    });
    
    try {
      // 1. 認証トークンのリフレッシュ
      await useAuthStore.getState().refresh();
      
      // 2. 日付変更チェック & 自動リセット
      const wasReset = await useDailyLimitStore.getState().checkDateAndReset();
      
      set({ 
        isRefreshing: false,
        dateChanged: wasReset,
        lastResumedAt: new Date()
      });
      
      if (wasReset) {
        logWithContext('info', '[Lifecycle] Daily limits were reset');
      }
      
      logWithContext('info', '[Lifecycle] Resume complete');
    } catch (error) {
      logWithContext('error', '[Lifecycle] Resume failed:', { error });
      set({ 
        isRefreshing: false,
        error: error as Error
      });
    }
  },
  
  onPause: async () => {
    logWithContext('info', '[Lifecycle] App paused');
    // 必要なら状態保存
  },
  
  clearDateChanged: () => {
    set({ dateChanged: false });
  },
  
  clearError: () => {
    set({ error: null });
  },
}));
