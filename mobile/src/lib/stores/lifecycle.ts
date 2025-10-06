import { create } from 'zustand';
import { App as CapacitorApp } from '@capacitor/app';
import { useAuthStore } from './auth';
import { useDailyLimitStore } from './dailyLimit';

interface LifecycleState {
  // 状態（外から見える）
  isInitialized: boolean;
  isRefreshing: boolean;
  dateChanged: boolean; // 日付が変わった時にtrue
  lastResumedAt: Date | null;
  error: Error | null;
  
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
  
  init: async () => {
    console.log('[Lifecycle] Initializing...');
    set({ isRefreshing: true, error: null });
    
    try {
      // 1. 認証初期化
      console.log('[Lifecycle] Initializing AuthStore...');
      await useAuthStore.getState().init();
      
      set({ 
        isInitialized: true,
        isRefreshing: false,
        lastResumedAt: new Date()
      });
      console.log('[Lifecycle] Initialization complete');
    } catch (error) {
      console.error('[Lifecycle] Initialization failed:', error);
      set({ 
        isInitialized: true,
        isRefreshing: false,
        error: error as Error
      });
    }
  },
  
  setup: () => {
    console.log('[Lifecycle] Setting up listeners');
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
    console.log('[Lifecycle] Cleaning up listeners');
    
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
    console.log('[Lifecycle] App resumed');
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
        console.log('[Lifecycle] Daily limits were reset');
      }
      
      console.log('[Lifecycle] Resume complete');
    } catch (error) {
      console.error('[Lifecycle] Resume failed:', error);
      set({ 
        isRefreshing: false,
        error: error as Error
      });
    }
  },
  
  onPause: async () => {
    console.log('[Lifecycle] App paused');
    // 必要なら状態保存
  },
  
  clearDateChanged: () => {
    set({ dateChanged: false });
  },
  
  clearError: () => {
    set({ error: null });
  },
}));

// 便利なセレクター
export const useLifecycle = () => {
  const { 
    isInitialized, 
    isRefreshing, 
    dateChanged, 
    lastResumedAt,
    error,
    clearDateChanged,
    clearError 
  } = useLifecycleStore();
  
  return {
    isInitialized,
    isRefreshing,
    dateChanged,
    lastResumedAt,
    error,
    clearDateChanged,
    clearError,
  };
};