import React from "react";
import { View, Text, StyleSheet, Dimensions, Image } from "react-native";
import AppIntroSlider from "react-native-app-intro-slider";
import { Ionicons } from "@expo/vector-icons";

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
    title: "💰 Master Your Money",
    text: "Transform your financial life with powerful tracking tools. See your wealth grow in real-time!",
    icon: "rocket",
    backgroundColor: "#6366f1",
  },
  {
    key: "2",
    title: "📊 Smart Analytics",
    text: "Unlock the secrets of your spending with AI-powered insights and stunning visualizations",
    icon: "analytics",
    backgroundColor: "#10b981",
  },
  {
    key: "3",
    title: "🎯 Crush Your Goals",
    text: "Set ambitious financial goals and watch your dreams become reality with progress tracking",
    icon: "trophy",
    backgroundColor: "#f59e0b",
  },
  {
    key: "4",
    title: "🔒 Bank-Level Security",
    text: "Sleep soundly knowing your financial data is protected with military-grade encryption",
    icon: "lock-closed",
    backgroundColor: "#ef4444",
  },
  {
    key: "5",
    title: "🚀 Team Up & Win",
    text: "Join forces with your partner, family, or friends to build wealth together and achieve financial freedom",
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
          <Ionicons name={item.icon} size={120} color="white" />
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.text}>{item.text}</Text>
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
});
