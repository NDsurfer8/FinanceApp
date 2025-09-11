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

interface EditProfileScreenProps {
  navigation: any;
}

export const EditProfileScreen: React.FC<EditProfileScreenProps> = ({
  navigation,
}) => {
  const { user } = useAuth();
  const { colors } = useTheme();
  const { forceRefresh, updateUserImmediately } = useUser();
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
          "Permission Required",
          "Sorry, we need camera roll permissions to upload a profile photo."
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
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const takePhoto = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Sorry, we need camera permissions to take a photo."
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
      Alert.alert("Error", "Failed to take photo. Please try again.");
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
            "Photo Upload Failed",
            "The photo couldn't be uploaded. Would you like to save your profile without the photo?",
            [
              {
                text: "Save Without Photo",
                onPress: async () => {
                  try {
                    await updateProfile(user, {
                      displayName: displayName.trim(),
                      photoURL: photoURL, // Keep existing photo
                    });
                    Alert.alert(
                      t("common.success"),
                      "Profile updated successfully!",
                      [
                        {
                          text: t("common.ok"),
                          onPress: () => navigation.goBack(),
                        },
                      ]
                    );
                  } catch (profileError) {
                    console.error("Profile update failed:", profileError);
                    Alert.alert("Error", "Failed to update profile name.");
                  } finally {
                    setLoading(false);
                  }
                },
              },
              {
                text: "Cancel",
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

      Alert.alert(t("common.success"), "Profile updated successfully!", [
        {
          text: t("common.ok"),
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error: any) {
      console.error("Error updating profile:", error);

      // Show more specific error messages
      let errorMessage = "Failed to update profile. Please try again.";

      if (error.message) {
        if (error.message.includes("Upload failed:")) {
          errorMessage = error.message;
        } else if (error.message.includes("storage/")) {
          errorMessage = "Storage error: " + error.message;
        } else if (error.message.includes("auth/")) {
          errorMessage = "Authentication error: " + error.message;
        }
      }

      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const showPhotoOptions = () => {
    Alert.alert("Profile Photo", "Choose an option", [
      {
        text: "Take Photo",
        onPress: takePhoto,
      },
      {
        text: "Choose from Library",
        onPress: pickImage,
      },
      {
        text: "Remove Photo",
        onPress: () => {
          setTempPhotoURL(null);
          setPhotoURL("");
        },
        style: "destructive",
      },
      {
        text: "Cancel",
        style: "cancel",
      },
    ]);
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
              Edit Profile
            </Text>
            <Text
              style={{
                fontSize: 16,
                color: colors.textSecondary,
                marginTop: 4,
                fontWeight: "400",
              }}
            >
              Update your profile information
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
            Profile Photo
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
                Change Photo
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
            Display Name
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
            placeholder="Enter your display name"
            placeholderTextColor={colors.textSecondary}
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
            Email Address
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
            Email cannot be changed from this screen
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
            Account Information
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
                Member Since
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
                  : "Recently"}
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
                Email Verified
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
                  {user?.emailVerified ? "Verified" : "Not Verified"}
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
              Save Changes
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
