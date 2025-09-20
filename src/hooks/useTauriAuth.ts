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

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      setLoading(true);
      const savedUser = await invoke<User | null>("get_stored_user");
      setUser(savedUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auth check failed");
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // Rust関数呼び出し：内部ブラウザでNext.js認証
      const result = await invoke<AuthResult>("tauri_auth_login");

      if (result.success) {
        setUser(result.user);
      } else {
        throw new Error("Authentication failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
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
    signIn,
    signOut,
    isAuthenticated: !!user,
  };
};
