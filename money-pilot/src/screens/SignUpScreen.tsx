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
                  created by VectorFi (hereby referred to as "Service Provider")
                  as a Freemium service. This service is intended for use "AS
                  IS".
                </Text>

                <Text style={styles.modalSectionTitle}>
                  Information Collection and Use
                </Text>
                <Text style={styles.modalParagraph}>
                  The Application collects information when you download and use
                  it. This information may include information such as:
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • Your device's Internet Protocol address (e.g. IP address)
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • The pages of the Application that you visit, the time and
                  date of your visit, the time spent on those pages
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • The time spent on the Application
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • The operating system you use on your mobile device
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • Financial data including transactions, assets, debts, and
                  goals
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • Bank account information (when connected via Plaid)
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • Biometric authentication preferences (Face ID/Touch ID
                  settings)
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • Push notification preferences and interaction data
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

                <Text style={styles.modalParagraph}>
                  For a better experience, while using the Application, the
                  Service Provider may require you to provide us with certain
                  personally identifiable information, including but not limited
                  to support@vectorfi.ai. The information that the Service
                  Provider request will be retained by them and used as
                  described in this privacy policy.
                </Text>

                <Text style={styles.modalSectionTitle}>
                  AI Services and Data Processing
                </Text>
                <Text style={styles.modalParagraph}>
                  The Application uses artificial intelligence services to
                  provide personalized financial advice and analysis. When you
                  use the AI financial advisor feature, your financial data
                  (including income, expenses, assets, debts, and goals) may be
                  processed by AI services to generate personalized
                  recommendations and financial plans.
                </Text>
                <Text style={styles.modalParagraph}>
                  This financial data is encrypted and transmitted securely to
                  our AI processing services. The AI analysis helps provide
                  insights about your spending patterns, savings opportunities,
                  debt management strategies, and financial goal planning.
                </Text>
                <Text style={styles.modalParagraph}>
                  Your financial data is processed solely for the purpose of
                  providing you with personalized financial advice and is not
                  used for any other commercial purposes without your explicit
                  consent.
                </Text>

                <Text style={styles.modalSectionTitle}>
                  Biometric Authentication
                </Text>
                <Text style={styles.modalParagraph}>
                  The Application may use Face ID or Touch ID for secure
                  authentication to protect your financial information. When you
                  enable biometric authentication, the Application stores your
                  biometric preferences locally on your device.
                </Text>
                <Text style={styles.modalParagraph}>
                  Biometric data (fingerprint or facial recognition data) is
                  processed by your device's secure enclave and is never
                  transmitted to our servers or stored in our systems. The
                  Application only stores your preference to use biometric
                  authentication, not the actual biometric data itself.
                </Text>
                <Text style={styles.modalParagraph}>
                  You can disable biometric authentication at any time through
                  the Application's settings, and this will immediately stop the
                  use of biometric data for authentication.
                </Text>

                <Text style={styles.modalSectionTitle}>Push Notifications</Text>
                <Text style={styles.modalParagraph}>
                  The Application sends push notifications for important
                  financial reminders, including bill due dates, budget alerts,
                  and financial goal updates. To provide these notifications,
                  the Application may collect and process:
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • Bill due dates and amounts
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • Budget spending thresholds
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • Financial goal progress updates
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • Notification interaction data (opens, dismissals)
                </Text>
                <Text style={styles.modalParagraph}>
                  You can control notification preferences through your device
                  settings or within the Application's notification settings.
                  You may opt out of push notifications at any time.
                </Text>

                <Text style={styles.modalSectionTitle}>
                  Financial Data Security
                </Text>
                <Text style={styles.modalParagraph}>
                  The Application processes sensitive financial information and
                  employs industry-standard security measures to protect your
                  data:
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • All data is encrypted in transit and at rest
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • Bank connections are secured through Plaid's bank-level
                  security
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • Financial data is stored in secure, encrypted databases
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • Access to your financial data requires authentication
                </Text>
                <Text style={styles.modalParagraph}>
                  When you connect your bank accounts through Plaid, your
                  banking credentials are never stored in our systems. Plaid
                  uses bank-level security protocols to ensure your banking
                  information remains secure.
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

                <Text style={styles.modalBulletPoint}>
                  • Google Analytics for Firebase
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • Firebase Crashlytics
                </Text>
                <Text style={styles.modalBulletPoint}>• Expo</Text>
                <Text style={styles.modalBulletPoint}>• RevenueCat</Text>
                <Text style={styles.modalBulletPoint}>• Plaid</Text>
                <Text style={styles.modalBulletPoint}>
                  • OpenAI (for AI financial advice)
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • Apple Authentication (Sign in with Apple)
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • Expo Notifications (push notifications)
                </Text>

                <Text style={styles.modalParagraph}>
                  The Service Provider may disclose User Provided and
                  Automatically Collected Information:
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • as required by law, such as to comply with a subpoena, or
                  similar legal process;
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • when they believe in good faith that disclosure is necessary
                  to protect their rights, protect your safety or the safety of
                  others, investigate fraud, or respond to a government request;
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • with their trusted services providers who work on their
                  behalf, do not have an independent use of the information we
                  disclose to them, and have agreed to adhere to the rules set
                  forth in this privacy statement.
                </Text>

                <Text style={styles.modalSectionTitle}>Opt-Out Rights</Text>
                <Text style={styles.modalParagraph}>
                  You can stop all collection of information by the Application
                  easily by uninstalling it. You may use the standard uninstall
                  processes as may be available as part of your mobile device or
                  via the mobile application marketplace or network.
                </Text>

                <Text style={styles.modalSectionTitle}>
                  Data Retention Policy
                </Text>
                <Text style={styles.modalParagraph}>
                  The Service Provider will retain User Provided data for as
                  long as you use the Application and for a reasonable time
                  thereafter. Financial data used for AI analysis is retained
                  only for the duration of your active session and is not stored
                  for long-term AI training purposes.
                </Text>
                <Text style={styles.modalParagraph}>
                  If you'd like them to delete User Provided Data that you have
                  provided via the Application, please contact them at
                  support@vectorfi.ai and they will respond in a reasonable
                  time. You may also request deletion of any AI-processed
                  financial data.
                </Text>

                <Text style={styles.modalSectionTitle}>Children</Text>
                <Text style={styles.modalParagraph}>
                  The Service Provider does not use the Application to knowingly
                  solicit data from or market to children under the age of 13.
                </Text>
                <Text style={styles.modalParagraph}>
                  The Application does not address anyone under the age of 13.
                  The Service Provider does not knowingly collect personally
                  identifiable information from children under 13 years of age.
                  In the case the Service Provider discover that a child under
                  13 has provided personal information, the Service Provider
                  will immediately delete this from their servers. If you are a
                  parent or guardian and you are aware that your child has
                  provided us with personal information, please contact the
                  Service Provider (support@vectorfi.ai) so that they will be
                  able to take the necessary actions.
                </Text>

                <Text style={styles.modalSectionTitle}>Security</Text>
                <Text style={styles.modalParagraph}>
                  The Service Provider is concerned about safeguarding the
                  confidentiality of your information. The Service Provider
                  provides physical, electronic, and procedural safeguards to
                  protect information the Service Provider processes and
                  maintains.
                </Text>
                <Text style={styles.modalParagraph}>
                  All financial data is encrypted using industry-standard
                  encryption protocols. Bank connections are secured through
                  Plaid's bank-level security infrastructure. AI processing of
                  financial data is conducted through secure, encrypted channels
                  to ensure your financial information remains protected.
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

                <Text style={styles.modalSectionTitle}>Your Consent</Text>
                <Text style={styles.modalParagraph}>
                  By using the Application, you are consenting to the processing
                  of your information as set forth in this Privacy Policy now
                  and as amended by us.
                </Text>

                <Text style={styles.modalSectionTitle}>Contact Us</Text>
                <Text style={styles.modalParagraph}>
                  If you have any questions regarding privacy while using the
                  Application, or have questions about the practices, please
                  contact the Service Provider via email at support@vectorfi.ai
                </Text>

                <Text style={styles.modalEffectiveDate}>
                  This privacy policy is effective as of 2025-01-27
                </Text>
              </View>
            ) : (
              <View>
                <Text style={styles.modalSectionTitle}>Terms of Service</Text>
                <Text style={styles.modalParagraph}>
                  These terms and conditions apply to the VectorFi app (hereby
                  referred to as "Application") for mobile devices that was
                  created by VectorFi (hereby referred to as "Service Provider")
                  as a Freemium service.
                </Text>

                <Text style={styles.modalParagraph}>
                  Upon downloading or utilizing the Application, you are
                  automatically agreeing to the following terms. It is strongly
                  advised that you thoroughly read and understand these terms
                  prior to using the Application. Unauthorized copying,
                  modification of the Application, any part of the Application,
                  or our trademarks is strictly prohibited. All trademarks,
                  copyrights, database rights, and other intellectual property
                  rights related to the Application remain the property of the
                  Service Provider.
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
                  Data Processing and Security
                </Text>
                <Text style={styles.modalParagraph}>
                  The Application stores and processes personal data that you
                  have provided to the Service Provider in order to provide the
                  Service. It is your responsibility to maintain the security of
                  your phone and access to the Application. The Service Provider
                  strongly advise against jailbreaking or rooting your phone,
                  which involves removing software restrictions and limitations
                  imposed by the official operating system of your device. Such
                  actions could expose your phone to malware, viruses, malicious
                  programs, compromise your phone's security features, and may
                  result in the Application not functioning correctly or at all.
                </Text>

                <Text style={styles.modalSectionTitle}>
                  Financial Services and AI Features
                </Text>
                <Text style={styles.modalParagraph}>
                  The Application provides financial management tools, including
                  AI-powered financial advice and analysis. By using these
                  features, you acknowledge that:
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • AI-generated financial advice is for informational purposes
                  only
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • The Service Provider is not a financial advisor, broker, or
                  tax advisor
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • You should consult with qualified professionals for
                  financial decisions
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • AI analysis is based on the data you provide and may not be
                  complete
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • Past performance does not guarantee future results
                </Text>
                <Text style={styles.modalParagraph}>
                  The Service Provider disclaims all liability for any financial
                  decisions made based on AI-generated advice or analysis
                  provided through the Application.
                </Text>

                <Text style={styles.modalSectionTitle}>
                  Bank Account Connections
                </Text>
                <Text style={styles.modalParagraph}>
                  The Application allows you to connect your bank accounts
                  through Plaid to automatically import financial data. By
                  connecting your accounts, you:
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • Authorize the Application to access your financial data
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • Acknowledge that data accuracy depends on your bank's
                  information
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • Understand that connection may be interrupted by your bank
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • Agree to maintain accurate and up-to-date account
                  information
                </Text>
                <Text style={styles.modalParagraph}>
                  The Service Provider is not responsible for any errors in
                  financial data provided by your bank or Plaid, or for any
                  consequences of relying on such data.
                </Text>

                <Text style={styles.modalSectionTitle}>
                  Subscription and Payment Terms
                </Text>
                <Text style={styles.modalParagraph}>
                  The Application offers both free and premium subscription
                  tiers. Premium features require an active subscription through
                  RevenueCat:
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • Subscriptions automatically renew unless cancelled
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • You may cancel at any time through your device settings
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • Refunds are subject to Apple/Google App Store policies
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • Price changes will be communicated in advance
                </Text>
                <Text style={styles.modalParagraph}>
                  The Service Provider reserves the right to modify subscription
                  terms, features, or pricing with appropriate notice to users.
                </Text>

                <Text style={styles.modalSectionTitle}>
                  User Responsibilities
                </Text>
                <Text style={styles.modalParagraph}>
                  As a user of the Application, you agree to:
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • Provide accurate and complete financial information
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • Maintain the security of your account credentials
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • Not use the Application for illegal or fraudulent purposes
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • Not attempt to reverse engineer or hack the Application
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • Report any security vulnerabilities or bugs
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • Comply with all applicable laws and regulations
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

                <Text style={styles.modalBulletPoint}>
                  • Google Analytics for Firebase
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • Firebase Crashlytics
                </Text>
                <Text style={styles.modalBulletPoint}>• Expo</Text>
                <Text style={styles.modalBulletPoint}>• RevenueCat</Text>
                <Text style={styles.modalBulletPoint}>• Plaid</Text>
                <Text style={styles.modalBulletPoint}>
                  • OpenAI (AI financial advice)
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • Apple Authentication (Sign in with Apple)
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • Expo Notifications (push notifications)
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • Firebase Realtime Database
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • Firebase Cloud Functions
                </Text>

                <Text style={styles.modalSectionTitle}>
                  Internet Connectivity
                </Text>
                <Text style={styles.modalParagraph}>
                  Please be aware that the Service Provider does not assume
                  responsibility for certain aspects. Some functions of the
                  Application require an active internet connection, which can
                  be Wi-Fi or provided by your mobile network provider. The
                  Service Provider cannot be held responsible if the Application
                  does not function at full capacity due to lack of access to
                  Wi-Fi or if you have exhausted your data allowance.
                </Text>
                <Text style={styles.modalParagraph}>
                  If you are using the application outside of a Wi-Fi area,
                  please be aware that your mobile network provider's agreement
                  terms still apply. Consequently, you may incur charges from
                  your mobile provider for data usage during the connection to
                  the application, or other third-party charges. By using the
                  application, you accept responsibility for any such charges,
                  including roaming data charges if you use the application
                  outside of your home territory (i.e., region or country)
                  without disabling data roaming.
                </Text>

                <Text style={styles.modalSectionTitle}>
                  Device Responsibility
                </Text>
                <Text style={styles.modalParagraph}>
                  Similarly, the Service Provider cannot always assume
                  responsibility for your usage of the application. For
                  instance, it is your responsibility to ensure that your device
                  remains charged. If your device runs out of battery and you
                  are unable to access the Service, the Service Provider cannot
                  be held responsible.
                </Text>
                <Text style={styles.modalParagraph}>
                  In terms of the Service Provider's responsibility for your use
                  of the application, it is important to note that while they
                  strive to ensure that it is updated and accurate at all times,
                  they do rely on third parties to provide information to them
                  so that they can make it available to you. The Service
                  Provider accepts no liability for any loss, direct or
                  indirect, that you experience as a result of relying entirely
                  on this functionality of the application.
                </Text>

                <Text style={styles.modalSectionTitle}>
                  Limitation of Liability
                </Text>
                <Text style={styles.modalParagraph}>
                  To the maximum extent permitted by law, the Service Provider
                  shall not be liable for any indirect, incidental, special,
                  consequential, or punitive damages, including but not limited
                  to loss of profits, data, use, goodwill, or other intangible
                  losses resulting from:
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • Your use or inability to use the Application
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • Any financial decisions made based on Application data
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • Unauthorized access to or alteration of your data
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • Any other matter relating to the Application
                </Text>
                <Text style={styles.modalParagraph}>
                  The Service Provider's total liability shall not exceed the
                  amount you paid for the Application in the 12 months preceding
                  the claim.
                </Text>

                <Text style={styles.modalSectionTitle}>
                  Intellectual Property
                </Text>
                <Text style={styles.modalParagraph}>
                  The Application and its original content, features, and
                  functionality are and will remain the exclusive property of
                  the Service Provider and its licensors. The Application is
                  protected by copyright, trademark, and other laws. The Service
                  Provider's trademarks and trade dress may not be used in
                  connection with any product or service without the Service
                  Provider's prior written consent.
                </Text>

                <Text style={styles.modalSectionTitle}>Disclaimers</Text>
                <Text style={styles.modalParagraph}>
                  The Application is provided "as is" and "as available" without
                  any warranties of any kind, either express or implied. The
                  Service Provider disclaims all warranties, including but not
                  limited to:
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • Warranties of merchantability and fitness for a particular
                  purpose
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • Warranties that the Application will be uninterrupted or
                  error-free
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • Warranties regarding the accuracy or reliability of
                  financial data
                </Text>
                <Text style={styles.modalBulletPoint}>
                  • Warranties that defects will be corrected
                </Text>

                <Text style={styles.modalSectionTitle}>Governing Law</Text>
                <Text style={styles.modalParagraph}>
                  These Terms shall be governed by and construed in accordance
                  with the laws of the jurisdiction in which the Service
                  Provider operates, without regard to its conflict of law
                  provisions. Any disputes arising from these Terms or your use
                  of the Application shall be resolved through binding
                  arbitration or in the courts of the Service Provider's
                  jurisdiction.
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
                  updates if you want to continue using the application. The
                  Service Provider does not guarantee that it will always update
                  the application so that it is relevant to you and/or
                  compatible with the particular operating system version
                  installed on your device. However, you agree to always accept
                  updates to the application when offered to you.
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
                  These terms and conditions are effective as of 2025-01-27
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
