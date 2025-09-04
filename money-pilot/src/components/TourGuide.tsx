import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTour } from "../contexts/TourContext";
import { useTheme } from "../contexts/ThemeContext";
import { fontFamily } from "../config/fonts";
import { useNavigation } from "@react-navigation/native";

interface TourGuideProps {
  children: React.ReactNode;
  zone: number;
  title?: string;
  description?: string;
  placement?: "top" | "bottom" | "left" | "right" | "center";
  maskOffset?: number;
  borderRadius?: number;
  screen: string;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

export const TourGuide: React.FC<TourGuideProps> = ({
  children,
  zone,
  title,
  description,
  placement = "bottom",
  maskOffset = 0,
  borderRadius = 8,
  screen,
}) => {
  const {
    isTourActive,
    currentStep,
    tourSteps,
    nextStep,
    previousStep,
    skipTour,
    showTooltips,
  } = useTour();
  const { colors } = useTheme();
  const navigation = useNavigation();

  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const currentTourStep = tourSteps[currentStep];
  const isCurrentStep =
    isTourActive &&
    currentTourStep?.zone === zone &&
    currentTourStep?.screen === screen;

  useEffect(() => {
    console.log("🔍 TourGuide check:", {
      isTourActive,
      currentStep,
      currentTourStep: currentTourStep?.id,
      zone,
      screen,
      isCurrentStep,
    });

    setIsVisible(isCurrentStep);

    if (isCurrentStep) {
      // Calculate tooltip position based on placement
      calculateTooltipPosition();
    }
  }, [isCurrentStep, currentStep, isTourActive]);

  const calculateTooltipPosition = () => {
    // Calculate positioning right next to highlighted items
    const tooltipWidth = 200;
    const tooltipHeight = 80;
    const padding = 10;
    const offset = 20; // Distance from highlighted element

    let x = screenWidth / 2 - tooltipWidth / 2;
    let y = screenHeight / 2 - tooltipHeight / 2;

    // Position right next to the highlighted element based on placement
    switch (placement) {
      case "top":
        // Position below the highlighted element
        x = screenWidth * 0.1;
        y = screenHeight * 0.3;
        break;
      case "bottom":
        // Position above the highlighted element
        x = screenWidth * 0.1;
        y = screenHeight * 0.6;
        break;
      case "left":
        // Position to the right of the highlighted element
        x = screenWidth * 0.3;
        y = screenHeight * 0.4;
        break;
      case "right":
        // Position to the left of the highlighted element
        x = screenWidth * 0.05;
        y = screenHeight * 0.4;
        break;
    }

    // Ensure tooltip stays within screen bounds
    x = Math.max(padding, Math.min(x, screenWidth - tooltipWidth - padding));
    y = Math.max(padding, Math.min(y, screenHeight - tooltipHeight - padding));

    setTooltipPosition({ x, y });
  };

  if (!isVisible) {
    return <>{children}</>;
  }

  return (
    <>
      {/* Highlight the element with fun animation */}
      <View
        style={[
          isVisible && {
            shadowColor: colors.primary,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.6,
            shadowRadius: 16,
            elevation: 12,
            borderRadius: 12,
            transform: [{ scale: 1.02 }],
          },
        ]}
      >
        {children}
      </View>

      {/* Fun and Engaging Tour Guide */}
      {isVisible && (
        <View style={styles.floatingGuide}>
          {/* Fun tour guide bubble positioned next to highlighted element */}
          <View
            style={[
              styles.funTourGuide,
              {
                backgroundColor: colors.primary,
                left: tooltipPosition.x,
                top: tooltipPosition.y,
              },
            ]}
          >
            {/* Fun header with emoji */}
            <View style={styles.guideHeader}>
              <Text style={styles.funEmoji}>✨</Text>
              <Text style={[styles.guideTitle, { color: colors.buttonText }]}>
                Tour Guide
              </Text>
            </View>

            {/* Main content */}
            <Text style={[styles.funGuideText, { color: colors.buttonText }]}>
              {description || currentTourStep?.description}
            </Text>

            {/* Fun tap hint */}
            <View style={styles.tapHintContainer}>
              <Text style={styles.tapEmoji}>👆</Text>
              <Text style={[styles.funTapHint, { color: colors.buttonText }]}>
                Tap anywhere to continue
              </Text>
            </View>
          </View>

          {/* Invisible overlay to capture taps */}
          <TouchableOpacity
            style={styles.tapOverlay}
            onPress={() => nextStep(navigation)}
            activeOpacity={1}
          />
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  floatingGuide: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: "box-none", // Allow touches to pass through
    zIndex: 1000,
  },
  funTourGuide: {
    position: "absolute",
    width: 200,
    maxWidth: "80%",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 1001,
    pointerEvents: "none",
  },
  guideHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  funEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  guideTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  funGuideText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
    textAlign: "left",
  },
  tapHintContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  tapEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  funTapHint: {
    fontSize: 11,
    fontWeight: "600",
    opacity: 0.9,
  },
  tapOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1002,
  },
  vectraAvatar: {
    marginRight: 12,
    marginTop: 2,
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  chatMessage: {
    flex: 1,
  },
  vectraName: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 3,
  },
  chatText: {
    fontSize: 12,
    lineHeight: 16,
  },
  arrow: {
    position: "absolute",
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 12,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    bottom: -12,
    left: 20,
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  progressText: {
    fontSize: 11,
    marginBottom: 6,
    textAlign: "center",
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  navigationButtons: {
    flexDirection: "row",
    gap: 12,
  },
  navButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
