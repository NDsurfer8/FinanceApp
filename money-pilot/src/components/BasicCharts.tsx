import React from "react";
import { View, Text, Dimensions } from "react-native";

const { width } = Dimensions.get("window");

interface ChartData {
  x: string;
  y: number;
}

interface BasicBarChartProps {
  data: ChartData[];
  title: string;
  height?: number;
}

interface BasicLineChartProps {
  data: ChartData[];
  data2?: ChartData[];
  title: string;
  height?: number;
}

export const BasicBarChart: React.FC<BasicBarChartProps> = ({
  data,
  title,
  height = 220,
}) => {
  const maxValue = Math.max(...data.map(d => d.y));
  const barWidth = (width - 80) / data.length - 10;

  return (
    <View style={{ height }}>
      <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 16 }}>
        {title}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "flex-end", height: 150, paddingHorizontal: 20 }}>
        {data.map((item, index) => {
          const barHeight = (item.y / maxValue) * 120;
          return (
            <View key={index} style={{ flex: 1, alignItems: "center", marginHorizontal: 5 }}>
              <View
                style={{
                  width: barWidth,
                  height: barHeight,
                  backgroundColor: "#6366f1",
                  borderRadius: 4,
                  marginBottom: 8,
                }}
              />
              <Text style={{ fontSize: 10, color: "#6b7280", textAlign: "center" }}>
                {item.x}
              </Text>
              <Text style={{ fontSize: 10, color: "#374151", fontWeight: "600" }}>
                ${item.y.toLocaleString()}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

export const BasicLineChart: React.FC<BasicLineChartProps> = ({
  data,
  data2,
  title,
  height = 200,
}) => {
  const maxValue = Math.max(
    ...data.map(d => d.y),
    ...(data2 ? data2.map(d => d.y) : [0])
  );
  const minValue = Math.min(
    ...data.map(d => d.y),
    ...(data2 ? data2.map(d => d.y) : [0])
  );
  const range = maxValue - minValue;

  const getYPosition = (value: number) => {
    return 140 - ((value - minValue) / range) * 120;
  };

  return (
    <View style={{ height }}>
      <Text style={{ fontSize: 16, fontWeight: "600", marginBottom: 16 }}>
        {title}
      </Text>
      <View style={{ height: 150, paddingHorizontal: 20, paddingVertical: 10 }}>
        {/* Y-axis labels */}
        <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, justifyContent: "space-between" }}>
          <Text style={{ fontSize: 10, color: "#6b7280" }}>${maxValue.toLocaleString()}</Text>
          <Text style={{ fontSize: 10, color: "#6b7280" }}>${((maxValue + minValue) / 2).toLocaleString()}</Text>
          <Text style={{ fontSize: 10, color: "#6b7280" }}>${minValue.toLocaleString()}</Text>
        </View>
        
        {/* Chart area */}
        <View style={{ marginLeft: 40, height: 120, position: "relative" }}>
          {/* Grid lines */}
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, backgroundColor: "#e5e7eb" }} />
          <View style={{ position: "absolute", top: 60, left: 0, right: 0, height: 1, backgroundColor: "#e5e7eb" }} />
          <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1, backgroundColor: "#e5e7eb" }} />
          
          {/* Data points and lines */}
          <View style={{ flexDirection: "row", alignItems: "flex-end", height: 120 }}>
            {data.map((item, index) => {
              const xPosition = (index / (data.length - 1)) * (width - 120);
              const yPosition = getYPosition(item.y);
              
              return (
                <View key={index} style={{ position: "absolute", left: xPosition }}>
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: "#10b981",
                      position: "absolute",
                      top: yPosition - 3,
                    }}
                  />
                  {index > 0 && (
                    <View
                      style={{
                        position: "absolute",
                        left: 3,
                        top: yPosition,
                        width: xPosition - (data[index - 1] ? (data[index - 1].x ? (index - 1) / (data.length - 1) * (width - 120) : 0) : 0),
                        height: 2,
                        backgroundColor: "#10b981",
                      }}
                    />
                  )}
                </View>
              );
            })}
          </View>
          
          {/* X-axis labels */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
            {data.map((item, index) => (
              <Text key={index} style={{ fontSize: 10, color: "#6b7280", flex: 1, textAlign: "center" }}>
                {item.x}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};
