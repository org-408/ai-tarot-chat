import {
  findSubscriptionByToken,
  unsubscribeByToken,
} from "@/lib/server/repositories/notification";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return new NextResponse(errorHtml("無効なリンクです"), {
      status: 400,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  const sub = await findSubscriptionByToken(token);
  if (!sub) {
    return new NextResponse(errorHtml("無効なリンクです"), {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  if (sub.unsubscribedAt) {
    return new NextResponse(successHtml(sub.email, true), {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  await unsubscribeByToken(token);

  return new NextResponse(successHtml(sub.email, false), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function successHtml(email: string, alreadyDone: boolean): string {
  const message = alreadyDone
    ? "すでに配信停止済みです。"
    : "配信停止が完了しました。";
  return pageHtml(
    "配信停止",
    `<p style="color:#374151;font-size:15px;">${message}</p>
     <p style="color:#6b7280;font-size:13px;margin-top:8px;">${email} への通知メールは今後送信されません。</p>`
  );
}

function errorHtml(message: string): string {
  return pageHtml(
    "エラー",
    `<p style="color:#dc2626;font-size:15px;">${message}</p>`
  );
}

function pageHtml(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - Ariadne</title>
</head>
<body style="margin:0;padding:0;background:#f5f3ff;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:480px;margin:80px auto;background:#fff;border-radius:16px;padding:40px;box-shadow:0 4px 24px rgba(109,40,217,0.1);text-align:center;">
    <div style="font-size:40px;margin-bottom:16px;">🔮</div>
    <h1 style="color:#1e1b4b;font-size:20px;font-weight:bold;margin:0 0 16px;">Ariadne</h1>
    ${content}
    <p style="margin-top:24px;">
      <a href="/" style="color:#7c3aed;font-size:13px;text-decoration:none;">トップページへ戻る</a>
    </p>
  </div>
</body>
</html>`;
}
