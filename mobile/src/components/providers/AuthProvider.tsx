import { useEffect, type ReactNode } from 'react';
import { useAuth } from '../../lib/hooks/useAuth';
import { authService } from '../../lib/services/auth';

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * 認証プロバイダー
 * - 起動時のデバイス登録
 * - セッション復旧
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const { setPayload, refresh } = useAuth();
  
  useEffect(() => {
    const initialize = async () => {
      try {
        console.log('[AuthProvider] Initializing...');
        
        // まずセッション復旧を試みる
        await refresh();
        
        // デバイス登録（初回 or トークン期限切れ時）
        const payload = await authService.registerDevice();
        setPayload(payload);
        
        console.log('[AuthProvider] Initialized successfully');
      } catch (error) {
        console.error('[AuthProvider] Initialization failed:', error);
      }
    };
    
    initialize();
  }, []);
  
  return <>{children}</>;
}