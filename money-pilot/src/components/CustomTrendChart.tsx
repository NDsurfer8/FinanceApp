import React from "react";
import { View, Text, Dimensions } from "react-native";

const { width } = Dimensions.get("window");
const CHART_WIDTH = width - 80;
const CHART_HEIGHT = 200;
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

export const CustomTrendChart: React.FC<CustomTrendChartProps> = ({
  incomeData,
  expensesData,
  netWorthData,
  height = 250,
}) => {
  if (!incomeData.length) {
    return (
      <View style={{ height, justifyContent: "center", alignItems: "center" }}>
        <Text style={{ color: "#6b7280", fontSize: 16 }}>
          No data available for trend analysis
        </Text>
      </View>
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
      PADDING + (index / (incomeData.length - 1)) * (CHART_WIDTH - 2 * PADDING)
    );
  };

  // Create line segments using Views
  const createLineSegments = (data: DataPoint[], color: string) => {
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
            height: 3,
            backgroundColor: color,
            transform: [{ rotate: `${angle}deg` }],
            transformOrigin: "0 0",
          }}
        />
      );
    }
    return segments;
  };

  // Create data points using Views
  const createDataPoints = (data: DataPoint[], color: string) => {
    return data.map((point, index) => (
      <View
        key={`point-${index}`}
        style={{
          position: "absolute",
          left: getXPosition(index) - 4,
          top: getYPosition(point.y) - 4,
          width: 8,
          height: 8,
          backgroundColor: color,
          borderRadius: 4,
          borderWidth: 2,
          borderColor: "#ffffff",
        }}
      />
    ));
  };

  return (
    <View style={{ height }}>
      <View
        style={{
          width: CHART_WIDTH,
          height: CHART_HEIGHT,
          position: "relative",
        }}
      >
        {/* Grid lines */}
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
                  backgroundColor: "#e5e7eb",
                }}
              />
              <Text
                style={{
                  position: "absolute",
                  left: PADDING - 50,
                  top: y - 8,
                  fontSize: 10,
                  color: "#6b7280",
                  textAlign: "right",
                  width: 45,
                }}
              >
                ${Math.round(value).toLocaleString()}
              </Text>
            </React.Fragment>
          );
        })}

        {/* X-axis labels */}
        {incomeData.map((point, index) => (
          <Text
            key={`x-label-${index}`}
            style={{
              position: "absolute",
              left: getXPosition(index) - 15,
              top: CHART_HEIGHT - 20,
              fontSize: 10,
              color: "#6b7280",
              textAlign: "center",
              width: 30,
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

        {/* Net Worth line and points */}
        {createLineSegments(netWorthData, "#3b82f6")}
        {createDataPoints(netWorthData, "#3b82f6")}
      </View>

      {/* Legend */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-around",
          marginTop: 20,
          paddingHorizontal: 8,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              width: 12,
              height: 12,
              backgroundColor: "#10b981",
              borderRadius: 6,
              marginRight: 6,
            }}
          />
          <Text style={{ fontSize: 12, color: "#6b7280", fontWeight: "500" }}>
            Income
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              width: 12,
              height: 12,
              backgroundColor: "#ef4444",
              borderRadius: 6,
              marginRight: 6,
            }}
          />
          <Text style={{ fontSize: 12, color: "#6b7280", fontWeight: "500" }}>
            Expenses
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              width: 12,
              height: 12,
              backgroundColor: "#3b82f6",
              borderRadius: 6,
              marginRight: 6,
            }}
          />
          <Text style={{ fontSize: 12, color: "#6b7280", fontWeight: "500" }}>
            Net Worth
          </Text>
        </View>
      </View>
    </View>
  );
};
