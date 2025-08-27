import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { User } from "firebase/auth";
import { useAuth } from "../hooks/useAuth";
import { reloadCurrentUser } from "../services/auth";

interface UserContextType {
  currentUser: User | null;
  refreshUser: () => Promise<void>;
  forceRefresh: () => Promise<void>;
  updateUserImmediately: (updatedUser: User) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [currentUser, setCurrentUser] = useState<User | null>(user);

  // Update current user when user changes
  useEffect(() => {
    setCurrentUser(user);
  }, [user]);

  // Function to immediately update user state (for profile changes)
  const updateUserImmediately = useCallback(
    (updatedUser: User) => {
      setCurrentUser(updatedUser);
    },
    [currentUser]
  );

  // Function to refresh user data
  const refreshUser = async () => {
    try {
      const freshUser = await reloadCurrentUser();
      if (freshUser) {
        setCurrentUser(freshUser);
      }
    } catch (error) {
      console.error("Error refreshing user:", error);
    }
  };

  // Function to force refresh (for immediate updates)
  const forceRefresh = async () => {
    await refreshUser();
  };

  return (
    <UserContext.Provider
      value={{ currentUser, refreshUser, forceRefresh, updateUserImmediately }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
