import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  getFriendlyModeEnabled,
  setFriendlyModeEnabled,
} from "../services/settings";

interface FriendlyModeContextType {
  isFriendlyMode: boolean;
  setIsFriendlyMode: (enabled: boolean) => void;
}

const FriendlyModeContext = createContext<FriendlyModeContextType | undefined>(
  undefined
);

interface FriendlyModeProviderProps {
  children: ReactNode;
}

export const FriendlyModeProvider: React.FC<FriendlyModeProviderProps> = ({
  children,
}) => {
  const [isFriendlyMode, setIsFriendlyMode] = useState(false);

  // Load friendly mode setting on app start
  useEffect(() => {
    const loadFriendlyModeSetting = async () => {
      try {
        const enabled = await getFriendlyModeEnabled();
        setIsFriendlyMode(enabled);
      } catch (error) {
        console.error("Error loading friendly mode setting:", error);
      }
    };

    loadFriendlyModeSetting();
  }, []);

  const handleSetFriendlyMode = async (enabled: boolean) => {
    setIsFriendlyMode(enabled);
    try {
      await setFriendlyModeEnabled(enabled);
    } catch (error) {
      console.error("Error saving friendly mode setting:", error);
    }
  };

  const value = {
    isFriendlyMode,
    setIsFriendlyMode: handleSetFriendlyMode,
  };

  return (
    <FriendlyModeContext.Provider value={value}>
      {children}
    </FriendlyModeContext.Provider>
  );
};

export const useFriendlyMode = (): FriendlyModeContextType => {
  const context = useContext(FriendlyModeContext);
  if (context === undefined) {
    throw new Error(
      "useFriendlyMode must be used within a FriendlyModeProvider"
    );
  }
  return context;
};
