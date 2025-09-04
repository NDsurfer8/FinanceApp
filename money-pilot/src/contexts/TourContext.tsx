import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../hooks/useAuth";
import { useNavigation } from "@react-navigation/native";

export interface TourStep {
  id: string;
  title: string;
  description: string;
  screen: string;
  zone: number;
  placement?: "top" | "bottom" | "left" | "right" | "center";
  maskOffset?: number;
  borderRadius?: number;
}

export interface TourContextType {
  isTourActive: boolean;
  currentStep: number;
  tourSteps: TourStep[];
  startTour: (navigation?: any) => void;
  stopTour: () => void;
  nextStep: (navigation?: any) => void;
  previousStep: (navigation?: any) => void;
  skipTour: () => void;
  hasCompletedTour: boolean;
  setHasCompletedTour: (completed: boolean) => void;
  showTooltips: boolean;
  setShowTooltips: (show: boolean) => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export const useTour = () => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error("useTour must be used within a TourProvider");
  }
  return context;
};

interface TourProviderProps {
  children: ReactNode;
}

export const TourProvider: React.FC<TourProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [isTourActive, setIsTourActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasCompletedTour, setHasCompletedTourState] = useState(false);
  const [showTooltips, setShowTooltips] = useState(true);

  // Define all tour steps
  const tourSteps: TourStep[] = [
    // Dashboard Tour
    {
      id: "dashboard-budget-overview",
      title: "Budget Overview",
      description:
        "See your monthly budget breakdown including income, expenses, and safe-to-spend amount.",
      screen: "Dashboard",
      zone: 1,
      placement: "bottom",
    },
    {
      id: "dashboard-networth",
      title: "Your Net Worth",
      description:
        "This shows your total financial health - assets minus debts. Track how it grows over time!",
      screen: "Dashboard",
      zone: 2,
      placement: "bottom",
    },
    {
      id: "dashboard-ai-chat",
      title: "AI Financial Advisor",
      description:
        "Get personalized financial advice and insights powered by AI. Ask questions anytime!",
      screen: "Dashboard",
      zone: 3,
      placement: "top",
    },

    // Budget Screen Tour
    {
      id: "budget-overview",
      title: "Budget Overview",
      description:
        "See your monthly budget breakdown and track your spending against limits.",
      screen: "Budget",
      zone: 1,
      placement: "bottom",
    },
    {
      id: "budget-categories",
      title: "Budget Categories",
      description:
        "Set spending limits for different categories like food, transport, and entertainment.",
      screen: "Budget",
      zone: 2,
      placement: "bottom",
    },
    {
      id: "budget-analysis",
      title: "Budget Analysis",
      description:
        "Analyze your spending patterns and see where you can save money.",
      screen: "Budget",
      zone: 3,
      placement: "bottom",
    },

    // Assets & Debts Tour
    {
      id: "assets-debts-networth",
      title: "Net Worth Tracking",
      description:
        "Track all your assets and debts to see your true financial position.",
      screen: "AssetsDebts",
      zone: 1,
      placement: "bottom",
    },
    {
      id: "assets-section",
      title: "Assets",
      description:
        "Add your savings, investments, property, and other valuable assets.",
      screen: "AssetsDebts",
      zone: 2,
      placement: "bottom",
    },
    {
      id: "debts-section",
      title: "Debts",
      description:
        "Track loans, credit cards, mortgages, and other debts to manage them better.",
      screen: "AssetsDebts",
      zone: 3,
      placement: "bottom",
    },
    {
      id: "add-asset-debt-buttons",
      title: "Quick Actions",
      description:
        "Easily add new assets or debts with these quick action buttons.",
      screen: "AssetsDebts",
      zone: 4,
      placement: "top",
    },

    // Shared Finance Tour
    {
      id: "shared-finance-overview",
      title: "Shared Finance",
      description:
        "Share your finances with family, partners, or roommates for better money management.",
      screen: "SharedFinance",
      zone: 1,
      placement: "bottom",
    },
    {
      id: "create-group-button",
      title: "Create Group",
      description:
        "Start a shared finance group to collaborate on budgets and expenses.",
      screen: "SharedFinance",
      zone: 2,
      placement: "bottom",
    },
    {
      id: "group-list",
      title: "Your Groups",
      description: "View and manage all your shared finance groups here.",
      screen: "SharedFinance",
      zone: 3,
      placement: "bottom",
    },
  ];

  // Load tour completion status
  useEffect(() => {
    loadTourStatus();
  }, [user]);

  const loadTourStatus = async () => {
    if (!user) return;

    try {
      const completed = await AsyncStorage.getItem(
        `tour_completed_${user.uid}`
      );
      const tooltips = await AsyncStorage.getItem(`show_tooltips_${user.uid}`);

      setHasCompletedTourState(completed === "true");
      setShowTooltips(tooltips !== "false"); // Default to true
    } catch (error) {
      console.error("Error loading tour status:", error);
    }
  };

  const saveTourStatus = async (completed: boolean) => {
    if (!user) return;

    try {
      await AsyncStorage.setItem(
        `tour_completed_${user.uid}`,
        completed.toString()
      );
      setHasCompletedTourState(completed);
    } catch (error) {
      console.error("Error saving tour status:", error);
    }
  };

  const saveTooltipSettings = async (show: boolean) => {
    if (!user) return;

    try {
      await AsyncStorage.setItem(`show_tooltips_${user.uid}`, show.toString());
      setShowTooltips(show);
    } catch (error) {
      console.error("Error saving tooltip settings:", error);
    }
  };

  const navigateToScreen = (navigation: any, screenName: string) => {
    console.log("🧭 Navigating to screen:", screenName);

    // Map screen names to navigation routes
    const screenMap: { [key: string]: string } = {
      Dashboard: "Dashboard",
      Budget: "Budget",
      AssetsDebts: "Assets/Debts",
      SharedFinance: "SharedFinance",
    };

    const routeName = screenMap[screenName] || screenName;

    try {
      if (navigation && navigation.navigate) {
        navigation.navigate(routeName);
      }
    } catch (error) {
      console.error("Error navigating to screen:", error);
    }
  };

  const startTour = (navigation?: any) => {
    console.log("🎯 Starting tour...");
    console.log("🎯 First step:", tourSteps[0]);
    setIsTourActive(true);
    setCurrentStep(0);
    console.log("🎯 Tour active:", true, "Current step:", 0);

    // Navigate to the first screen if needed
    if (navigation && tourSteps[0]) {
      const firstStep = tourSteps[0];
      navigateToScreen(navigation, firstStep.screen);
    }
  };

  const stopTour = () => {
    setIsTourActive(false);
    setCurrentStep(0);
  };

  const nextStep = (navigation?: any) => {
    if (currentStep < tourSteps.length - 1) {
      const nextStepIndex = currentStep + 1;
      const nextStepData = tourSteps[nextStepIndex];

      console.log("➡️ Moving to next step:", nextStepData);
      setCurrentStep(nextStepIndex);

      // Navigate to the next screen if it's different
      if (navigation && nextStepData) {
        navigateToScreen(navigation, nextStepData.screen);
      }
    } else {
      // Tour completed
      console.log("✅ Tour completed!");
      stopTour();
      saveTourStatus(true);
    }
  };

  const previousStep = (navigation?: any) => {
    if (currentStep > 0) {
      const prevStepIndex = currentStep - 1;
      const prevStepData = tourSteps[prevStepIndex];

      console.log("⬅️ Moving to previous step:", prevStepData);
      setCurrentStep(prevStepIndex);

      // Navigate to the previous screen if it's different
      if (navigation && prevStepData) {
        navigateToScreen(navigation, prevStepData.screen);
      }
    }
  };

  const skipTour = () => {
    stopTour();
    saveTourStatus(true);
  };

  const setHasCompletedTour = (completed: boolean) => {
    saveTourStatus(completed);
  };

  const setShowTooltipsWithSave = (show: boolean) => {
    saveTooltipSettings(show);
  };

  const value: TourContextType = {
    isTourActive,
    currentStep,
    tourSteps,
    startTour,
    stopTour,
    nextStep,
    previousStep,
    skipTour,
    hasCompletedTour,
    setHasCompletedTour,
    showTooltips,
    setShowTooltips: setShowTooltipsWithSave,
  };

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
};
