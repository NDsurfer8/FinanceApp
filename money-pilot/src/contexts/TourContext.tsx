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
}

export interface TourContextType {
  isTourActive: boolean;
  currentStep: number;
  tourSteps: TourStep[];
  startTour: (navigation?: any) => void;
  stopTour: () => void;
  nextStep: (navigation?: any) => void;
  skipTour: () => void;
  hasCompletedTour: boolean;
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

  // Professional tour steps for each tab
  const tourSteps: TourStep[] = [
    {
      id: "dashboard",
      title: "Your Financial Command Center",
      description:
        "Welcome! 🏠 Here you'll see everything at a glance. It's like having a financial advisor in your pocket! Oh, wait you do! Tap on the green floating button on the right to ask Vectra Your personal financial assistant anything about your finances!",
      screen: "Dashboard",
      zone: 1,
    },
    {
      id: "budget",
      title: "Budget Like a Pro",
      description:
        "Ready to take control of your money? 💰 This is where the magic happens! Set spending limits, track your expenses, and watch your financial habits transform. You'll be amazed at how much you can save!",
      screen: "Budget",
      zone: 1,
    },
    {
      id: "assets-debts",
      title: "Build Your Wealth Empire",
      description:
        "Time to see the big picture! 📊 Track all your assets and debts in one place. Watch your net worth grow month by month and make informed decisions about your financial future. Every millionaire started here!",
      screen: "AssetsDebts",
      zone: 1,
    },
    {
      id: "shared-finance",
      title: "Team Up for Success",
      description:
        "Money is better together! 👥 Share your financial journey with family, partners, or roommates. Collaborate on budgets, split expenses, and achieve your goals as a team. Because financial success is a team sport!",
      screen: "SharedFinance",
      zone: 1,
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
      setHasCompletedTourState(completed === "true");
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

  const navigateToScreen = (navigation: any, screenName: string) => {
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
    setIsTourActive(true);
    setCurrentStep(0);

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

      setCurrentStep(nextStepIndex);

      if (navigation && nextStepData) {
        navigateToScreen(navigation, nextStepData.screen);
      }
    } else {
      // Tour completed
      stopTour();
      saveTourStatus(true);
    }
  };

  const skipTour = () => {
    stopTour();
    saveTourStatus(true);
  };

  const value: TourContextType = {
    isTourActive,
    currentStep,
    tourSteps,
    startTour,
    stopTour,
    nextStep,
    skipTour,
    hasCompletedTour,
  };

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
};
