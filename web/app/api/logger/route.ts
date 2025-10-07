import { NextRequest, NextResponse } from 'next/server';
import { logWithContext } from '@/lib/logger/logger';
import { log } from 'console';

export async function POST(req: NextRequest) {
  try {
    // リクエストから単一のログエントリを取得
    const logEntry = await req.json();
    
    // 基本的な検証
    if (!logEntry || typeof logEntry !== 'object') {
      logWithContext('error', 'Invalid log data format', { path: '/api/logger', device: 'mobile', status: 400 });
      return NextResponse.json({ error: 'Invalid log data format' }, { status: 400 });
    }
    
    // ログエントリの内容を取り出す
    const { level, message, device, context } = logEntry;
    logWithContext('info', 'Received log entry', { logEntry, level, message, device, context });
    
    // 必須フィールドの検証
    if (!level || !message) {
      logWithContext('error', 'Missing required fields', { path: '/api/logger', device: 'mobile', status: 400 });
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    // timestampがISO文字列の場合、Date型に変換
    if (context && context.timestamp && typeof context.timestamp === 'string') {
      context.timestamp = new Date(context.timestamp);
    }

    // IPアドレスを追加
    const ipAddress = req.headers.get('x-forwarded-for') || 'unknown';
    
    // IP情報を追加したコンテキスト
    const enhancedContext = {
      ...context,
      ipAddress,
      receivedAt: new Date().toISOString()
    };
    
    // そのままlogWithContextを使用
    logWithContext(level, message, enhancedContext, device || 'mobile');
    
    // 結果を返す
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error('Log API error:', error);
    logWithContext('error', 'Log API error', { error: String(error), path: '/api/logger', status: 500 });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}