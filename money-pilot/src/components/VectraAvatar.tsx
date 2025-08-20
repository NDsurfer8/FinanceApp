import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface VectraAvatarProps {
  size?: number;
  showName?: boolean;
}

export const VectraAvatar: React.FC<VectraAvatarProps> = ({
  size = 32,
  showName = false,
}) => {
  return (
    <View style={styles.container}>
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
      {showName && <Text style={styles.name}>Vectra</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  avatar: {
    backgroundColor: "#6366f1",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  avatarText: {
    color: "#fff",
    fontWeight: "bold",
    fontFamily: "System",
  },
  name: {
    fontSize: 10,
    color: "#6b7280",
    marginTop: 2,
    fontWeight: "500",
  },
});
