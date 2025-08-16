import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card } from "./Card";

interface StatProps {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  positive?: boolean;
}

export const Stat: React.FC<StatProps> = ({ label, value, icon, positive }) => (
  <Card>
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <View>
        <Text style={{ color: "#6b7280", fontSize: 12 }}>{label}</Text>
        <Text style={{ fontSize: 22, fontWeight: "600", marginTop: 4 }}>
          {value}
        </Text>
      </View>
      <View
        style={{
          backgroundColor: positive ? "#ecfdf5" : "#f1f5f9",
          padding: 10,
          borderRadius: 12,
        }}
      >
        <Ionicons
          name={icon}
          size={20}
          color={positive ? "#059669" : "#475569"}
        />
      </View>
    </View>
  </Card>
);
