import React, { useEffect, useRef } from "react";
import { View, Text, Dimensions, Animated } from "react-native";
import { useTheme } from "../contexts/ThemeContext";

const { width } = Dimensions.get("window");
const CHART_WIDTH = width - 80;
const CHART_HEIGHT = 180;
const PADDING = 40;

interface DataPoint {
  x: string;
  y: number;
}

interface CustomTrendChartProps {
  incomeData: DataPoint[];
  expensesData: DataPoint[];
  netWorthData: DataPoint[];
  height?: number;
}

// Utility function to format large numbers with K, M, B suffixes
const formatLargeNumber = (num: number): string => {
  if (num >= 1000000000) {
    return `$${(num / 1000000000).toFixed(1)}B`;
  } else if (num >= 1000000) {
    return `$${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `$${(num / 1000).toFixed(1)}K`;
  } else {
    return `$${Math.round(num).toLocaleString()}`;
  }
};

export const CustomTrendChart: React.FC<CustomTrendChartProps> = React.memo(
  ({ incomeData, expensesData, netWorthData, height = 280 }) => {
    const { colors } = useTheme();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.8)).current;

    useEffect(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    }, [incomeData, expensesData, netWorthData]);

    if (!incomeData.length) {
      return (
        <Animated.View
          style={{
            height,
            justifyContent: "center",
            alignItems: "center",
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          }}
        >
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: 24,
              shadowColor: colors.shadow,
              shadowOpacity: 0.1,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 8,
            }}
          >
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 16,
                fontWeight: "500",
                textAlign: "center",
              }}
            >
              📊 No data available for trend analysis
            </Text>
          </View>
        </Animated.View>
      );
    }

    // Find min and max values for scaling
    const allValues = [
      ...incomeData.map((d) => d.y),
      ...expensesData.map((d) => d.y),
      ...netWorthData.map((d) => d.y),
    ].filter((val) => val !== undefined && val !== null);

    const minValue = Math.min(...allValues, 0);
    const maxValue = Math.max(...allValues, 1000); // Ensure we have some range
    const valueRange = maxValue - minValue;

    // Calculate positions
    const getYPosition = (value: number) => {
      return (
        CHART_HEIGHT -
        PADDING -
        ((value - minValue) / valueRange) * (CHART_HEIGHT - 2 * PADDING)
      );
    };

    const getXPosition = (index: number) => {
      return (
        PADDING +
        (index / (incomeData.length - 1)) * (CHART_WIDTH - 2 * PADDING)
      );
    };

    // Create line segments using Views with enhanced styling
    const createLineSegments = (
      data: DataPoint[],
      color: string,
      isNetWorth: boolean = false
    ) => {
      const segments = [];
      for (let i = 1; i < data.length; i++) {
        const x1 = getXPosition(i - 1);
        const y1 = getYPosition(data[i - 1].y);
        const x2 = getXPosition(i);
        const y2 = getYPosition(data[i].y);

        // Calculate line length and angle
        const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);

        segments.push(
          <View
            key={`line-${i}`}
            style={{
              position: "absolute",
              left: x1,
              top: y1,
              width: length,
              height: isNetWorth ? 4 : 3,
              backgroundColor: color,
              transform: [{ rotate: `${angle}deg` }],
              transformOrigin: "0 0",
              shadowColor: color,
              shadowOpacity: 0.3,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 2 },
              elevation: 4,
            }}
          />
        );
      }
      return segments;
    };

    // Create data points using Views with enhanced styling
    const createDataPoints = (
      data: DataPoint[],
      color: string,
      isNetWorth: boolean = false
    ) => {
      return data.map((point, index) => (
        <View
          key={`point-${index}`}
          style={{
            position: "absolute",
            left: getXPosition(index) - (isNetWorth ? 6 : 5),
            top: getYPosition(point.y) - (isNetWorth ? 6 : 5),
            width: isNetWorth ? 12 : 10,
            height: isNetWorth ? 12 : 10,
            backgroundColor: color,
            borderRadius: isNetWorth ? 6 : 5,
            borderWidth: 3,
            borderColor: colors.background,
            shadowColor: color,
            shadowOpacity: 0.4,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 3 },
            elevation: 6,
          }}
        />
      ));
    };

    return (
      <Animated.View
        style={{
          height,
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        }}
      >
        {/* Background gradient effect */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            borderRadius: 16,
            backgroundColor: colors.surface,
            opacity: 0.8,
          }}
        />

        {/* Grid lines with enhanced styling */}
        {[0, 1, 2, 3, 4].map((i) => {
          const y = PADDING + (i / 4) * (CHART_HEIGHT - 2 * PADDING);
          const value = maxValue - (i / 4) * valueRange;
          return (
            <React.Fragment key={`grid-${i}`}>
              <View
                style={{
                  position: "absolute",
                  left: PADDING,
                  top: y,
                  width: CHART_WIDTH - 2 * PADDING,
                  height: 1,
                  backgroundColor: colors.border,
                  opacity: 0.3,
                }}
              />
              <Text
                style={{
                  position: "absolute",
                  left: PADDING - 55,
                  top: y - 10,
                  fontSize: 11,
                  color: colors.textSecondary,
                  textAlign: "right",
                  width: 50,
                  fontWeight: "600",
                }}
              >
                {formatLargeNumber(Math.round(value))}
              </Text>
            </React.Fragment>
          );
        })}

        {/* X-axis labels with enhanced styling */}
        {incomeData.map((point, index) => (
          <Text
            key={`x-label-${index}`}
            style={{
              position: "absolute",
              left: getXPosition(index) - 18,
              top: CHART_HEIGHT - 25,
              fontSize: 11,
              color: colors.textSecondary,
              textAlign: "center",
              width: 36,
              fontWeight: "600",
            }}
          >
            {point.x}
          </Text>
        ))}

        {/* Income line and points */}
        {createLineSegments(incomeData, "#10b981")}
        {createDataPoints(incomeData, "#10b981")}

        {/* Expenses line and points */}
        {createLineSegments(expensesData, "#ef4444")}
        {createDataPoints(expensesData, "#ef4444")}

        {/* Net Worth line and points (emphasized) */}
        {createLineSegments(netWorthData, "#3b82f6", true)}
        {createDataPoints(netWorthData, "#3b82f6", true)}

        {/* Enhanced Legend */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-around",
            marginTop: CHART_HEIGHT + 10,
            paddingHorizontal: 12,
            paddingVertical: 12,
            backgroundColor: colors.background,
            borderRadius: 12,
            shadowColor: colors.shadow,
            shadowOpacity: 0.08,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 2 },
            elevation: 4,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                width: 14,
                height: 14,
                backgroundColor: "#10b981",
                borderRadius: 7,
                marginRight: 8,
                shadowColor: "#10b981",
                shadowOpacity: 0.3,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 2 },
                elevation: 3,
              }}
            />
            <Text
              style={{
                fontSize: 13,
                color: colors.text,
                fontWeight: "600",
              }}
            >
              Income
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                width: 14,
                height: 14,
                backgroundColor: "#ef4444",
                borderRadius: 7,
                marginRight: 8,
                shadowColor: "#ef4444",
                shadowOpacity: 0.3,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 2 },
                elevation: 3,
              }}
            />
            <Text
              style={{
                fontSize: 13,
                color: colors.text,
                fontWeight: "600",
              }}
            >
              Expenses
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View
              style={{
                width: 16,
                height: 16,
                backgroundColor: "#3b82f6",
                borderRadius: 8,
                marginRight: 8,
                shadowColor: "#3b82f6",
                shadowOpacity: 0.4,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 3 },
                elevation: 4,
              }}
            />
            <Text
              style={{
                fontSize: 13,
                color: colors.text,
                fontWeight: "700",
              }}
            >
              Net Worth
            </Text>
          </View>
        </View>
      </Animated.View>
    );
  }
);
