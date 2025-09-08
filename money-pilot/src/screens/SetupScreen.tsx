import React from "react";
import { SetupWizard } from "../components/SetupWizard";
import { useSetup } from "../contexts/SetupContext";
import { useNavigation } from "@react-navigation/native";

export const SetupScreen: React.FC = () => {
  const { completeSetup } = useSetup();
  const navigation = useNavigation();

  const handleComplete = () => {
    completeSetup();
    // Navigate to Budget screen instead of MainTabs
    navigation.navigate("MainTabs" as never, { screen: "Budget" } as never);
  };

  const handleSkip = () => {
    completeSetup();
    // Navigate to Budget screen instead of MainTabs
    navigation.navigate("MainTabs" as never, { screen: "Budget" } as never);
  };

  return <SetupWizard onComplete={handleComplete} onSkip={handleSkip} />;
};
