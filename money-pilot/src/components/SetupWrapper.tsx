import React, { useState, useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useSetup } from "../contexts/SetupContext";
import { SetupWizard } from "./SetupWizard";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../contexts/ThemeContext";

interface SetupWrapperProps {
  children: React.ReactNode;
  onSetupCompleted?: () => void;
}

export const SetupWrapper: React.FC<SetupWrapperProps> = ({
  children,
  onSetupCompleted,
}) => {
  const { isFirstTimeUser, isLoading, completeSetup } = useSetup();
  const { colors } = useTheme();
  const navigation = useNavigation();
  const [setupJustCompleted, setSetupJustCompleted] = useState(false);

  const handleSetupComplete = () => {
    completeSetup();
    setSetupJustCompleted(true);
    onSetupCompleted?.();
  };

  const handleSetupSkip = () => {
    completeSetup();
    setSetupJustCompleted(true);
    onSetupCompleted?.();
  };

  // Handle navigation to Budget screen after setup completion
  useEffect(() => {
    if (setupJustCompleted && !isFirstTimeUser) {
      setSetupJustCompleted(false);
    }
  }, [setupJustCompleted, isFirstTimeUser]);

  // Show loading while checking if user is new
  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Show setup wizard only for new users who haven't completed setup
  if (isFirstTimeUser) {
    return (
      <SetupWizard onComplete={handleSetupComplete} onSkip={handleSetupSkip} />
    );
  }

  // If setup was just completed, pass initialRoute to children
  if (setupJustCompleted) {
    return <>{children}</>;
  }

  return <>{children}</>;
};
