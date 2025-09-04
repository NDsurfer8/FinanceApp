import React, { useState, useEffect } from "react";
import {
  TouchableOpacity,
  Animated,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../contexts/ThemeContext";
import { useChatbot } from "../contexts/ChatbotContext";

interface FloatingAIChatbotProps {
  hideOnAIScreen?: boolean;
  hideOnScroll?: boolean;
  isScrolling?: boolean;
}

export const FloatingAIChatbot: React.FC<FloatingAIChatbotProps> = ({
  hideOnAIScreen = false,
  hideOnScroll = false,
  isScrolling = false,
}) => {
  const { isVisible } = useChatbot();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [screenDimensions, setScreenDimensions] = useState(
    Dimensions.get("window")
  );

  const scale = React.useRef(new Animated.Value(1)).current;
  const opacity = React.useRef(new Animated.Value(1)).current;

  const BUBBLE_SIZE = 56;
  const BUBBLE_MARGIN = 20;
  const BOTTOM_TAB_HEIGHT = 100;
  const TOP_SAFE_MARGIN = 80;

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setScreenDimensions(window);
    });
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    if (screenDimensions.width > 0) {
      const optimalPosition = calculateOptimalPosition();
      setPosition(optimalPosition);
    }
  }, [screenDimensions]);

  // Handle scroll hiding animation
  useEffect(() => {
    if (hideOnScroll) {
      Animated.timing(opacity, {
        toValue: isScrolling ? 0 : 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isScrolling, hideOnScroll, opacity]);

  const calculateOptimalPosition = () => {
    const { width, height } = screenDimensions;

    // Preferred: bottom-right above tab bar
    const preferredX = width - BUBBLE_SIZE - BUBBLE_MARGIN;
    const preferredY = height - BUBBLE_SIZE - BUBBLE_MARGIN - BOTTOM_TAB_HEIGHT;

    if (isPositionSafe(preferredX, preferredY)) {
      return { x: preferredX, y: preferredY };
    }

    // Alternative positions
    const alternatives = [
      {
        x: BUBBLE_MARGIN,
        y: height - BUBBLE_SIZE - BUBBLE_MARGIN - BOTTOM_TAB_HEIGHT,
      },
      { x: width - BUBBLE_SIZE - BUBBLE_MARGIN, y: TOP_SAFE_MARGIN },
      { x: BUBBLE_MARGIN, y: TOP_SAFE_MARGIN },
      { x: width - BUBBLE_SIZE - BUBBLE_MARGIN, y: (height - BUBBLE_SIZE) / 2 },
      { x: BUBBLE_MARGIN, y: (height - BUBBLE_SIZE) / 2 },
    ];

    for (const pos of alternatives) {
      if (isPositionSafe(pos.x, pos.y)) {
        return pos;
      }
    }

    return { x: BUBBLE_MARGIN, y: TOP_SAFE_MARGIN };
  };

  const isPositionSafe = (x: number, y: number) => {
    if (
      x < 0 ||
      y < 0 ||
      x + BUBBLE_SIZE > screenDimensions.width ||
      y + BUBBLE_SIZE > screenDimensions.height
    ) {
      return false;
    }

    const criticalZones = [
      {
        x: 0,
        y: screenDimensions.height - BOTTOM_TAB_HEIGHT,
        width: screenDimensions.width,
        height: BOTTOM_TAB_HEIGHT,
      },
      { x: 0, y: 0, width: screenDimensions.width, height: TOP_SAFE_MARGIN },
      {
        x: screenDimensions.width / 2 - 60,
        y: screenDimensions.height - 160,
        width: 120,
        height: 80,
      },
    ];

    for (const zone of criticalZones) {
      if (
        x < zone.x + zone.width &&
        x + BUBBLE_SIZE > zone.x &&
        y < zone.y + zone.height &&
        y + BUBBLE_SIZE > zone.y
      ) {
        return false;
      }
    }

    return true;
  };

  useEffect(() => {
    if (isVisible) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    }
  }, [isVisible, scale]);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    navigation.navigate("AIFinancialAdvisor");
  };

  if (!isVisible || hideOnAIScreen || position.x === 0) return null;

  // Don't render if hiding on scroll and currently scrolling
  if (hideOnScroll && isScrolling) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale }],
          opacity,
          left: position.x,
          top: position.y,
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.chatbotButton,
          { backgroundColor: colors.primary, shadowColor: colors.primary },
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
    zIndex: 1000,
  },
  chatbotButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
});
