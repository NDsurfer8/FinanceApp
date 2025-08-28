import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  Image,
  Linking,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  signUp,
  validateEmail,
  validatePassword,
  signInWithApple,
} from "../services/auth";
import * as AppleAuthentication from "expo-apple-authentication";

interface SignUpScreenProps {
  onSignUp: () => void;
  onBackToLogin: () => void;
}

export const SignUpScreen: React.FC<SignUpScreenProps> = ({
  onSignUp,
  onBackToLogin,
}) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isAppleAuthAvailable, setIsAppleAuthAvailable] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [legalModalType, setLegalModalType] = useState<"privacy" | "terms">(
    "privacy"
  );

  // Functions to open Terms of Service and Privacy Policy
  const openTermsOfService = () => {
    setLegalModalType("terms");
    setShowLegalModal(true);
  };

  const openPrivacyPolicy = () => {
    setLegalModalType("privacy");
    setShowLegalModal(true);
  };

  // Refs for input focus management
  const lastNameRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmPasswordRef = useRef<TextInput>(null);

  // Check Apple Authentication availability
  useEffect(() => {
    const checkAvailability = async () => {
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      setIsAppleAuthAvailable(isAvailable);
    };

    checkAvailability();
  }, []);

  const validateForm = () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      Alert.alert("Error", "Please fill in all required fields");
      return false;
    }

    if (!validateEmail(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return false;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      Alert.alert("Error", passwordValidation.message);
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return false;
    }

    if (!agreedToTerms) {
      Alert.alert(
        "Error",
        "Please agree to the Terms of Service and Privacy Policy"
      );
      return false;
    }

    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const displayName = `${firstName} ${lastName}`.trim();
      await signUp(email, password, displayName);
      onSignUp();
    } catch (error: any) {
      console.error("Sign up error:", error);
      const errorMessage =
        error.message || "An error occurred. Please try again.";
      Alert.alert("Sign Up Failed", errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onBackToLogin} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#9ca3af" />
            </TouchableOpacity>
            <View style={styles.logoContainer}>
              <Image
                source={require("../../assets/ios/icon-1024.png")}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Join VectorFi to start tracking your finances
            </Text>
          </View>

          {/* Sign Up Form */}
          <View style={styles.form}>
            {/* Name Fields */}
            <View style={styles.nameRow}>
              <View style={[styles.inputContainer, styles.halfWidth]}>
                <TextInput
                  style={styles.input}
                  placeholder="First Name"
                  placeholderTextColor="#9ca3af"
                  value={firstName}
                  onChangeText={setFirstName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  autoComplete="off"
                  textContentType="none"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => lastNameRef.current?.focus()}
                />
              </View>
              <View style={[styles.inputContainer, styles.halfWidth]}>
                <TextInput
                  ref={lastNameRef}
                  style={styles.input}
                  placeholder="Last Name"
                  placeholderTextColor="#9ca3af"
                  value={lastName}
                  onChangeText={setLastName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  autoComplete="off"
                  textContentType="none"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => emailRef.current?.focus()}
                />
              </View>
            </View>

            {/* Email Field */}
            <View style={styles.inputContainer}>
              <Ionicons
                name="mail"
                size={20}
                color="#9ca3af"
                style={styles.inputIcon}
              />
              <TextInput
                ref={emailRef}
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#9ca3af"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                textContentType="none"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => passwordRef.current?.focus()}
              />
            </View>

            {/* Password Field */}
            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed"
                size={20}
                color="#9ca3af"
                style={styles.inputIcon}
              />
              <TextInput
                ref={passwordRef}
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                spellCheck={false}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color="#9ca3af"
                />
              </TouchableOpacity>
            </View>

            {/* Confirm Password Field */}
            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed"
                size={20}
                color="#9ca3af"
                style={styles.inputIcon}
              />
              <TextInput
                ref={confirmPasswordRef}
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor="#9ca3af"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                returnKeyType="done"
                blurOnSubmit={true}
                onSubmitEditing={handleSignUp}
                spellCheck={false}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-off" : "eye"}
                  size={20}
                  color="#9ca3af"
                />
              </TouchableOpacity>
            </View>

            {/* Terms Agreement */}
            <View style={styles.termsContainer}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setAgreedToTerms(!agreedToTerms)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkbox,
                    agreedToTerms && styles.checkboxChecked,
                  ]}
                >
                  {agreedToTerms && (
                    <Ionicons name="checkmark" size={16} color="white" />
                  )}
                </View>
              </TouchableOpacity>
              <View style={styles.termsTextContainer}>
                <Text style={styles.termsText} numberOfLines={0}>
                  I agree to the{" "}
                  <Text style={styles.termsLink} onPress={openTermsOfService}>
                    Terms of Service
                  </Text>{" "}
                  and{" "}
                  <Text style={styles.termsLink} onPress={openPrivacyPolicy}>
                    Privacy Policy
                  </Text>
                </Text>
              </View>
            </View>

            {/* Sign Up Button */}
            <TouchableOpacity
              style={[
                styles.signUpButton,
                isLoading && styles.signUpButtonDisabled,
              ]}
              onPress={handleSignUp}
              disabled={isLoading}
            >
              {isLoading ? (
                <Text style={styles.signUpButtonText}>Creating Account...</Text>
              ) : (
                <Text style={styles.signUpButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Login */}
            <View style={styles.socialButtons}>
              {isAppleAuthAvailable && (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={
                    AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
                  }
                  buttonStyle={
                    AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                  }
                  cornerRadius={12}
                  style={styles.appleButton}
                  onPress={async () => {
                    setIsLoading(true);
                    try {
                      await signInWithApple();
                      onSignUp();
                    } catch (error: any) {
                      console.error("Apple sign up error:", error);
                      const errorMessage =
                        error.message ||
                        "An error occurred with Apple Sign In. Please try again.";
                      Alert.alert("Apple Sign In Failed", errorMessage);
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                />
              )}
            </View>

            {/* Login Link */}
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={onBackToLogin}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Legal Documents Modal */}
      <Modal
        visible={showLegalModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowLegalModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setShowLegalModal(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color="#9ca3af" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {legalModalType === "privacy"
                ? "Privacy Policy"
                : "Terms of Service"}
            </Text>
            <View style={styles.modalSpacer} />
          </View>

          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            {legalModalType === "privacy" ? (
              <View>
                <Text style={styles.modalSectionTitle}>Privacy Policy</Text>
                <Text style={styles.modalParagraph}>
                  This privacy policy applies to the VectorFi app (hereby
                  referred to as "Application") for mobile devices that was
                  created by Noah Duran (hereby referred to as "Service
                  Provider") as a Freemium service. This service is intended for
                  use "AS IS".
                </Text>

                <Text style={styles.modalSectionTitle}>
                  Information Collection and Use
                </Text>
                <Text style={styles.modalParagraph}>
                  The Application collects information when you download and use
                  it. This information may include information such as your
                  device's Internet Protocol address (e.g. IP address), the
                  pages of the Application that you visit, the time and date of
                  your visit, the time spent on those pages, the time spent on
                  the Application, and the operating system you use on your
                  mobile device.
                </Text>

                <Text style={styles.modalParagraph}>
                  The Application does not gather precise information about the
                  location of your mobile device.
                </Text>

                <Text style={styles.modalParagraph}>
                  The Service Provider may use the information you provided to
                  contact you from time to time to provide you with important
                  information, required notices and marketing promotions.
                </Text>

                <Text style={styles.modalSectionTitle}>Third Party Access</Text>
                <Text style={styles.modalParagraph}>
                  Only aggregated, anonymized data is periodically transmitted
                  to external services to aid the Service Provider in improving
                  the Application and their service. The Service Provider may
                  share your information with third parties in the ways that are
                  described in this privacy statement.
                </Text>

                <Text style={styles.modalParagraph}>
                  Please note that the Application utilizes third-party services
                  that have their own Privacy Policy about handling data. Below
                  are the links to the Privacy Policy of the third-party service
                  providers used by the Application:
                </Text>

                <Text style={styles.modalBulletPoint}>• AdMob</Text>
                <Text style={styles.modalBulletPoint}>
                  • Google Analytics for Firebase
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • Firebase Crashlytics
                </Text>
                <Text style={styles.modalBulletPoint}>• Expo</Text>
                <Text style={styles.modalBulletPoint}>• RevenueCat</Text>
                <Text style={styles.modalBulletPoint}>• Plaid</Text>

                <Text style={styles.modalSectionTitle}>Security</Text>
                <Text style={styles.modalParagraph}>
                  The Service Provider is concerned about safeguarding the
                  confidentiality of your information. The Service Provider
                  provides physical, electronic, and procedural safeguards to
                  protect information the Service Provider processes and
                  maintains.
                </Text>

                <Text style={styles.modalSectionTitle}>Changes</Text>
                <Text style={styles.modalParagraph}>
                  This Privacy Policy may be updated from time to time for any
                  reason. The Service Provider will notify you of any changes to
                  the Privacy Policy by updating this page with the new Privacy
                  Policy. You are advised to consult this Privacy Policy
                  regularly for any changes, as continued use is deemed approval
                  of all changes.
                </Text>

                <Text style={styles.modalSectionTitle}>Contact Us</Text>
                <Text style={styles.modalParagraph}>
                  If you have any questions regarding privacy while using the
                  Application, or have questions about the practices, please
                  contact the Service Provider via email at support@vectorfi.ai
                </Text>

                <Text style={styles.modalEffectiveDate}>
                  Effective as of 2025-08-24
                </Text>
              </View>
            ) : (
              <View>
                <Text style={styles.modalSectionTitle}>Terms of Service</Text>
                <Text style={styles.modalParagraph}>
                  These terms and conditions apply to the VectorFi app (hereby
                  referred to as "Application") for mobile devices that was
                  created by Noah Duran (hereby referred to as "Service
                  Provider") as a Freemium service.
                </Text>

                <Text style={styles.modalParagraph}>
                  Upon downloading or utilizing the Application, you are
                  automatically agreeing to the following terms. It is strongly
                  advised that you thoroughly read and understand these terms
                  prior to using the Application. Unauthorized copying,
                  modification of the Application, any part of the Application,
                  or our trademarks is strictly prohibited.
                </Text>

                <Text style={styles.modalSectionTitle}>
                  Service Modifications
                </Text>
                <Text style={styles.modalParagraph}>
                  The Service Provider is dedicated to ensuring that the
                  Application is as beneficial and efficient as possible. As
                  such, they reserve the right to modify the Application or
                  charge for their services at any time and for any reason. The
                  Service Provider assures you that any charges for the
                  Application or its services will be clearly communicated to
                  you.
                </Text>

                <Text style={styles.modalSectionTitle}>
                  Third Party Services
                </Text>
                <Text style={styles.modalParagraph}>
                  Please note that the Application utilizes third-party services
                  that have their own Terms and Conditions. Below are the links
                  to the Terms and Conditions of the third-party service
                  providers used by the Application:
                </Text>

                <Text style={styles.modalBulletPoint}>• AdMob</Text>
                <Text style={styles.modalBulletPoint}>
                  • Google Analytics for Firebase
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • Firebase Crashlytics
                </Text>
                <Text style={styles.modalBulletPoint}>• Expo</Text>
                <Text style={styles.modalBulletPoint}>• RevenueCat</Text>
                <Text style={styles.modalBulletPoint}>• Plaid</Text>

                <Text style={styles.modalSectionTitle}>
                  Data Usage and Charges
                </Text>
                <Text style={styles.modalParagraph}>
                  If you are using the application outside of a Wi-Fi area,
                  please be aware that your mobile network provider's agreement
                  terms still apply. Consequently, you may incur charges from
                  your mobile provider for data usage during the connection to
                  the application, or other third-party charges.
                </Text>

                <Text style={styles.modalSectionTitle}>
                  Application Updates and Termination
                </Text>
                <Text style={styles.modalParagraph}>
                  The Service Provider may wish to update the application at
                  some point. The application is currently available as per the
                  requirements for the operating system (and for any additional
                  systems they decide to extend the availability of the
                  application to) may change, and you will need to download the
                  updates if you want to continue using the application.
                </Text>

                <Text style={styles.modalSectionTitle}>
                  Changes to These Terms and Conditions
                </Text>
                <Text style={styles.modalParagraph}>
                  The Service Provider may periodically update their Terms and
                  Conditions. Therefore, you are advised to review this page
                  regularly for any changes. The Service Provider will notify
                  you of any changes by posting the new Terms and Conditions on
                  this page.
                </Text>

                <Text style={styles.modalSectionTitle}>Contact Us</Text>
                <Text style={styles.modalParagraph}>
                  If you have any questions or suggestions about the Terms and
                  Conditions, please do not hesitate to contact the Service
                  Provider at support@vectorfi.ai.
                </Text>

                <Text style={styles.modalEffectiveDate}>
                  Effective as of 2025-08-24
                </Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 100,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 20,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#9ca3af",
    textAlign: "center",
  },
  form: {
    width: "100%",
  },
  nameRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  halfWidth: {
    flex: 1,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#374151",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    fontSize: 16,
    color: "#ffffff",
    paddingVertical: 0,
    paddingHorizontal: 0,
  },
  eyeIcon: {
    padding: 8,
  },
  termsContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  checkboxContainer: {
    padding: 8,
    marginRight: 8,
    marginTop: 2,
    flexShrink: 0,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#374151",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#10b981",
    borderColor: "#10b981",
  },
  termsTextContainer: {
    flex: 1,
    paddingTop: 2,
    paddingRight: 4,
    minWidth: 0, // Allows text to wrap properly
  },
  termsText: {
    fontSize: 14,
    color: "#9ca3af",
    lineHeight: 20,
    flexShrink: 1, // Allows text to shrink and wrap
  },
  termsLink: {
    color: "#10b981",
    fontWeight: "600",
  },
  signUpButton: {
    backgroundColor: "#10b981",
    borderRadius: 12,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  signUpButtonDisabled: {
    backgroundColor: "#6b7280",
  },
  signUpButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  loginContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  loginText: {
    color: "#9ca3af",
    fontSize: 14,
  },
  loginLink: {
    color: "#10b981",
    fontSize: 14,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#374151",
  },
  dividerText: {
    marginHorizontal: 16,
    color: "#9ca3af",
    fontSize: 14,
    fontWeight: "500",
  },
  socialButtons: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 24,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#374151",
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 16,
    marginHorizontal: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  socialButtonText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "500",
    color: "#1f2937",
  },
  appleButton: {
    flex: 1,
    height: 56,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#374151",
  },
  modalCloseButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
    flex: 1,
    textAlign: "center",
  },
  modalSpacer: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ffffff",
    marginTop: 24,
    marginBottom: 12,
  },
  modalParagraph: {
    fontSize: 14,
    color: "#d1d5db",
    lineHeight: 20,
    marginBottom: 16,
  },
  modalBulletPoint: {
    fontSize: 14,
    color: "#d1d5db",
    lineHeight: 20,
    marginBottom: 8,
    paddingLeft: 16,
  },
  modalEffectiveDate: {
    fontSize: 12,
    color: "#9ca3af",
    fontStyle: "italic",
    marginTop: 24,
    textAlign: "center",
  },
});
