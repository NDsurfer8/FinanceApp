import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../hooks/useAuth";
import { useFocusEffect } from "@react-navigation/native";

const { width: screenWidth } = Dimensions.get("window");

interface HelpfulTooltipProps {
  children: React.ReactNode;
  tooltipId: string;
  title: string;
  description: string;
  position?: "top" | "bottom" | "left" | "right";
  showOnce?: boolean;
  delay?: number;
}

export const HelpfulTooltip: React.FC<HelpfulTooltipProps> = ({
  children,
  tooltipId,
  title,
  description,
  position = "top",
  showOnce = true,
  delay = 1000,
}) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [hasShown, setHasShown] = useState(false);
  const [showTooltips, setShowTooltips] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  // Function to load tooltips setting from AsyncStorage
  const loadTooltipsSetting = async () => {
    if (!user) return;

    try {
      const saved = await AsyncStorage.getItem(`show_tooltips_${user.uid}`);
      if (saved !== null) {
        setShowTooltips(saved === "true");
      } else {
        // Default to false for new users (no tooltips)
        setShowTooltips(false);
      }
    } catch (error) {
      console.error("Error loading tooltips setting:", error);
      setShowTooltips(false);
    }
  };

  // Load tooltips setting on mount
  useEffect(() => {
    loadTooltipsSetting();
  }, [user]);

  // Reload tooltips setting when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadTooltipsSetting();
    }, [user])
  );

  useEffect(() => {
    if (showTooltips && !hasShown) {
      const timer = setTimeout(() => {
        setIsVisible(true);
        setHasShown(true);

        // Animate in
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 100,
            friction: 8,
            useNativeDriver: true,
          }),
        ]).start();
      }, delay);

      return () => clearTimeout(timer);
    }
  }, [showTooltips, hasShown, delay]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsVisible(false);
    });
  };

  if (!showTooltips || !isVisible) {
    return <>{children}</>;
  }

  const getTooltipStyle = (): any => {
    const baseStyle = {
      position: "absolute" as const,
      zIndex: 1000,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      maxWidth: screenWidth * 0.85,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 12,
      borderWidth: 1,
      borderColor: colors.primary + "20",
    };

    switch (position) {
      case "top":
        return { ...baseStyle, bottom: "100%", marginBottom: 8 };
      case "bottom":
        return { ...baseStyle, top: "100%", marginTop: 8 };
      case "left":
        return { ...baseStyle, right: "100%", marginRight: 8 };
      case "right":
        return { ...baseStyle, left: "100%", marginLeft: 8 };
      default:
        return { ...baseStyle, bottom: "100%", marginBottom: 8 };
    }
  };

  const getArrowStyle = (): any => {
    const baseStyle = {
      position: "absolute" as const,
      width: 0,
      height: 0,
    };

    switch (position) {
      case "top":
        return {
          ...baseStyle,
          top: "100%",
          left: "50%",
          marginLeft: -8,
          borderLeftWidth: 8,
          borderRightWidth: 8,
          borderTopWidth: 8,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderTopColor: colors.surface,
        };
      case "bottom":
        return {
          ...baseStyle,
          bottom: "100%",
          left: "50%",
          marginLeft: -8,
          borderLeftWidth: 8,
          borderRightWidth: 8,
          borderBottomWidth: 8,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderBottomColor: colors.surface,
        };
      case "left":
        return {
          ...baseStyle,
          left: "100%",
          top: "50%",
          marginTop: -8,
          borderTopWidth: 8,
          borderBottomWidth: 8,
          borderLeftWidth: 8,
          borderTopColor: "transparent",
          borderBottomColor: "transparent",
          borderLeftColor: colors.surface,
        };
      case "right":
        return {
          ...baseStyle,
          right: "100%",
          top: "50%",
          marginTop: -8,
          borderTopWidth: 8,
          borderBottomWidth: 8,
          borderRightWidth: 8,
          borderTopColor: "transparent",
          borderBottomColor: "transparent",
          borderRightColor: colors.surface,
        };
      default:
        return {
          ...baseStyle,
          top: "100%",
          left: "50%",
          marginLeft: -8,
          borderLeftWidth: 8,
          borderRightWidth: 8,
          borderTopWidth: 8,
          borderLeftColor: "transparent",
          borderRightColor: "transparent",
          borderTopColor: colors.surface,
        };
    }
  };

  return (
    <View style={styles.container}>
      {children}
      <Animated.View
        style={[
          getTooltipStyle(),
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={getArrowStyle()} />
        <View style={styles.tooltipHeader}>
          <View style={styles.titleContainer}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: colors.primary + "15" },
              ]}
            >
              <Ionicons name="bulb" size={16} color={colors.primary} />
            </View>
            <Text style={[styles.tooltipTitle, { color: colors.text }]}>
              {title}
            </Text>
          </View>
          <TouchableOpacity onPress={handleDismiss} style={styles.closeButton}>
            <Ionicons name="close" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <Text
          style={[styles.tooltipDescription, { color: colors.textSecondary }]}
        >
          {description}
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  tooltipHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  tooltipTitle: {
    fontSize: 17,
    fontWeight: "700",
    flex: 1,
  },
  closeButton: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  tooltipDescription: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "400",
  },
});
