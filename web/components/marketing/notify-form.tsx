"use client";

import { useState } from "react";

export function NotifyForm() {
  const [email, setEmail] = useState("");
  const [platform, setPlatform] = useState<"ios" | "android" | "both">("both");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/notify/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, platform }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "登録に失敗しました");
        setStatus("error");
        return;
      }
      setStatus("success");
    } catch {
      setErrorMsg("ネットワークエラーが発生しました");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl bg-white/10 border border-white/20 px-6 py-5 text-center max-w-md mx-auto">
        <div className="text-3xl mb-3">✅</div>
        <p className="text-white font-semibold mb-1">登録完了！</p>
        <p className="text-purple-200 text-sm">
          アプリリリース時にメールでお知らせします。
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white/10 border border-white/20 px-6 py-6 max-w-md mx-auto">
      <p className="text-white text-sm font-semibold mb-1 text-center">
        📱 モバイルアプリのリリース通知を受け取る
      </p>
      <p className="text-purple-200 text-xs text-center mb-4">
        iOS・Androidアプリが配信されたらメールでお知らせします
      </p>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          className="w-full rounded-xl bg-white/10 border border-white/20 text-white placeholder-purple-300 px-4 py-2.5 text-sm focus:outline-none focus:border-white/50 focus:bg-white/15 transition-all"
        />

        <div className="flex gap-2 justify-center">
          {(["ios", "android", "both"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPlatform(p)}
              className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-all ${
                platform === p
                  ? "bg-white text-purple-900"
                  : "bg-white/10 text-purple-200 hover:bg-white/20"
              }`}
            >
              {p === "ios" ? " iOS" : p === "android" ? "🤖 Android" : "両方"}
            </button>
          ))}
        </div>

        {errorMsg && (
          <p className="text-red-300 text-xs text-center">{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={status === "loading"}
          className="w-full rounded-xl bg-purple-500 hover:bg-purple-400 disabled:opacity-60 text-white py-2.5 text-sm font-semibold transition-all"
        >
          {status === "loading" ? "送信中…" : "リリース通知を受け取る"}
        </button>
      </form>
    </div>
  );
}
