import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface VectraAvatarProps {
  size?: number;
  style?: any;
}

export const VectraAvatar: React.FC<VectraAvatarProps> = ({
  size = 120,
  style,
}) => {
  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <View
        style={[
          styles.avatar,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      >
        <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>V</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    backgroundColor: "#8b5cf6",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontFamily: "System",
  },
});
