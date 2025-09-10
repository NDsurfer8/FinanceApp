import React from "react";
import { Text, TextProps, StyleSheet } from "react-native";

interface TextWrapperProps extends TextProps {
  children: React.ReactNode;
  maxLines?: number;
  ellipsizeMode?: "head" | "middle" | "tail" | "clip";
  allowFontScaling?: boolean;
}

export const TextWrapper: React.FC<TextWrapperProps> = ({
  children,
  maxLines = 1,
  ellipsizeMode = "tail",
  allowFontScaling = true,
  style,
  ...props
}) => {
  return (
    <Text
      style={[styles.text, style]}
      numberOfLines={maxLines}
      ellipsizeMode={ellipsizeMode}
      allowFontScaling={allowFontScaling}
      {...props}
    >
      {children}
    </Text>
  );
};

const styles = StyleSheet.create({
  text: {
    // Base text styles
  },
});
