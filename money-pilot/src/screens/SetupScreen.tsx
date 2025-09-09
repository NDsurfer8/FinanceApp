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

    (navigation as any).navigate("MainTabs", { screen: "Budget" });
  };

  const handleSkip = () => {
    completeSetup();
    // Navigate to Budget screen instead of MainTabs
    (navigation as any).navigate("MainTabs", { screen: "Budget" });
  };

  return <SetupWizard onComplete={handleComplete} onSkip={handleSkip} />;
};
