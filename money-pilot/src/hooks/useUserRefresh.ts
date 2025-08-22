import { useState, useCallback } from "react";
import { User } from "firebase/auth";
import { getCurrentUser } from "../services/auth";

export const useUserRefresh = (initialUser: User | null) => {
  const [user, setUser] = useState<User | null>(initialUser);

  const refreshUser = useCallback(() => {
    const freshUser = getCurrentUser();
    if (freshUser) {
      setUser(freshUser);
    }
  }, []);

  const updateUser = useCallback((newUser: User | null) => {
    setUser(newUser);
  }, []);

  return {
    user,
    refreshUser,
    updateUser,
  };
};
