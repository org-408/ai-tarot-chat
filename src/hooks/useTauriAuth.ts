import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

interface User {
  id: string;
  email: string;
  name?: string;
  image?: string;
  plan_type: string;
  is_registered: boolean;
}

interface AuthResult {
  success: boolean;
  user: User;
  session: any;
}

export const useTauriAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      setLoading(true);
      const savedUser = await invoke<User | null>("get_stored_user");
      setUser(savedUser);
    } catch (err) {
      // 認証エラーは重要ではない（フリープラン未登録で続行）
      console.log("No stored user found, continuing as guest");
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (): Promise<boolean> => {
    const url =
      import.meta.env.VITE_OAUTH_URL || "http://localhost:3000/auth/signin";
    console.log("Starting sign-in with URL:", url);
    try {
      setIsLoggingIn(true);
      setError(null);

      // Rust関数呼び出し：内部ブラウザでNext.js認証
      const result = await invoke<AuthResult>("auth_login", { url });

      if (result.success) {
        setUser(result.user);
        return true;
      } else {
        throw new Error("Authentication failed");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Login failed";
      setError(errorMessage);
      return false;
    } finally {
      setIsLoggingIn(false);
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      await invoke("clear_auth_data");
      setUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logout failed");
    }
  };

  return {
    user,
    loading,
    error,
    isLoggingIn,
    signIn,
    signOut,
    isAuthenticated: !!user,
    clearError: () => setError(null),
  };
};
