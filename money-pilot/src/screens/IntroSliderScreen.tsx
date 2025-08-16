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
    title: "Track Your Money",
    text: "Get a clear view of your income, expenses, and net worth in one place",
    icon: "trending-up",
    backgroundColor: "#6366f1",
  },
  {
    key: "2",
    title: "Smart Insights",
    text: "Understand your spending patterns with beautiful charts and analytics",
    icon: "pie-chart",
    backgroundColor: "#10b981",
  },
  {
    key: "3",
    title: "Financial Health",
    text: "Monitor your debt-to-asset ratio and financial wellness metrics",
    icon: "heart",
    backgroundColor: "#f59e0b",
  },
  {
    key: "4",
    title: "Secure & Private",
    text: "Your financial data stays private and secure with bank-level encryption",
    icon: "shield-checkmark",
    backgroundColor: "#ef4444",
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
    marginBottom: 40,
    alignItems: "center",
    justifyContent: "center",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
    marginBottom: 20,
  },
  text: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    lineHeight: 24,
  },
  buttonCircle: {
    width: 44,
    height: 44,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  skipButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  skipText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 16,
    fontWeight: "600",
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
