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

interface TermsOfServiceScreenProps {
  navigation: any;
}

export const TermsOfServiceScreen: React.FC<TermsOfServiceScreenProps> = ({
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
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Terms & Conditions</Text>

        <View style={styles.section}>
          <Text style={styles.paragraph}>
            These terms and conditions apply to the VectorFi app (hereby
            referred to as "Application") for mobile devices that was created by
            VectorFi (hereby referred to as "Service Provider") as a Freemium
            service.
          </Text>
          <Text style={styles.paragraph}>
            Upon downloading or utilizing the Application, you are automatically
            agreeing to the following terms. It is strongly advised that you
            thoroughly read and understand these terms prior to using the
            Application. Unauthorized copying, modification of the Application,
            any part of the Application, or our trademarks is strictly
            prohibited. Any attempts to extract the source code of the
            Application, translate the Application into other languages, or
            create derivative versions are not permitted. All trademarks,
            copyrights, database rights, and other intellectual property rights
            related to the Application remain the property of the Service
            Provider.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>Service Modifications</Text>
          <Text style={styles.paragraph}>
            The Service Provider is dedicated to ensuring that the Application
            is as beneficial and efficient as possible. As such, they reserve
            the right to modify the Application or charge for their services at
            any time and for any reason. The Service Provider assures you that
            any charges for the Application or its services will be clearly
            communicated to you.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>Data Processing and Security</Text>
          <Text style={styles.paragraph}>
            The Application stores and processes personal data that you have
            provided to the Service Provider in order to provide the Service. It
            is your responsibility to maintain the security of your phone and
            access to the Application. The Service Provider strongly advise
            against jailbreaking or rooting your phone, which involves removing
            software restrictions and limitations imposed by the official
            operating system of your device. Such actions could expose your
            phone to malware, viruses, malicious programs, compromise your
            phone's security features, and may result in the Application not
            functioning correctly or at all.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>
            Financial Services and AI Features
          </Text>
          <Text style={styles.paragraph}>
            The Application provides financial management tools, including
            AI-powered financial advice and analysis. By using these features,
            you acknowledge that:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletPoint}>
              • AI-generated financial advice is for informational purposes only
            </Text>
            <Text style={styles.bulletPoint}>
              • The Service Provider is not a financial advisor, broker, or tax
              advisor
            </Text>
            <Text style={styles.bulletPoint}>
              • You should consult with qualified professionals for financial
              decisions
            </Text>
            <Text style={styles.bulletPoint}>
              • AI analysis is based on the data you provide and may not be
              complete
            </Text>
            <Text style={styles.bulletPoint}>
              • Past performance does not guarantee future results
            </Text>
          </View>
          <Text style={styles.paragraph}>
            The Service Provider disclaims all liability for any financial
            decisions made based on AI-generated advice or analysis provided
            through the Application.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>Bank Account Connections</Text>
          <Text style={styles.paragraph}>
            The Application allows you to connect your bank accounts through
            Plaid to automatically import financial data. By connecting your
            accounts, you:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletPoint}>
              • Authorize the Application to access your financial data
            </Text>
            <Text style={styles.bulletPoint}>
              • Acknowledge that data accuracy depends on your bank's
              information
            </Text>
            <Text style={styles.bulletPoint}>
              • Understand that connection may be interrupted by your bank
            </Text>
            <Text style={styles.bulletPoint}>
              • Agree to maintain accurate and up-to-date account information
            </Text>
          </View>
          <Text style={styles.paragraph}>
            The Service Provider is not responsible for any errors in financial
            data provided by your bank or Plaid, or for any consequences of
            relying on such data.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>Subscription and Payment Terms</Text>
          <Text style={styles.paragraph}>
            The Application offers both free and premium subscription tiers.
            Premium features require an active subscription through RevenueCat:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletPoint}>
              • Subscriptions automatically renew unless cancelled
            </Text>
            <Text style={styles.bulletPoint}>
              • You may cancel at any time through your device settings
            </Text>
            <Text style={styles.bulletPoint}>
              • Refunds are subject to Apple/Google App Store policies
            </Text>
            <Text style={styles.bulletPoint}>
              • Price changes will be communicated in advance
            </Text>
          </View>
          <Text style={styles.paragraph}>
            The Service Provider reserves the right to modify subscription
            terms, features, or pricing with appropriate notice to users.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>User Responsibilities</Text>
          <Text style={styles.paragraph}>
            As a user of the Application, you agree to:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletPoint}>
              • Provide accurate and complete financial information
            </Text>
            <Text style={styles.bulletPoint}>
              • Maintain the security of your account credentials
            </Text>
            <Text style={styles.bulletPoint}>
              • Not use the Application for illegal or fraudulent purposes
            </Text>
            <Text style={styles.bulletPoint}>
              • Not attempt to reverse engineer or hack the Application
            </Text>
            <Text style={styles.bulletPoint}>
              • Report any security vulnerabilities or bugs
            </Text>
            <Text style={styles.bulletPoint}>
              • Comply with all applicable laws and regulations
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>Limitation of Liability</Text>
          <Text style={styles.paragraph}>
            To the maximum extent permitted by law, the Service Provider shall
            not be liable for any indirect, incidental, special, consequential,
            or punitive damages, including but not limited to loss of profits,
            data, use, goodwill, or other intangible losses resulting from:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletPoint}>
              • Your use or inability to use the Application
            </Text>
            <Text style={styles.bulletPoint}>
              • Any financial decisions made based on Application data
            </Text>
            <Text style={styles.bulletPoint}>
              • Unauthorized access to or alteration of your data
            </Text>
            <Text style={styles.bulletPoint}>
              • Any other matter relating to the Application
            </Text>
          </View>
          <Text style={styles.paragraph}>
            The Service Provider's total liability shall not exceed the amount
            you paid for the Application in the 12 months preceding the claim.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>Third-Party Services</Text>
          <Text style={styles.paragraph}>
            Please note that the Application utilizes third-party services that
            have their own Terms and Conditions. Below are the links to the
            Terms and Conditions of the third-party service providers used by
            the Application:
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
              • OpenAI (AI financial advice)
            </Text>
            <Text style={styles.bulletPoint}>
              • Apple Authentication (Sign in with Apple)
            </Text>
            <Text style={styles.bulletPoint}>
              • Expo Notifications (push notifications)
            </Text>
            <Text style={styles.bulletPoint}>• Firebase Realtime Database</Text>
            <Text style={styles.bulletPoint}>• Firebase Cloud Functions</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>Internet Connectivity</Text>
          <Text style={styles.paragraph}>
            Please be aware that the Service Provider does not assume
            responsibility for certain aspects. Some functions of the
            Application require an active internet connection, which can be
            Wi-Fi or provided by your mobile network provider. The Service
            Provider cannot be held responsible if the Application does not
            function at full capacity due to lack of access to Wi-Fi or if you
            have exhausted your data allowance.
          </Text>
          <Text style={styles.paragraph}>
            If you are using the application outside of a Wi-Fi area, please be
            aware that your mobile network provider's agreement terms still
            apply. Consequently, you may incur charges from your mobile provider
            for data usage during the connection to the application, or other
            third-party charges. By using the application, you accept
            responsibility for any such charges, including roaming data charges
            if you use the application outside of your home territory (i.e.,
            region or country) without disabling data roaming. If you are not
            the bill payer for the device on which you are using the
            application, they assume that you have obtained permission from the
            bill payer.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>Device Responsibility</Text>
          <Text style={styles.paragraph}>
            Similarly, the Service Provider cannot always assume responsibility
            for your usage of the application. For instance, it is your
            responsibility to ensure that your device remains charged. If your
            device runs out of battery and you are unable to access the Service,
            the Service Provider cannot be held responsible.
          </Text>
          <Text style={styles.paragraph}>
            In terms of the Service Provider's responsibility for your use of
            the application, it is important to note that while they strive to
            ensure that it is updated and accurate at all times, they do rely on
            third parties to provide information to them so that they can make
            it available to you. The Service Provider accepts no liability for
            any loss, direct or indirect, that you experience as a result of
            relying entirely on this functionality of the application.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>
            Application Updates and Termination
          </Text>
          <Text style={styles.paragraph}>
            The Service Provider may wish to update the application at some
            point. The application is currently available as per the
            requirements for the operating system (and for any additional
            systems they decide to extend the availability of the application
            to) may change, and you will need to download the updates if you
            want to continue using the application. The Service Provider does
            not guarantee that it will always update the application so that it
            is relevant to you and/or compatible with the particular operating
            system version installed on your device. However, you agree to
            always accept updates to the application when offered to you. The
            Service Provider may also wish to cease providing the application
            and may terminate its use at any time without providing termination
            notice to you. Unless they inform you otherwise, upon any
            termination, (a) the rights and licenses granted to you in these
            terms will end; (b) you must cease using the application, and (if
            necessary) delete it from your device.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>Intellectual Property</Text>
          <Text style={styles.paragraph}>
            The Application and its original content, features, and
            functionality are and will remain the exclusive property of the
            Service Provider and its licensors. The Application is protected by
            copyright, trademark, and other laws. The Service Provider's
            trademarks and trade dress may not be used in connection with any
            product or service without the Service Provider's prior written
            consent.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>Disclaimers</Text>
          <Text style={styles.paragraph}>
            The Application is provided "as is" and "as available" without any
            warranties of any kind, either express or implied. The Service
            Provider disclaims all warranties, including but not limited to:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletPoint}>
              • Warranties of merchantability and fitness for a particular
              purpose
            </Text>
            <Text style={styles.bulletPoint}>
              • Warranties that the Application will be uninterrupted or
              error-free
            </Text>
            <Text style={styles.bulletPoint}>
              • Warranties regarding the accuracy or reliability of financial
              data
            </Text>
            <Text style={styles.bulletPoint}>
              • Warranties that defects will be corrected
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>Governing Law</Text>
          <Text style={styles.paragraph}>
            These Terms shall be governed by and construed in accordance with
            the laws of the jurisdiction in which the Service Provider operates,
            without regard to its conflict of law provisions. Any disputes
            arising from these Terms or your use of the Application shall be
            resolved through binding arbitration or in the courts of the Service
            Provider's jurisdiction.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.subtitle}>
            Changes to These Terms and Conditions
          </Text>
          <Text style={styles.paragraph}>
            The Service Provider may periodically update their Terms and
            Conditions. Therefore, you are advised to review this page regularly
            for any changes. The Service Provider will notify you of any changes
            by posting the new Terms and Conditions on this page.
          </Text>
        </View>

        <View style={styles.contactInfo}>
          <Text style={styles.contactText}>
            If you have any questions or suggestions about the Terms and
            Conditions, please do not hesitate to contact the Service Provider
            at support@vectorfi.ai.
          </Text>
        </View>

        <Text style={styles.dateText}>
          These terms and conditions are effective as of 2025-01-27
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};
