import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
  AuthError,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  OAuthProvider,
  signInWithCredential,
  fetchSignInMethodsForEmail,
} from "firebase/auth";
import { auth } from "./firebase";
import { saveUserProfile, UserProfile } from "./userData";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { retryWithBackoff, checkNetworkConnectivity } from "./networkUtils";

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

// Check if email already exists (prevents duplicates)
export const checkEmailExists = async (email: string): Promise<boolean> => {
  try {
    const methods = await fetchSignInMethodsForEmail(
      auth,
      email.toLowerCase().trim()
    );
    return methods.length > 0;
  } catch (error) {
    console.error("Error checking email existence:", error);
    return false;
  }
};

// Sign in with Apple
export const signInWithApple = async (): Promise<UserData> => {
  try {
    // Check if Apple Authentication is available first
    const isAvailable = await AppleAuthentication.isAvailableAsync();
    if (!isAvailable) {
      throw {
        code: "auth/apple-not-available",
        message: "Apple Sign In is not available on this device.",
      } as AuthErrorType;
    }

    // Generate a cryptographically secure random nonce and its SHA-256 hash
    const randomBytes = Crypto.getRandomBytes(32);
    const rawNonce = Array.from(randomBytes)
      .map((b: number) => b.toString(16).padStart(2, "0"))
      .join("");

    // Ensure nonce is properly formatted
    if (!rawNonce || rawNonce.length !== 64) {
      throw {
        code: "auth/invalid-nonce",
        message: "Failed to generate valid nonce for Apple Sign-In",
      } as AuthErrorType;
    }

    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce,
      { encoding: Crypto.CryptoEncoding.HEX }
    );

    console.log("Nonce generated:", {
      rawNonceLength: rawNonce.length,
      hashedNonceLength: hashedNonce.length,
      rawNoncePrefix: rawNonce.substring(0, 8),
      hashedNoncePrefix: hashedNonce.substring(0, 8),
    });

    console.log("Starting Apple authentication...");

    // Request Apple authentication
    let credential;
    try {
      credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        // Pass the SHA-256 hashed nonce to Apple (required for Firebase)
        nonce: hashedNonce,
      });
    } catch (appleError: any) {
      console.error("Apple authentication error:", appleError);
      throw {
        code: "auth/apple-signin-failed",
        message: `Apple Sign-In failed: ${appleError.message}`,
      } as AuthErrorType;
    }

    console.log("Apple authentication completed:", {
      hasIdentityToken: !!credential.identityToken,
      hasEmail: !!credential.email,
      hasFullName: !!credential.fullName,
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

    console.log("Firebase credential created, attempting sign-in...");

    // Sign in to Firebase
    let userCredential;
    try {
      userCredential = await signInWithCredential(auth, firebaseCredential);
    } catch (firebaseError: any) {
      console.error("Firebase sign-in error:", firebaseError);
      console.log("Firebase error code:", firebaseError.code);

      // Handle specific Firebase error codes
      if (firebaseError.code === "auth/error-code:-40") {
        throw {
          code: "auth/apple-nonce-mismatch",
          message:
            "Apple Sign-In nonce verification failed. This may be due to a timing issue or invalid nonce generation.",
        } as AuthErrorType;
      }

      throw {
        code: firebaseError.code || "auth/unknown",
        message: `Firebase authentication failed: ${firebaseError.message}`,
      } as AuthErrorType;
    }

    const user = userCredential.user;

    console.log("Apple Sign In successful:", {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
    });

    // Apple Sign-In should work the same for both login and signup
    // Always ensure user profile exists in database (create if missing, update if exists)
    let displayName = "";

    // First, try to get name from Apple's credential
    if (credential.fullName) {
      const appleName = `${credential.fullName.givenName || ""} ${
        credential.fullName.familyName || ""
      }`.trim();
      if (appleName) {
        displayName = appleName;
      }
    }

    // If no name from Apple, try Firebase user's display name
    if (!displayName && user.displayName) {
      displayName = user.displayName;
    }

    // If still no name, try to extract from email
    if (!displayName && user.email) {
      const emailName = user.email.split("@")[0];
      if (emailName && emailName !== "apple-user") {
        displayName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
      }
    }

    // Last resort fallback
    if (!displayName) {
      displayName = "Apple User";
    }

    console.log("Display name resolution:", {
      appleFullName: credential.fullName,
      firebaseDisplayName: user.displayName,
      userEmail: user.email,
      finalDisplayName: displayName,
    });

    // Update display name if we have a better name than what's currently set
    if (displayName && displayName !== user.displayName) {
      await updateProfile(user, {
        displayName: displayName,
      });
    }

    // Always ensure user profile exists in database
    // This handles both new users and returning users seamlessly
    const userProfile: UserProfile = {
      uid: user.uid,
      email: credential.email || user.email || null, // Don't use fake email, use null
      displayName: displayName || "Apple User",
      createdAt: Date.now(), // Use current timestamp to avoid 2025 issue
      updatedAt: Date.now(),
    };

    try {
      await saveUserProfile(userProfile);
      console.log("Apple user profile ensured in database:", userProfile);
    } catch (dbError) {
      console.error("Error saving Apple user profile to database:", dbError);
      // Don't throw here - auth was successful, just database save failed
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
      console.log("Apple error code:", appleError.code);

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
        case "ERR_REQUEST_EXPIRED":
          throw {
            code: "auth/request-expired",
            message: "Apple Sign In request expired. Please try again.",
          } as AuthErrorType;
        case "ERR_REQUEST_NOT_HANDLED":
          throw {
            code: "auth/request-not-handled",
            message: "Apple Sign In request was not handled.",
          } as AuthErrorType;
        case "ERR_REQUEST_INVALID":
          throw {
            code: "auth/request-invalid",
            message: "Invalid Apple Sign In request.",
          } as AuthErrorType;
        default:
          console.log("Unknown Apple error code:", appleError.code);
          throw {
            code: "auth/unknown",
            message: `An unknown error occurred with Apple Sign In. Code: ${appleError.code}`,
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
    // Normalize email to prevent case-sensitive duplicates
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists to prevent duplicates
    const emailExists = await checkEmailExists(normalizedEmail);
    if (emailExists) {
      throw {
        code: "auth/email-already-in-use",
        message:
          "An account with this email already exists. Please sign in instead.",
      } as AuthErrorType;
    }

    // Validate email format
    if (!validateEmail(normalizedEmail)) {
      throw {
        code: "auth/invalid-email",
        message: "Please enter a valid email address.",
      } as AuthErrorType;
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      throw {
        code: "auth/weak-password",
        message: passwordValidation.message,
      } as AuthErrorType;
    }

    const userCredential = await createUserWithEmailAndPassword(
      auth,
      normalizedEmail,
      password
    );

    const user = userCredential.user;

    // Update display name if provided
    if (displayName) {
      await updateProfile(user, {
        displayName: displayName.trim(),
      });
    }

    // Save user profile to database with proper timestamp
    if (user.email) {
      const userProfile: UserProfile = {
        uid: user.uid,
        email: user.email.toLowerCase().trim(), // Ensure normalized email
        displayName: user.displayName || displayName?.trim() || "User",
        createdAt: Date.now(), // Use current timestamp to avoid 2025 issue
        updatedAt: Date.now(),
      };

      try {
        await saveUserProfile(userProfile);
        console.log("✅ User profile saved successfully:", user.uid);
      } catch (dbError) {
        console.error("❌ Error saving user profile to database:", dbError);
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

    // Handle specific error cases with better messages
    let errorMessage = "An error occurred during sign up";

    switch (authError.code) {
      case "auth/email-already-in-use":
        errorMessage =
          "An account with this email already exists. Please sign in instead.";
        break;
      case "auth/invalid-email":
        errorMessage = "Please enter a valid email address.";
        break;
      case "auth/weak-password":
        errorMessage =
          "Password is too weak. Please choose a stronger password.";
        break;
      case "auth/operation-not-allowed":
        errorMessage =
          "Email/password accounts are not enabled. Please contact support.";
        break;
      case "auth/network-request-failed":
        errorMessage =
          "Network error. Please check your internet connection and try again.";
        break;
      default:
        errorMessage = authError.message || errorMessage;
    }

    throw {
      code: authError.code || "unknown",
      message: errorMessage,
    } as AuthErrorType;
  }
};

// Sign in with email and password
export const signIn = async (
  email: string,
  password: string
): Promise<UserData> => {
  try {
    // Normalize email to prevent case-sensitive issues
    const normalizedEmail = email.toLowerCase().trim();

    // Validate email format
    if (!validateEmail(normalizedEmail)) {
      throw {
        code: "auth/invalid-email",
        message: "Please enter a valid email address.",
      } as AuthErrorType;
    }

    // Check network connectivity first
    const isConnected = await checkNetworkConnectivity();
    if (!isConnected) {
      throw {
        code: "auth/network-request-failed",
        message:
          "No internet connection. Please check your network and try again.",
      } as AuthErrorType;
    }

    // Use retry mechanism for sign in
    return await retryWithBackoff(async () => {
      // First, try to refresh any existing session
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          await currentUser.reload();
          // If reload succeeds, user might already be signed in
          if (currentUser.email?.toLowerCase() === normalizedEmail) {
            return {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName || undefined,
            };
          }
        } catch (reloadError) {
          console.log("Session reload failed, proceeding with new sign in");
        }
      }

      const userCredential = await signInWithEmailAndPassword(
        auth,
        normalizedEmail,
        password
      );

      const user = userCredential.user;

      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || undefined,
      };
    });
  } catch (error) {
    console.error("Firebase auth error:", error);
    const authError = error as AuthError;

    // Handle specific error cases with better messages
    let errorMessage = "An error occurred during sign in";

    switch (authError.code) {
      case "auth/user-not-found":
        errorMessage =
          "No account found with this email address. Please sign up first.";
        break;
      case "auth/wrong-password":
        errorMessage = "Incorrect password. Please try again.";
        break;
      case "auth/invalid-email":
        errorMessage = "Please enter a valid email address.";
        break;
      case "auth/user-disabled":
        errorMessage =
          "This account has been disabled. Please contact support.";
        break;
      case "auth/too-many-requests":
        errorMessage = "Too many failed attempts. Please try again later.";
        break;
      case "auth/network-request-failed":
        errorMessage =
          "Network error. Please check your internet connection and try again.";
        break;
      default:
        errorMessage = authError.message || errorMessage;
    }

    // Handle network errors specifically
    if (authError.code === "auth/network-request-failed") {
      console.warn("Network error during sign in, this might be temporary");
    }

    // Handle specific invalid credential errors
    if (
      authError.code === "auth/invalid-credential" ||
      authError.code === "auth/invalid-login-credentials"
    ) {
      // Try to clear any stale session
      try {
        await signOut(auth);
      } catch (signOutError) {
        console.log("Error clearing session:", signOutError);
      }
    }

    throw {
      code: authError.code || "unknown",
      message: errorMessage,
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

// Send email verification
export const sendEmailVerificationLink = async (): Promise<void> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw {
        code: "auth/no-user",
        message: "No user is currently signed in.",
      } as AuthErrorType;
    }

    if (currentUser.emailVerified) {
      throw {
        code: "auth/email-already-verified",
        message: "Email is already verified.",
      } as AuthErrorType;
    }

    await sendEmailVerification(currentUser);
  } catch (error) {
    console.error("Firebase email verification error:", error);
    const authError = error as AuthError;
    throw {
      code: authError.code || "unknown",
      message:
        getAuthErrorMessage(authError.code) ||
        authError.message ||
        "An error occurred while sending email verification",
    } as AuthErrorType;
  }
};

// Sign out
export const signOutUser = async (): Promise<void> => {
  try {
    // First, disconnect bank connection if connected
    try {
      const { plaidService } = await import("./plaid");
      const isConnected = await plaidService.isBankConnected();
      if (isConnected) {
        console.log("Disconnecting bank before logout...");
        await plaidService.disconnectBankSilently();
        console.log("Bank disconnected successfully");
      }
    } catch (bankError) {
      console.error("Error disconnecting bank during logout:", bankError);
      // Continue with logout even if bank disconnection fails
    }

    // Then sign out from Firebase
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

// Refresh user token and validate session
export const refreshUserToken = async (): Promise<boolean> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return false;
    }

    // Force token refresh
    await currentUser.getIdToken(true);
    return true;
  } catch (error) {
    console.error("Error refreshing user token:", error);
    return false;
  }
};

// Check if user session is valid
export const isUserSessionValid = async (): Promise<boolean> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      return false;
    }

    // Try to get a fresh token
    const token = await currentUser.getIdToken(true);
    return !!token;
  } catch (error) {
    console.error("Error validating user session:", error);
    return false;
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
    case "auth/invalid-credential":
      return "Invalid email or password. Please check your credentials and try again.";
    case "auth/invalid-login-credentials":
      return "Invalid email or password. Please check your credentials and try again.";
    case "auth/user-token-expired":
      return "Your session has expired. Please sign in again.";
    case "auth/user-token-revoked":
      return "Your session has been revoked. Please sign in again.";
    case "auth/requires-recent-login":
      return "This action requires recent authentication. Please sign in again.";
    case "auth/email-already-verified":
      return "Email is already verified.";
    case "auth/no-user":
      return "No user is currently signed in.";
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
  if (password.length < 8) {
    return {
      isValid: false,
      message: "Password must be at least 8 characters long.",
    };
  }

  if (password.length > 128) {
    return {
      isValid: false,
      message: "Password must be less than 128 characters.",
    };
  }

  // Check for at least one uppercase, lowercase, number, and special character
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
    return {
      isValid: false,
      message:
        "Password must contain at least one uppercase letter, lowercase letter, number, and special character.",
    };
  }

  return {
    isValid: true,
    message: "Password is valid.",
  };
};
