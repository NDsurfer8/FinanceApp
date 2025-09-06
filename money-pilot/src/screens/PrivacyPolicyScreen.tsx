import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";

interface PrivacyPolicyScreenProps {
  navigation: any;
}

export const PrivacyPolicyScreen: React.FC<PrivacyPolicyScreenProps> = ({
  navigation,
}) => {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.card,
    },
    backButton: {
      marginRight: 20,
      padding: 10,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.text,
      flex: 1,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      color: colors.text,
      marginBottom: 8,
      textAlign: "center",
    },
    subtitle: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.text,
      marginTop: 24,
      marginBottom: 12,
    },
    paragraph: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: 12,
    },
    bulletPoint: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 20,
      marginBottom: 8,
      paddingLeft: 16,
    },
    bulletList: {
      marginBottom: 16,
    },
    section: {
      marginBottom: 24,
    },
    contactInfo: {
      backgroundColor: colors.surfaceSecondary,
      padding: 16,
      borderRadius: 8,
      marginTop: 16,
    },
    contactText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
    },
    dateText: {
      fontSize: 12,
      color: colors.textTertiary,
      textAlign: "center",
      marginTop: 8,
      fontStyle: "italic",
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Privacy Policy</Text>

        <View style={styles.section}>
          <Text style={styles.paragraph}>
            This privacy policy applies to the VectorFi app (hereby referred to
            as "Application") for mobile devices that was created by VectorFi
            (hereby referred to as "Service Provider") as a Freemium service.
            This service is intended for use "AS IS".
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>Information Collection and Use</Text>
          <Text style={styles.paragraph}>
            The Application collects information when you download and use it.
            This information may include information such as:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletPoint}>
              • Your device's Internet Protocol address (e.g. IP address)
            </Text>
            <Text style={styles.bulletPoint}>
              • The pages of the Application that you visit, the time and date
              of your visit, the time spent on those pages
            </Text>
            <Text style={styles.bulletPoint}>
              • The time spent on the Application
            </Text>
            <Text style={styles.bulletPoint}>
              • The operating system you use on your mobile device
            </Text>
            <Text style={styles.bulletPoint}>
              • Financial data including transactions, assets, debts, and goals
            </Text>
            <Text style={styles.bulletPoint}>
              • Bank account information (when connected via Plaid)
            </Text>
            <Text style={styles.bulletPoint}>
              • Biometric authentication preferences (Face ID/Touch ID settings)
            </Text>
            <Text style={styles.bulletPoint}>
              • Push notification preferences and interaction data
            </Text>
          </View>
          <Text style={styles.paragraph}>
            The Application does not gather precise information about the
            location of your mobile device.
          </Text>
          <Text style={styles.paragraph}>
            The Service Provider may use the information you provided to contact
            you from time to time to provide you with important information,
            required notices and marketing promotions.
          </Text>
          <Text style={styles.paragraph}>
            For a better experience, while using the Application, the Service
            Provider may require you to provide us with certain personally
            identifiable information, including but not limited to
            support@vectorfi.ai. The information that the Service Provider
            request will be retained by them and used as described in this
            privacy policy.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>AI Services and Data Processing</Text>
          <Text style={styles.paragraph}>
            The Application uses artificial intelligence services to provide
            personalized financial advice and analysis. When you use the AI
            financial advisor feature, your financial data (including income,
            expenses, assets, debts, and goals) may be processed by AI services
            to generate personalized recommendations and financial plans.
          </Text>
          <Text style={styles.paragraph}>
            This financial data is encrypted and transmitted securely to our AI
            processing services. The AI analysis helps provide insights about
            your spending patterns, savings opportunities, debt management
            strategies, and financial goal planning.
          </Text>
          <Text style={styles.paragraph}>
            Your financial data is processed solely for the purpose of providing
            you with personalized financial advice and is not used for any other
            commercial purposes without your explicit consent.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>Biometric Authentication</Text>
          <Text style={styles.paragraph}>
            The Application may use Face ID or Touch ID for secure
            authentication to protect your financial information. When you
            enable biometric authentication, the Application stores your
            biometric preferences locally on your device.
          </Text>
          <Text style={styles.paragraph}>
            Biometric data (fingerprint or facial recognition data) is processed
            by your device's secure enclave and is never transmitted to our
            servers or stored in our systems. The Application only stores your
            preference to use biometric authentication, not the actual biometric
            data itself.
          </Text>
          <Text style={styles.paragraph}>
            You can disable biometric authentication at any time through the
            Application's settings, and this will immediately stop the use of
            biometric data for authentication.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>Push Notifications</Text>
          <Text style={styles.paragraph}>
            The Application sends push notifications for important financial
            reminders, including bill due dates, budget alerts, and financial
            goal updates. To provide these notifications, the Application may
            collect and process:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletPoint}>• Bill due dates and amounts</Text>
            <Text style={styles.bulletPoint}>• Budget spending thresholds</Text>
            <Text style={styles.bulletPoint}>
              • Financial goal progress updates
            </Text>
            <Text style={styles.bulletPoint}>
              • Notification interaction data (opens, dismissals)
            </Text>
          </View>
          <Text style={styles.paragraph}>
            You can control notification preferences through your device
            settings or within the Application's notification settings. You may
            opt out of push notifications at any time.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>Financial Data Security</Text>
          <Text style={styles.paragraph}>
            The Application processes sensitive financial information and
            employs industry-standard security measures to protect your data:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletPoint}>
              • All data is encrypted in transit and at rest
            </Text>
            <Text style={styles.bulletPoint}>
              • Bank connections are secured through Plaid's bank-level security
            </Text>
            <Text style={styles.bulletPoint}>
              • Financial data is stored in secure, encrypted databases
            </Text>
            <Text style={styles.bulletPoint}>
              • Access to your financial data requires authentication
            </Text>
          </View>
          <Text style={styles.paragraph}>
            When you connect your bank accounts through Plaid, your banking
            credentials are never stored in our systems. Plaid uses bank-level
            security protocols to ensure your banking information remains
            secure.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>Third Party Access</Text>
          <Text style={styles.paragraph}>
            Only aggregated, anonymized data is periodically transmitted to
            external services to aid the Service Provider in improving the
            Application and their service. The Service Provider may share your
            information with third parties in the ways that are described in
            this privacy statement.
          </Text>
          <Text style={styles.paragraph}>
            Please note that the Application utilizes third-party services that
            have their own Privacy Policy about handling data. Below are the
            links to the Privacy Policy of the third-party service providers
            used by the Application:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletPoint}>
              • Google Analytics for Firebase
            </Text>
            <Text style={styles.bulletPoint}>• Firebase Crashlytics</Text>
            <Text style={styles.bulletPoint}>• Expo</Text>
            <Text style={styles.bulletPoint}>• RevenueCat</Text>
            <Text style={styles.bulletPoint}>• Plaid</Text>
            <Text style={styles.bulletPoint}>
              • OpenAI (for AI financial advice)
            </Text>
            <Text style={styles.bulletPoint}>
              • Apple Authentication (Sign in with Apple)
            </Text>
            <Text style={styles.bulletPoint}>
              • Expo Notifications (push notifications)
            </Text>
          </View>
          <Text style={styles.paragraph}>
            The Service Provider may disclose User Provided and Automatically
            Collected Information:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletPoint}>
              • as required by law, such as to comply with a subpoena, or
              similar legal process;
            </Text>
            <Text style={styles.bulletPoint}>
              • when they believe in good faith that disclosure is necessary to
              protect their rights, protect your safety or the safety of others,
              investigate fraud, or respond to a government request;
            </Text>
            <Text style={styles.bulletPoint}>
              • with their trusted services providers who work on their behalf,
              do not have an independent use of the information we disclose to
              them, and have agreed to adhere to the rules set forth in this
              privacy statement.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>Opt-Out Rights</Text>
          <Text style={styles.paragraph}>
            You can stop all collection of information by the Application easily
            by uninstalling it. You may use the standard uninstall processes as
            may be available as part of your mobile device or via the mobile
            application marketplace or network.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>Data Retention Policy</Text>
          <Text style={styles.paragraph}>
            The Service Provider will retain User Provided data for as long as
            you use the Application and for a reasonable time thereafter.
            Financial data used for AI analysis is retained only for the
            duration of your active session and is not stored for long-term AI
            training purposes.
          </Text>
          <Text style={styles.paragraph}>
            If you'd like them to delete User Provided Data that you have
            provided via the Application, please contact them at
            support@vectorfi.ai and they will respond in a reasonable time. You
            may also request deletion of any AI-processed financial data.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>Children</Text>
          <Text style={styles.paragraph}>
            The Service Provider does not use the Application to knowingly
            solicit data from or market to children under the age of 13.
          </Text>
          <Text style={styles.paragraph}>
            The Application does not address anyone under the age of 13. The
            Service Provider does not knowingly collect personally identifiable
            information from children under 13 years of age. In the case the
            Service Provider discover that a child under 13 has provided
            personal information, the Service Provider will immediately delete
            this from their servers. If you are a parent or guardian and you are
            aware that your child has provided us with personal information,
            please contact the Service Provider (support@vectorfi.ai) so that
            they will be able to take the necessary actions.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>Security</Text>
          <Text style={styles.paragraph}>
            The Service Provider is concerned about safeguarding the
            confidentiality of your information. The Service Provider provides
            physical, electronic, and procedural safeguards to protect
            information the Service Provider processes and maintains.
          </Text>
          <Text style={styles.paragraph}>
            All financial data is encrypted using industry-standard encryption
            protocols. Bank connections are secured through Plaid's bank-level
            security infrastructure. AI processing of financial data is
            conducted through secure, encrypted channels to ensure your
            financial information remains protected.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>Changes</Text>
          <Text style={styles.paragraph}>
            This Privacy Policy may be updated from time to time for any reason.
            The Service Provider will notify you of any changes to the Privacy
            Policy by updating this page with the new Privacy Policy. You are
            advised to consult this Privacy Policy regularly for any changes, as
            continued use is deemed approval of all changes.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>Your Consent</Text>
          <Text style={styles.paragraph}>
            By using the Application, you are consenting to the processing of
            your information as set forth in this Privacy Policy now and as
            amended by us.
          </Text>
        </View>

        <View style={styles.contactInfo}>
          <Text style={styles.contactText}>
            If you have any questions regarding privacy while using the
            Application, or have questions about the practices, please contact
            the Service Provider via email at support@vectorfi.ai
          </Text>
        </View>

        <Text style={styles.dateText}>
          This privacy policy is effective as of 2025-01-27
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};
