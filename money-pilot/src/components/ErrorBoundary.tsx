import React, { Component, ReactNode } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error to console for debugging
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // You can also log the error to an error reporting service here
    // Example: Sentry.captureException(error);
  }

  handleRestart = () => {
    Alert.alert("Restart App", "Would you like to restart the app?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Restart",
        onPress: () => {
          this.setState({
            hasError: false,
            error: undefined,
            errorInfo: undefined,
          });
        },
      },
    ]);
  };

  handleReportError = () => {
    // You can implement error reporting here
    // For now, we'll just show an alert
    Alert.alert(
      "Report Error",
      "Error reporting feature coming soon. For now, please contact support at support@vectorfi.ai",
      [{ text: "OK" }]
    );
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Ionicons name="warning" size={64} color="#ef4444" />

            <Text style={styles.title}>Oops! Something went wrong</Text>

            <Text style={styles.message}>
              We're sorry, but something unexpected happened. The app
              encountered an error and needs to restart.
            </Text>

            {__DEV__ && this.state.error && (
              <View style={styles.debugInfo}>
                <Text style={styles.debugTitle}>Debug Information:</Text>
                <Text style={styles.debugText}>
                  {this.state.error.toString()}
                </Text>
                {this.state.errorInfo && (
                  <Text style={styles.debugText}>
                    {this.state.errorInfo.componentStack}
                  </Text>
                )}
              </View>
            )}

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={this.handleRestart}
              >
                <Text style={styles.primaryButtonText}>Restart App</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={this.handleReportError}
              >
                <Text style={styles.secondaryButtonText}>Report Error</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.contactText}>
              Need help? Contact us at support@vectorfi.ai
            </Text>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  content: {
    alignItems: "center",
    maxWidth: 400,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  debugInfo: {
    backgroundColor: "#f3f4f6",
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    width: "100%",
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#374151",
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: "#6b7280",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  buttonContainer: {
    width: "100%",
    gap: 12,
    marginBottom: 24,
  },
  primaryButton: {
    backgroundColor: "#3b82f6",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "#f3f4f6",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  secondaryButtonText: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
  },
  contactText: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
  },
});
