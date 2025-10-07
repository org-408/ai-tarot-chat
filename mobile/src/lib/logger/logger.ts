import { apiClient } from '../utils/apiClient';
import { useAuth } from '../hooks/useAuth';

export const logWithContext = (
  level: 'info' | 'error' | 'warn' | 'debug',
  message: string, 
  context?: { clientId?: string; path?: string; [key: string]: unknown },
) => {
  // コンソールにも出力（開発時に便利）
  console.log(`[${level.toUpperCase()}] ${message}`, context);

  // デバイス情報（モバイルアプリ固定）
  const { payload } = useAuth();
  const device = `mobile: ${payload!.clientId || 'unknown'}`;
  
  // サーバーに送信（認証なし）
  try {
    apiClient.postWithoutAuth('/api/logger', { 
      level, 
      message, 
      context, 
      device 
    }).catch(e => console.error('ログ送信エラー:', e));
  } catch (e) {
    // エラーが発生しても処理を続行
    console.error('ログ送信例外:', e);
  }
};
