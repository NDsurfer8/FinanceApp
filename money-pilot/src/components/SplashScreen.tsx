import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  Image,
} from "react-native";
import Constants from "expo-constants";
import { fontFamily } from "../config/fonts";

interface SplashScreenProps {
  message?: string;
}

const { width, height } = Dimensions.get("window");

export const SplashScreen: React.FC<SplashScreenProps> = ({
  message = "Loading VectorFi...",
}) => {
  const bounceAnim1 = useRef(new Animated.Value(0)).current;
  const bounceAnim2 = useRef(new Animated.Value(0)).current;
  const bounceAnim3 = useRef(new Animated.Value(0)).current;
  const bounceAnim4 = useRef(new Animated.Value(0)).current;
  const bounceAnim5 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createBounceAnimation = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
    };

    // Start all bounce animations with different delays
    createBounceAnimation(bounceAnim1, 0).start();
    createBounceAnimation(bounceAnim2, 200).start();
    createBounceAnimation(bounceAnim3, 400).start();
    createBounceAnimation(bounceAnim4, 600).start();
    createBounceAnimation(bounceAnim5, 800).start();
  }, []);

  const moneyEmojis = ["💰", "💵", "💎", "🏦", "💳"];

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* App Logo/Icon */}
        <View style={styles.logoContainer}>
          <Image
            source={require("../../assets/ios/icon-1024.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>VectorFi</Text>
        </View>

        {/* Bouncing Money Animation */}
        <View style={styles.bouncingContainer}>
          <Animated.View
            style={[
              styles.moneyItem,
              {
                transform: [
                  {
                    translateY: bounceAnim1.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -30],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.moneyEmoji}>{moneyEmojis[0]}</Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.moneyItem,
              {
                transform: [
                  {
                    translateY: bounceAnim2.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -30],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.moneyEmoji}>{moneyEmojis[1]}</Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.moneyItem,
              {
                transform: [
                  {
                    translateY: bounceAnim3.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -30],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.moneyEmoji}>{moneyEmojis[2]}</Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.moneyItem,
              {
                transform: [
                  {
                    translateY: bounceAnim4.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -30],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.moneyEmoji}>{moneyEmojis[3]}</Text>
          </Animated.View>

          <Animated.View
            style={[
              styles.moneyItem,
              {
                transform: [
                  {
                    translateY: bounceAnim5.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -30],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.moneyEmoji}>{moneyEmojis[4]}</Text>
          </Animated.View>
        </View>

        {/* Loading Text */}
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>{message}</Text>
        </View>

        {/* Version Info */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>
            Version {Constants?.expoConfig?.version ?? ""}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  appName: {
    fontFamily: fontFamily.extraBold,
    fontSize: 32,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: -0.5,
  },
  bouncingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
    height: 60,
  },
  moneyItem: {
    marginHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  moneyEmoji: {
    fontSize: 32,
  },
  loadingContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  loadingText: {
    fontFamily: fontFamily.medium,
    fontSize: 16,
    color: "#374151",
    fontWeight: "500",
    textAlign: "center",
  },
  versionContainer: {
    position: "absolute",
    bottom: 40,
    alignItems: "center",
  },
  versionText: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: "#6b7280",
    opacity: 0.8,
  },
});
