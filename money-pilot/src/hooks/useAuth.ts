import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import {
  onAuthStateChange,
  getCurrentUser,
  isUserSessionValid,
  refreshUserToken,
} from "../services/auth";

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
    const unsubscribe = onAuthStateChange(async (user) => {
      if (user) {
        // Validate the user session with retry logic
        try {
          const isValid = await isUserSessionValid();
          if (!isValid) {
            console.log(
              "Invalid session detected, attempting to refresh token"
            );
            const refreshed = await refreshUserToken();
            if (!refreshed) {
              // Session is truly invalid, clear the user
              setAuthState({
                user: null,
                loading: false,
                error: "Session expired. Please sign in again.",
              });
              return;
            }
          }
        } catch (error) {
          console.error("Error validating user session:", error);

          // Handle network errors gracefully
          if (error && typeof error === "object" && "code" in error) {
            const firebaseError = error as any;
            if (firebaseError.code === "auth/network-request-failed") {
              console.warn(
                "Network error during session validation, continuing with user"
              );
              // Continue with the user if it's just a network error
            } else {
              console.error(
                "Non-network error during session validation:",
                firebaseError
              );
            }
          }
        }
      }

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
