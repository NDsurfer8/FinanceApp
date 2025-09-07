import React from "react";
import { View, Text, StyleSheet, Dimensions, Image } from "react-native";
import AppIntroSlider from "react-native-app-intro-slider";
import { Ionicons } from "@expo/vector-icons";
import { VectraAvatar } from "../components/VectraAvatar";

const { width, height } = Dimensions.get("window");

interface IntroSlide {
  key: string;
  title: string;
  text: string;
  icon: keyof typeof Ionicons.glyphMap;
  backgroundColor: string;
}

const slides: IntroSlide[] = [
  {
    key: "1",
    title: "🤖 Meet Vectra AI",
    text: "Chat with your AI financial advisor anytime. Ask questions about budgeting, get spending insights, and receive personalized financial advice tailored to your finances.",
    icon: "chatbubble-ellipses",
    backgroundColor: "#06b6d4",
  },
  {
    key: "2",
    title: "💰 Master Your Money",
    text: "Transform your financial life with powerful tracking tools. Compare your expenses to your customized budget.",
    icon: "rocket",
    backgroundColor: "#6366f1",
  },
  {
    key: "3",
    title: "📊 Real-Time Budget Tracking",
    text: "See exactly where your money goes with live budget monitoring. Get instant alerts when you're approaching spending limits in any category.",
    icon: "analytics",
    backgroundColor: "#10b981",
  },
  {
    key: "4",
    title: "🎯 Goal Progress Tracking",
    text: "Set savings goals like vacations, emergency funds, or major purchases. Track your progress with visual charts and stay motivated to stay on target.",
    icon: "trophy",
    backgroundColor: "#f59e0b",
  },
  {
    key: "5",
    title: "🔒 Bank-Level Security",
    text: "Sleep soundly knowing your financial data is protected with military-grade encryption",
    icon: "lock-closed",
    backgroundColor: "#ef4444",
  },
  {
    key: "6",
    title: "👥 Shared Finance Groups",
    text: "Create shared finance groups with partners or family. Track joint expenses, shared budgets, and work together toward common financial goals.",
    icon: "people-circle",
    backgroundColor: "#8b5cf6",
  },
];

interface IntroSliderScreenProps {
  onDone: () => void;
}

export const IntroSliderScreen: React.FC<IntroSliderScreenProps> = ({
  onDone,
}) => {
  const renderItem = ({ item }: { item: IntroSlide }) => {
    return (
      <View style={[styles.slide, { backgroundColor: item.backgroundColor }]}>
        <View style={styles.iconContainer}>
          {item.key === "1" ? (
            <VectraAvatar size={120} />
          ) : (
            <Ionicons name={item.icon} size={120} color="white" />
          )}
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.text}>{item.text}</Text>

        {/* AI Advice Disclaimer - Show only for Vectra AI slide */}
        {item.key === "1" && (
          <View style={styles.disclaimerContainer}>
            <Text style={styles.disclaimerText}>
              ⚠️ AI advice is for informational purposes only. Consult qualified
              professionals for financial decisions.
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderNextButton = () => {
    return (
      <View style={styles.buttonCircle}>
        <Ionicons
          name="arrow-forward"
          color="rgba(255, 255, 255, .9)"
          size={24}
        />
      </View>
    );
  };

  const renderDoneButton = () => {
    return (
      <View style={styles.buttonCircle}>
        <Ionicons name="checkmark" color="rgba(255, 255, 255, .9)" size={24} />
      </View>
    );
  };

  const renderSkipButton = () => {
    return (
      <View style={styles.skipButton}>
        <Text style={styles.skipText}>Skip</Text>
      </View>
    );
  };

  return (
    <AppIntroSlider
      data={slides}
      renderItem={renderItem}
      renderDoneButton={renderDoneButton}
      renderNextButton={renderNextButton}
      renderSkipButton={renderSkipButton}
      onDone={onDone}
      onSkip={onDone}
      showSkipButton
      dotStyle={styles.dot}
      activeDotStyle={styles.activeDot}
    />
  );
};

const styles = StyleSheet.create({
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  iconContainer: {
    marginBottom: 50,
    alignItems: "center",
    justifyContent: "center",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "white",
    textAlign: "center",
    marginBottom: 24,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: -0.5,
  },
  text: {
    fontSize: 18,
    color: "rgba(255, 255, 255, 0.9)",
    textAlign: "center",
    lineHeight: 28,
    fontWeight: "500",
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  buttonCircle: {
    width: 56,
    height: 56,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  skipButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 20,
  },
  skipText: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 16,
    fontWeight: "700",
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  dot: {
    backgroundColor: "rgba(255, 255, 255, 0.4)",
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 3,
    marginRight: 3,
    marginTop: 3,
    marginBottom: 3,
  },
  activeDot: {
    backgroundColor: "white",
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 3,
    marginRight: 3,
    marginTop: 3,
    marginBottom: 3,
  },
  disclaimerContainer: {
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  disclaimerText: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    lineHeight: 16,
    fontWeight: "500",
    fontStyle: "italic",
  },
});
