import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  AuthError,
  updateProfile,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "./firebase";
import { saveUserProfile, UserProfile } from "./userData";

export interface AuthErrorType {
  code: string;
  message: string;
}

export interface UserData {
  uid: string;
  email: string | null;
  displayName?: string;
}

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
