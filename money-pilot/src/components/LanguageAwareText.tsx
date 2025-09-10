import React from "react";
import { Text, TextProps, StyleSheet } from "react-native";
import { useLanguage } from "../contexts/LanguageContext";

interface LanguageAwareTextProps extends TextProps {
  children: React.ReactNode;
  maxLines?: number;
  ellipsizeMode?: "head" | "middle" | "tail" | "clip";
  allowFontScaling?: boolean;
}

export const LanguageAwareText: React.FC<LanguageAwareTextProps> = ({
  children,
  maxLines,
  ellipsizeMode = "tail",
  allowFontScaling = true,
  style,
  ...props
}) => {
  const { currentLanguage } = useLanguage();

  // Language-specific text handling
  const getLanguageSpecificProps = () => {
    switch (currentLanguage) {
      case "zh": // Chinese
      case "ja": // Japanese
      case "ko": // Korean (if added later)
        return {
          maxLines: maxLines || 2,
          ellipsizeMode: "tail" as const,
          allowFontScaling: false, // Prevent font scaling for CJK languages
        };
      case "ar": // Arabic
      case "he": // Hebrew (if added later)
        return {
          maxLines: maxLines || 2,
          ellipsizeMode: "tail" as const,
          allowFontScaling: true,
        };
      case "hi": // Hindi
      case "th": // Thai (if added later)
        return {
          maxLines: maxLines || 2,
          ellipsizeMode: "tail" as const,
          allowFontScaling: true,
        };
      default: // English, Spanish, Portuguese, Russian, French, German
        return {
          maxLines: maxLines || 1,
          ellipsizeMode: ellipsizeMode,
          allowFontScaling: allowFontScaling,
        };
    }
  };

  const languageProps = getLanguageSpecificProps();

  return (
    <Text
      style={[styles.text, style]}
      numberOfLines={languageProps.maxLines}
      ellipsizeMode={languageProps.ellipsizeMode}
      allowFontScaling={languageProps.allowFontScaling}
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
