import React from "react";
import { View, Text } from "react-native";

interface RatioBarProps {
  label: string;
  value: number;
}

export const RatioBar: React.FC<RatioBarProps> = ({ label, value }) => (
  <View style={{ marginBottom: 12 }}>
    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
      <Text style={{ fontSize: 13 }}>{label}</Text>
      <Text style={{ fontWeight: "600" }}>{value.toFixed(1)}%</Text>
    </View>
    <View
      style={{
        height: 10,
        backgroundColor: "#e5e7eb",
        borderRadius: 999,
        overflow: "hidden",
        marginTop: 6,
      }}
    >
      <View
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          backgroundColor: "#6366f1",
          height: 10,
        }}
      />
    </View>
  </View>
);
