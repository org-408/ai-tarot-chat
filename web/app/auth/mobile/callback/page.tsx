"use client";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthCallbackPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    console.log("AuthCallbackPage - session:", session, "status:", status);
    if (status === "authenticated" && session?.accessToken) {
      // 即座にアプリにリダイレクト
      const appUrl = `aitarotchat://auth/success?token=${session.accessToken}&userId=${session.userId}&provider=${session.provider}`;
      window.location.href = appUrl;
    } else if (status === "unauthenticated") {
      router.push("/auth/signin?isMobile=true");
    }
  }, [session, status, router]);

  return (
    <div className="callback-loader">
      <div className="spinner"></div>
      <p>認証中...</p>
    </div>
  );
}
