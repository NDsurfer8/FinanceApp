import React, { useEffect } from "react";
import { View, Text, StyleSheet, Dimensions, Image } from "react-native";
import AppIntroSlider from "react-native-app-intro-slider";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { loadLanguageOnDemand } from "../config/i18n";

const { width, height } = Dimensions.get("window");

interface IntroSlide {
  key: string;
  title: string;
  text: string;
  icon: keyof typeof Ionicons.glyphMap;
  backgroundColor: string;
}

// Custom Graphics Components
const WelcomeGraphic = () => (
  <Image
    source={require("../../assets/ios/slide1.png")}
    style={{ width: 350, height: 250 }}
    resizeMode="contain"
  />
);

const PlaidGraphic = () => (
  <Image
    source={require("../../assets/ios/slide2.png")}
    style={{ width: 350, height: 250 }}
    resizeMode="contain"
  />
);

const SpendingGraphic = () => (
  <Image
    source={require("../../assets/ios/slide3.png")}
    style={{ width: 350, height: 250 }}
    resizeMode="contain"
  />
);

const SavingsGraphic = () => (
  <Image
    source={require("../../assets/ios/slide4.png")}
    style={{ width: 350, height: 250 }}
    resizeMode="contain"
  />
);

const ForecastGraphic = () => (
  <Image
    source={require("../../assets/ios/slide5.png")}
    style={{ width: 350, height: 250 }}
    resizeMode="contain"
  />
);

const SecurityGraphic = () => (
  <Image
    source={require("../../assets/ios/slide6.png")}
    style={{ width: 350, height: 250 }}
    resizeMode="contain"
  />
);

// Function to create slides with translations
const createSlides = (t: (key: string) => string): IntroSlide[] => [
  {
    key: "1",
    title: t("intro.slide1.title"),
    text: t("intro.slide1.text"),
    icon: "chatbubble-ellipses",
    backgroundColor: "#ffffff",
  },
  {
    key: "2",
    title: t("intro.slide2.title"),
    text: t("intro.slide2.text"),
    icon: "shield-checkmark",
    backgroundColor: "#ffffff",
  },
  {
    key: "3",
    title: t("intro.slide3.title"),
    text: t("intro.slide3.text"),
    icon: "analytics",
    backgroundColor: "#ffffff",
  },
  {
    key: "4",
    title: t("intro.slide4.title"),
    text: t("intro.slide4.text"),
    icon: "trophy",
    backgroundColor: "#ffffff",
  },
  {
    key: "5",
    title: t("intro.slide5.title"),
    text: t("intro.slide5.text"),
    icon: "trending-up",
    backgroundColor: "#ffffff",
  },
  {
    key: "6",
    title: t("intro.slide6.title"),
    text: t("intro.slide6.text"),
    icon: "lock-closed",
    backgroundColor: "#ffffff",
  },
];

interface IntroSliderScreenProps {
  onDone: () => void;
}

export const IntroSliderScreen: React.FC<IntroSliderScreenProps> = ({
  onDone,
}) => {
  const { t, i18n } = useTranslation();

  // Ensure language is loaded on demand
  useEffect(() => {
    const loadLanguage = async () => {
      if (i18n.language && i18n.language !== "en") {
        await loadLanguageOnDemand(i18n.language);
      }
    };
    loadLanguage();
  }, [i18n.language]);

  // Create slides with translations
  const slides = createSlides(t);
  const renderItem = ({ item }: { item: IntroSlide }) => {
    const renderCustomGraphic = () => {
      switch (item.key) {
        case "1":
          return <WelcomeGraphic />;
        case "2":
          return <PlaidGraphic />;
        case "3":
          return <SpendingGraphic />;
        case "4":
          return <SavingsGraphic />;
        case "5":
          return <ForecastGraphic />;
        case "6":
          return <SecurityGraphic />;
        default:
          return <Ionicons name={item.icon} size={120} color="white" />;
      }
    };

    return (
      <View style={[styles.slide, { backgroundColor: item.backgroundColor }]}>
        <View style={styles.graphicContainer}>{renderCustomGraphic()}</View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.text}>{item.text}</Text>

        {/* AI Advice Disclaimer - Show only for Vectra AI slide */}
        {item.key === "1" && (
          <View style={styles.disclaimerContainer}>
            <Text style={styles.disclaimerText}>
              {t("intro.ai_disclaimer")}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderNextButton = () => {
    return (
      <View style={styles.buttonCircle}>
        <Ionicons name="arrow-forward" color="white" size={24} />
      </View>
    );
  };

  const renderDoneButton = () => {
    return (
      <View style={styles.buttonCircle}>
        <Ionicons name="checkmark" color="white" size={24} />
      </View>
    );
  };

  const renderSkipButton = () => {
    return (
      <View style={styles.skipButton}>
        <Text style={styles.skipText}>{t("common.skip")}</Text>
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
    backgroundColor: "#ffffff",
  },
  graphicContainer: {
    marginBottom: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  text: {
    fontSize: 18,
    color: "#374151",
    textAlign: "center",
    lineHeight: 28,
    fontWeight: "500",
    marginBottom: 24,
    letterSpacing: 0.2,
    paddingHorizontal: 8,
  },
  buttonCircle: {
    width: 56,
    height: 56,
    backgroundColor: "#3b82f6",
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  skipButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "transparent",
    borderRadius: 20,
  },
  skipText: {
    color: "#6b7280",
    fontSize: 16,
    fontWeight: "600",
  },
  dot: {
    backgroundColor: "#d1d5db",
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 3,
    marginRight: 3,
    marginTop: 3,
    marginBottom: 3,
  },
  activeDot: {
    backgroundColor: "#1f2937",
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
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  disclaimerText: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 16,
    fontWeight: "500",
    fontStyle: "italic",
  },
});
