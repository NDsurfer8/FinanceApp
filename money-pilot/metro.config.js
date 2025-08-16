const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Add resolver configuration to handle SVG conflicts
config.resolver.assetExts.push("svg");
config.resolver.sourceExts.push("svg");

// Ensure proper module resolution
config.resolver.platforms = ["ios", "android", "native", "web"];

module.exports = config;
