import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Modal,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTour } from "../contexts/TourContext";
import { useTheme } from "../contexts/ThemeContext";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

interface TourGuideProps {
  children: React.ReactNode;
  zone: number;
  screen: string;
}

export const TourGuide: React.FC<TourGuideProps> = ({
  children,
  zone,
  screen,
}) => {
  const { isTourActive, currentStep, tourSteps, nextStep, skipTour } =
    useTour();
  const { colors } = useTheme();
  const navigation = useNavigation();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const iconBounceAnim = useRef(new Animated.Value(0)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;

  const currentTourStep = tourSteps[currentStep];
  const isCurrentStep =
    isTourActive &&
    currentTourStep?.zone === zone &&
    currentTourStep?.screen === screen;

  // Debug logging
  useEffect(() => {
    console.log("🎯 TourGuide Debug:", {
      isTourActive,
      currentStep,
      zone,
      screen,
      currentTourStep: currentTourStep?.id,
      isCurrentStep,
    });
  }, [isTourActive, currentStep, zone, screen, currentTourStep, isCurrentStep]);

  useEffect(() => {
    if (isCurrentStep) {
      // Entrance animation with fun bounces
      Animated.sequence([
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.spring(slideAnim, {
            toValue: 0,
            tension: 100,
            friction: 8,
            useNativeDriver: true,
          }),
        ]),
        // Icon bounce animation
        Animated.spring(iconBounceAnim, {
          toValue: 1,
          tension: 200,
          friction: 4,
          useNativeDriver: true,
        }),
      ]).start();

      // Progress animation
      Animated.timing(progressAnim, {
        toValue: (currentStep + 1) / tourSteps.length,
        duration: 800,
        useNativeDriver: false,
      }).start();

      // Confetti for completion
      if (currentStep === tourSteps.length - 1) {
        setTimeout(() => {
          Animated.timing(confettiAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }).start();
        }, 500);
      }
    } else {
      // Reset animations
      fadeAnim.setValue(0);
      slideAnim.setValue(50);
      iconBounceAnim.setValue(0);
      confettiAnim.setValue(0);
    }
  }, [isCurrentStep, currentStep]);

  const handleButtonPress = (callback: () => void) => {
    // Simple button press with slight delay for feedback
    setTimeout(callback, 100);
  };

  const getStepIcon = () => {
    const icons = ["🏠", "💰", "📊", "👥"];
    return icons[currentStep] || "🎯";
  };

  const getStepEmoji = () => {
    const emojis = ["✨", "🚀", "💡", "🎉"];
    return emojis[currentStep] || "✨";
  };

  if (!isCurrentStep) {
    return <>{children}</>;
  }

  return (
    <>
      {children}

      {/* Professional Modal-Based Tour */}
      <Modal
        visible={isCurrentStep}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={false}
      >
        <SafeAreaView style={styles.modalContainer}>
          {/* Backdrop with spotlight effect */}
          <View style={styles.backdrop}>
            {/* Spotlight overlay */}
            <View style={styles.spotlightOverlay} />
          </View>

          {/* Tour Content */}
          <Animated.View
            style={[
              styles.tourModal,
              {
                backgroundColor: colors.background,
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Confetti overlay for completion */}
            {currentStep === tourSteps.length - 1 && (
              <Animated.View
                style={[
                  styles.confettiOverlay,
                  {
                    opacity: confettiAnim,
                    transform: [
                      {
                        scale: confettiAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1.2],
                        }),
                      },
                    ],
                  },
                ]}
              >
                <Text style={styles.confettiText}>🎉</Text>
                <Text style={styles.confettiText}>✨</Text>
                <Text style={styles.confettiText}>🎊</Text>
                <Text style={styles.confettiText}>🌟</Text>
              </Animated.View>
            )}

            {/* Progress indicator */}
            <View style={styles.progressContainer}>
              <View
                style={[
                  styles.progressTrack,
                  { backgroundColor: colors.border },
                ]}
              >
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      backgroundColor: colors.primary,
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["0%", "100%"],
                      }),
                    },
                  ]}
                />
              </View>
              <Text
                style={[styles.progressText, { color: colors.textSecondary }]}
              >
                {currentStep + 1} of {tourSteps.length} {getStepEmoji()}
              </Text>
            </View>

            {/* Fun Icon with bounce */}
            <Animated.View
              style={[
                styles.iconContainer,
                {
                  backgroundColor: colors.primary + "15",
                  transform: [
                    {
                      scale: iconBounceAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.3, 1],
                      }),
                    },
                    {
                      rotate: iconBounceAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["-10deg", "0deg"],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Text style={styles.emojiIcon}>{getStepIcon()}</Text>
            </Animated.View>

            {/* Title with emoji */}
            <Text style={[styles.title, { color: colors.text }]}>
              {getStepEmoji()} {currentTourStep?.title}
            </Text>

            {/* Description */}
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {currentTourStep?.description}
            </Text>

            {/* Controls */}
            <View style={styles.controls}>
              <TouchableOpacity
                style={[styles.secondaryButton, { borderColor: colors.border }]}
                onPress={() => handleButtonPress(skipTour)}
              >
                <Text
                  style={[
                    styles.secondaryButtonText,
                    { color: colors.textSecondary },
                  ]}
                >
                  Maybe Later 😊
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  { backgroundColor: colors.primary },
                ]}
                onPress={() => handleButtonPress(() => nextStep(navigation))}
              >
                <Text
                  style={[
                    styles.primaryButtonText,
                    { color: colors.buttonText },
                  ]}
                >
                  {currentStep === tourSteps.length - 1
                    ? "Let's Go! 🚀"
                    : "Awesome! 👉"}
                </Text>
                <Ionicons
                  name="arrow-forward"
                  size={20}
                  color={colors.buttonText}
                  style={styles.buttonIcon}
                />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  spotlightOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
  },
  tourModal: {
    margin: 20,
    padding: 24,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    maxWidth: screenWidth - 40,
    width: screenWidth - 40,
  },
  progressContainer: {
    marginBottom: 24,
    alignItems: "center",
  },
  progressTrack: {
    height: 4,
    width: "100%",
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: "center",
    opacity: 0.8,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 8,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    marginRight: 6,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  primaryButton: {
    flex: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginLeft: 6,
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    marginRight: 6,
  },
  buttonIcon: {
    marginLeft: 2,
  },
  confettiOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    pointerEvents: "none",
  },
  confettiText: {
    position: "absolute",
    fontSize: 30,
    opacity: 0.8,
  },
  emojiIcon: {
    fontSize: 40,
    textAlign: "center",
  },
});
