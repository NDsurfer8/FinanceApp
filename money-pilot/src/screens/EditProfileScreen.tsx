import React, { useState, useRef } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../contexts/ThemeContext";
import { updateProfile } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../services/firebase";
import { useUser } from "../context/UserContext";
import { useTranslation } from "react-i18next";

interface EditProfileScreenProps {
  navigation: any;
}

export const EditProfileScreen: React.FC<EditProfileScreenProps> = ({
  navigation,
}) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { forceRefresh, updateUserImmediately } = useUser();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [photoURL, setPhotoURL] = useState(user?.photoURL || "");
  const [tempPhotoURL, setTempPhotoURL] = useState<string | null>(null);
  const [email, setEmail] = useState(user?.email || "");

  const pickImage = async () => {
    try {
      // Request permissions
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          t("edit_profile.permission_required"),
          t("edit_profile.camera_roll_permission")
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setTempPhotoURL(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert(t("common.error"), t("edit_profile.error_picking_image"));
    }
  };

  const takePhoto = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          t("edit_profile.permission_required"),
          t("edit_profile.camera_permission")
        );
        return;
      }

      // Launch camera
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setTempPhotoURL(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error taking photo:", error);
      Alert.alert(t("common.error"), t("edit_profile.error_taking_photo"));
    }
  };

  const uploadImageToStorage = async (uri: string): Promise<string> => {
    try {
      // Starting image upload

      // Fetch the image and convert to blob
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }

      const blob = await response.blob();
      // Image blob created

      // Create unique filename
      const filename = `profile-photos/${user?.uid}-${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);

      // Uploading to Firebase Storage

      // Upload the blob
      const uploadResult = await uploadBytes(storageRef, blob, {
        contentType: "image/jpeg",
        cacheControl: "public, max-age=31536000",
      });

      // Upload successful, getting download URL

      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);
      // Download URL obtained

      return downloadURL;
    } catch (error: any) {
      console.error("Firebase Storage upload error:", error);

      // Provide more specific error messages
      if (error.code === "storage/unauthorized") {
        throw new Error(
          "Upload failed: Unauthorized. Please check your Firebase Storage rules."
        );
      } else if (error.code === "storage/quota-exceeded") {
        throw new Error("Upload failed: Storage quota exceeded.");
      } else if (error.code === "storage/unknown") {
        throw new Error(
          "Upload failed: Unknown error. Please check your Firebase configuration."
        );
      } else {
        throw new Error(`Upload failed: ${error.message || "Unknown error"}`);
      }
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let newPhotoURL = photoURL;

      // Upload new photo if selected
      if (tempPhotoURL) {
        // Uploading new profile photo
        try {
          newPhotoURL = await uploadImageToStorage(tempPhotoURL);
          // Photo upload completed
        } catch (uploadError) {
          console.error("Photo upload failed:", uploadError);

          // Ask user if they want to continue without the photo
          Alert.alert(
            t("edit_profile.photo_upload_failed"),
            t("edit_profile.photo_upload_failed_message"),
            [
              {
                text: t("edit_profile.save_without_photo"),
                onPress: async () => {
                  try {
                    await updateProfile(user, {
                      displayName: displayName.trim(),
                      photoURL: photoURL, // Keep existing photo
                    });
                    Alert.alert(
                      t("common.success"),
                      t("edit_profile.profile_updated_successfully"),
                      [
                        {
                          text: t("common.ok"),
                          onPress: () => navigation.goBack(),
                        },
                      ]
                    );
                  } catch (profileError) {
                    console.error("Profile update failed:", profileError);
                    Alert.alert(
                      t("common.error"),
                      t("edit_profile.failed_to_update_profile_name")
                    );
                  } finally {
                    setLoading(false);
                  }
                },
              },
              {
                text: t("common.cancel"),
                style: "cancel",
                onPress: () => setLoading(false),
              },
            ]
          );
          return;
        }
      }

      // Update profile
      // Updating Firebase Auth profile
      await updateProfile(user, {
        displayName: displayName.trim(),
        photoURL: newPhotoURL,
      });

      // Profile update successful

      // Immediately update the user context with the new data
      if (user) {
        const userWithUpdates = {
          ...user,
          displayName: displayName.trim(),
          photoURL: newPhotoURL,
        };
        // Immediately updating user context
        updateUserImmediately(userWithUpdates);
      }

      // Also force refresh to ensure everything is in sync
      // Refreshing user data
      await forceRefresh();
      // User data refresh completed

      Alert.alert(
        t("common.success"),
        t("edit_profile.profile_updated_successfully"),
        [
          {
            text: t("common.ok"),
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      console.error("Error updating profile:", error);

      // Show more specific error messages
      let errorMessage = t("edit_profile.failed_to_update_profile");

      if (error.message) {
        if (error.message.includes("Upload failed:")) {
          errorMessage = error.message;
        } else if (error.message.includes("storage/")) {
          errorMessage = "Storage error: " + error.message;
        } else if (error.message.includes("auth/")) {
          errorMessage = "Authentication error: " + error.message;
        }
      }

      Alert.alert(t("common.error"), errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const showPhotoOptions = () => {
    Alert.alert(
      t("edit_profile.profile_photo_options"),
      t("edit_profile.choose_option"),
      [
        {
          text: t("edit_profile.take_photo"),
          onPress: takePhoto,
        },
        {
          text: t("edit_profile.choose_from_library"),
          onPress: pickImage,
        },
        {
          text: t("edit_profile.remove_photo"),
          onPress: () => {
            setTempPhotoURL(null);
            setPhotoURL("");
          },
          style: "destructive",
        },
        {
          text: t("common.cancel"),
          style: "cancel",
        },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 32,
            paddingTop: 8,
          }}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              marginRight: 20,
              padding: 10,
            }}
          >
            <Ionicons
              name="arrow-back"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          <View>
            <Text
              style={{
                fontSize: 26,
                fontWeight: "700",
                color: colors.text,
                letterSpacing: -0.3,
              }}
            >
              {t("edit_profile.title")}
            </Text>
            <Text
              style={{
                fontSize: 16,
                color: colors.textSecondary,
                marginTop: 4,
                fontWeight: "400",
              }}
            >
              {t("edit_profile.subtitle")}
            </Text>
          </View>
        </View>

        {/* Profile Photo Section */}
        <View
          style={{
            backgroundColor: colors.card,
            borderRadius: 16,
            padding: 24,
            marginBottom: 20,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: colors.text,
              marginBottom: 20,
            }}
          >
            {t("edit_profile.profile_photo")}
          </Text>

          <View style={{ alignItems: "center" }}>
            <TouchableOpacity onPress={showPhotoOptions}>
              <View
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 60,
                  backgroundColor: colors.primary,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                  overflow: "hidden",
                }}
              >
                {tempPhotoURL || photoURL ? (
                  <Image
                    source={{ uri: tempPhotoURL || photoURL }}
                    style={{
                      width: 120,
                      height: 120,
                      borderRadius: 60,
                    }}
                  />
                ) : (
                  <Ionicons name="person" size={48} color="white" />
                )}
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={showPhotoOptions}
              style={{
                backgroundColor: colors.surfaceSecondary,
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.border,
              }}
            >
              <Text style={{ color: colors.primary, fontWeight: "600" }}>
                {t("edit_profile.change_photo")}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Form Fields */}
        {/* Display Name */}
        <View style={{ marginBottom: 20 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: colors.text,
              marginBottom: 8,
            }}
          >
            {t("edit_profile.display_name")}
          </Text>
          <TextInput
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 8,
              padding: 12,
              fontSize: 16,
              color: colors.text,
              backgroundColor: colors.card,
            }}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder={t("edit_profile.display_name_placeholder")}
            placeholderTextColor={colors.inputPlaceholder}
          />
        </View>

        {/* Email (Read-only) */}
        <View style={{ marginBottom: 20 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: colors.text,
              marginBottom: 8,
            }}
          >
            {t("edit_profile.email_address")}
          </Text>
          <View
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 8,
              padding: 12,
              backgroundColor: colors.surfaceSecondary,
            }}
          >
            <Text style={{ fontSize: 16, color: colors.textSecondary }}>
              {email}
            </Text>
          </View>
          <Text
            style={{
              fontSize: 12,
              color: colors.textSecondary,
              marginTop: 4,
            }}
          >
            {t("edit_profile.email_cannot_be_changed")}
          </Text>
        </View>

        {/* Account Info */}
        <View style={{ marginBottom: 20 }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: colors.text,
              marginBottom: 8,
            }}
          >
            {t("edit_profile.account_information")}
          </Text>
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 8,
              padding: 16,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                {t("edit_profile.member_since")}
              </Text>
              <Text
                style={{ fontSize: 14, fontWeight: "600", color: colors.text }}
              >
                {user?.metadata?.creationTime
                  ? new Date(user.metadata.creationTime).toLocaleDateString(
                      "en-US",
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )
                  : t("edit_profile.recently")}
              </Text>
            </View>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                {t("edit_profile.email_verified")}
              </Text>
              <View
                style={{
                  backgroundColor: user?.emailVerified
                    ? colors.successLight
                    : colors.errorLight,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 8,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: user?.emailVerified ? colors.success : colors.error,
                  }}
                >
                  {user?.emailVerified
                    ? t("edit_profile.verified")
                    : t("edit_profile.not_verified")}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={{ marginTop: 20 }}>
          <TouchableOpacity
            style={{
              backgroundColor: colors.primary,
              padding: 16,
              borderRadius: 8,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
            }}
            onPress={handleSave}
            disabled={loading}
          >
            {loading && (
              <ActivityIndicator
                size="small"
                color="white"
                style={{ marginRight: 8 }}
              />
            )}
            <Text
              style={{
                color: "white",
                fontSize: 16,
                fontWeight: "600",
              }}
            >
              {t("edit_profile.save_changes")}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
