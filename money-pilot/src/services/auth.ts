import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  AuthError,
  updateProfile,
  sendPasswordResetEmail,
  OAuthProvider,
  signInWithCredential,
} from "firebase/auth";
import { auth } from "./firebase";
import { saveUserProfile, UserProfile } from "./userData";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import * as Random from "expo-random";

export interface AuthErrorType {
  code: string;
  message: string;
}

export interface UserData {
  uid: string;
  email: string | null;
  displayName?: string;
}

// Check if Apple Authentication is available
export const isAppleAuthAvailable = async (): Promise<boolean> => {
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch (error) {
    console.error("Error checking Apple Auth availability:", error);
    return false;
  }
};

// Sign in with Apple
export const signInWithApple = async (): Promise<UserData> => {
  try {
    // Generate a cryptographically secure random nonce and its SHA-256 hash
    const randomBytes = Random.getRandomBytes(32);
    const rawNonce = Array.from(randomBytes)
      .map((b: number) => b.toString(16).padStart(2, "0"))
      .join("");
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce
    );

    // Request Apple authentication
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      // Pass the SHA-256 hashed nonce to Apple (required for Firebase)
      nonce: hashedNonce,
    });

    // identityToken is required to authenticate with Firebase
    if (!credential.identityToken) {
      throw {
        code: "auth/missing-identity-token",
        message:
          "Missing identity token from Apple. Ensure you're testing on a real device with a development build (not Expo Go) and that Sign in with Apple is enabled for the bundle identifier.",
      } as AuthErrorType;
    }

    // Create Firebase OAuth provider
    const provider = new OAuthProvider("apple.com");

    // Create credential for Firebase
    const firebaseCredential = provider.credential({
      idToken: credential.identityToken,
      // Provide the un-hashed nonce to Firebase for verification
      rawNonce,
    });

    // Sign in to Firebase
    const userCredential = await signInWithCredential(auth, firebaseCredential);
    const user = userCredential.user;

    console.log("Apple Sign In successful:", {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
    });

    // Only save user profile to database for new Apple users
    // Check if this is a new user by checking if user has metadata
    const isNewUser =
      !user.metadata.lastSignInTime ||
      user.metadata.creationTime === user.metadata.lastSignInTime;

    if (isNewUser) {
      const displayName = credential.fullName
        ? `${credential.fullName.givenName || ""} ${
            credential.fullName.familyName || ""
          }`.trim()
        : "Apple User";

      // Update display name if we have it from Apple
      if (credential.fullName && displayName) {
        await updateProfile(user, {
          displayName: displayName,
        });
      }

      // Save user profile to database only for new users
      const userProfile: UserProfile = {
        uid: user.uid,
        email: credential.email || user.email || "",
        displayName: displayName,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      try {
        await saveUserProfile(userProfile);
        console.log("New Apple user profile saved to database:", userProfile);
      } catch (dbError) {
        console.error("Error saving Apple user profile to database:", dbError);
        // Don't throw here - auth was successful, just database save failed
      }
    } else {
      console.log("Existing Apple user signed in, no profile save needed");
    }

    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || undefined,
    };
  } catch (error) {
    console.error("Apple authentication error:", error);

    // Handle specific Apple authentication errors
    if (error && typeof error === "object" && "code" in error) {
      const appleError = error as any;
      switch (appleError.code) {
        case "ERR_CANCELED":
          throw {
            code: "auth/canceled",
            message: "Apple Sign In was canceled.",
          } as AuthErrorType;
        case "ERR_INVALID_RESPONSE":
          throw {
            code: "auth/invalid-response",
            message: "Invalid response from Apple. Please try again.",
          } as AuthErrorType;
        case "ERR_NOT_HANDLED":
          throw {
            code: "auth/not-handled",
            message: "Apple Sign In was not handled properly.",
          } as AuthErrorType;
        default:
          throw {
            code: "auth/unknown",
            message: "An unknown error occurred with Apple Sign In.",
          } as AuthErrorType;
      }
    }

    // Handle other errors
    if (error && typeof error === "object" && "code" in error) {
      const firebaseError = error as any;
      if (firebaseError.code === "auth/invalid-credential") {
        throw {
          code: "auth/invalid-credential",
          message:
            "Firebase configuration mismatch. Please check that your bundle identifier matches your Firebase project configuration.",
        } as AuthErrorType;
      }
    }

    throw {
      code: "auth/apple-signin-failed",
      message: "Apple Sign In failed. Please try again.",
    } as AuthErrorType;
  }
};

// Sign up with email and password
export const signUp = async (
  email: string,
  password: string,
  displayName?: string
): Promise<UserData> => {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

    const user = userCredential.user;

    // Update display name if provided
    if (displayName) {
      await updateProfile(user, {
        displayName: displayName,
      });
    }

    // Save user profile to database
    if (user.email) {
      const userProfile: UserProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || displayName || "User",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      try {
        await saveUserProfile(userProfile);
      } catch (dbError) {
        console.error("Error saving user profile to database:", dbError);
        // Don't throw here - auth was successful, just database save failed
      }
    }

    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || displayName,
    };
  } catch (error) {
    console.error("Firebase auth error:", error);
    const authError = error as AuthError;
    throw {
      code: authError.code || "unknown",
      message:
        getAuthErrorMessage(authError.code) ||
        authError.message ||
        "An error occurred during sign up",
    } as AuthErrorType;
  }
};

// Sign in with email and password
export const signIn = async (
  email: string,
  password: string
): Promise<UserData> => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

    const user = userCredential.user;

    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || undefined,
    };
  } catch (error) {
    console.error("Firebase auth error:", error);
    const authError = error as AuthError;
    throw {
      code: authError.code || "unknown",
      message:
        getAuthErrorMessage(authError.code) ||
        authError.message ||
        "An error occurred during sign in",
    } as AuthErrorType;
  }
};

// Send password reset email
export const forgotPassword = async (email: string): Promise<void> => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error("Firebase password reset error:", error);
    const authError = error as AuthError;
    throw {
      code: authError.code || "unknown",
      message:
        getAuthErrorMessage(authError.code) ||
        authError.message ||
        "An error occurred while sending password reset email",
    } as AuthErrorType;
  }
};

// Sign out
export const signOutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Firebase auth error:", error);
    const authError = error as AuthError;
    throw {
      code: authError.code || "unknown",
      message:
        getAuthErrorMessage(authError.code) ||
        authError.message ||
        "An error occurred during sign out",
    } as AuthErrorType;
  }
};

// Get current user
export const getCurrentUser = (): User | null => {
  return auth.currentUser;
};

// Force refresh current user (reloads user data from Firebase)
export const reloadCurrentUser = async (): Promise<User | null> => {
  try {
    const currentUser = auth.currentUser;
    if (currentUser) {
      await currentUser.reload();
      return auth.currentUser;
    }
    return null;
  } catch (error) {
    console.error("Error reloading user:", error);
    return auth.currentUser;
  }
};

// Listen to auth state changes
export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Helper function to get user-friendly error messages
const getAuthErrorMessage = (errorCode: string): string => {
  switch (errorCode) {
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/operation-not-allowed":
      return "Email/password accounts are not enabled. Please contact support.";
    case "auth/weak-password":
      return "Password should be at least 6 characters long.";
    case "auth/user-disabled":
      return "This account has been disabled.";
    case "auth/user-not-found":
      return "No account found with this email address.";
    case "auth/wrong-password":
      return "Incorrect password.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Please try again later.";
    case "auth/network-request-failed":
      return "Network error. Please check your internet connection.";
    default:
      return "An error occurred. Please try again.";
  }
};

// Validate email format
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate password strength
export const validatePassword = (
  password: string
): {
  isValid: boolean;
  message: string;
} => {
  if (password.length < 6) {
    return {
      isValid: false,
      message: "Password must be at least 6 characters long.",
    };
  }

  return {
    isValid: true,
    message: "Password is valid.",
  };
};
