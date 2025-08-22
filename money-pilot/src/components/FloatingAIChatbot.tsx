import React from "react";
import { TouchableOpacity, Animated, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../contexts/ThemeContext";
import { useChatbot } from "../contexts/ChatbotContext";

export const FloatingAIChatbot: React.FC = () => {
  const { isVisible } = useChatbot();
  const navigation = useNavigation();
  const { colors } = useTheme();

  // Animation values
  const scale = React.useRef(new Animated.Value(1)).current;
  const opacity = React.useRef(new Animated.Value(1)).current;

  // Animate in when component mounts and add subtle pulse
  React.useEffect(() => {
    if (isVisible) {
      // Initial animation
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Subtle pulse animation every 3 seconds
      const pulseInterval = setInterval(() => {
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.05,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }, 3000);

      return () => clearInterval(pulseInterval);
    }
  }, [isVisible]);

  // Handle press to open AI advisor
  const handlePress = () => {
    // Animate press effect
    Animated.sequence([
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 0.9,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(scale, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Navigate to AI advisor screen
    navigation.navigate("AIFinancialAdvisor" as never);
  };

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale }],
          opacity,
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.chatbotButton,
          {
            backgroundColor: colors.primary,
            shadowColor: colors.primary,
          },
        ]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Ionicons name="chatbubble-ellipses" size={24} color="white" />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 100, // Above the tab bar
    right: 20,
    zIndex: 1000,
  },
  chatbotButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
