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
    console.log("UserContext: User changed", {
      oldPhotoURL: currentUser?.photoURL,
      newPhotoURL: user?.photoURL,
      oldDisplayName: currentUser?.displayName,
      newDisplayName: user?.displayName,
    });
    setCurrentUser(user);
  }, [user]);

  // Function to immediately update user state (for profile changes)
  const updateUserImmediately = useCallback(
    (updatedUser: User) => {
      console.log("UserContext: Immediate update called", {
        oldPhotoURL: currentUser?.photoURL,
        newPhotoURL: updatedUser.photoURL,
      });
      setCurrentUser(updatedUser);
    },
    [currentUser]
  );

  // Function to refresh user data
  const refreshUser = async () => {
    try {
      console.log("UserContext: Refreshing user data...");
      const freshUser = await reloadCurrentUser();
      if (freshUser) {
        console.log("UserContext: Fresh user data received", {
          photoURL: freshUser.photoURL,
          displayName: freshUser.displayName,
        });
        setCurrentUser(freshUser);
      }
    } catch (error) {
      console.error("Error refreshing user:", error);
    }
  };

  // Function to force refresh (for immediate updates)
  const forceRefresh = async () => {
    console.log("UserContext: Force refresh called");
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
