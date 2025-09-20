import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

interface User {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  planType: string;
  isRegistered: boolean;
}

interface Session {
  user: User;
  expires: string;
  accessToken?: string;
  refreshToken?: string;
}

interface AuthResult {
  success: boolean;
  user: User;
  session: Session;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface AuthError {
  message: string;
  code?: string;
}

export const useTauriAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async (): Promise<void> => {
    try {
      setLoading(true);
      const currentUser = await invoke<User | null>("get_current_user");
      setUser(currentUser);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Auth check failed";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      const result = await invoke<AuthResult>("tauri_auth_login");

      if (result.success) {
        setUser(result.user);
      } else {
        throw new Error("Authentication failed");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Login failed";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      await invoke<void>("logout");
      setUser(null);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Logout failed";
      setError(errorMessage);
    }
  };

  return {
    user,
    loading,
    error,
    signIn,
    signOut,
    isAuthenticated: !!user,
  } as const;
};
