import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { onAuthStateChange, getCurrentUser } from "../services/auth";

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: getCurrentUser(),
    loading: true,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      setAuthState({
        user,
        loading: false,
        error: null,
      });
    });

    return () => unsubscribe();
  }, []);

  const setError = (error: string) => {
    setAuthState((prev) => ({
      ...prev,
      error,
    }));
  };

  const clearError = () => {
    setAuthState((prev) => ({
      ...prev,
      error: null,
    }));
  };

  return {
    user: authState.user,
    loading: authState.loading,
    error: authState.error,
    setError,
    clearError,
    isAuthenticated: !!authState.user,
  };
};
