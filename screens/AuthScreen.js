import React, { useState } from "react";
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { auth, db } from "../firebaseConfig";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  sendEmailVerification,
  reload
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { serverTimestamp } from "firebase/firestore";

const AuthScreen = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Email verification modal state
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  const getFriendlyError = (error) => {
    if (error.code === 'auth/weak-password') {
      return 'Password must be at least 6 characters long.';
    }
    if (error.code === 'auth/email-already-in-use') {
      return 'This email is already registered.';
    }
    if (error.code === 'auth/invalid-email') {
      return 'Invalid email address.';
    }
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-login-credentials') {
      return 'Invalid email or password.';
    }
    if (error.code === 'auth/password-does-not-meet-requirements') {
      return 'Password must contain at least 6 characters.';
    }
    if (error.code === 'auth/too-many-requests') {
      return 'Too many failed attempts. Please try again later.';
    }
    return error.message;
  };

  const startCooldown = () => {
    setResendCooldown(60);
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResendVerification = async () => {
    if (resendCooldown > 0) return;
    
    setIsLoading(true);
    try {
      // Sign in temporarily to resend verification
      const userCredential = await signInWithEmailAndPassword(auth, verificationEmail, password);
      const user = userCredential.user;
      
      if (user.emailVerified) {
        setShowVerificationModal(false);
        setErrorMessage("");
        Alert.alert("Success", "Your email is already verified! You can now log in.");
        await auth.signOut();
        return;
      }
      
      await sendEmailVerification(user);
      await auth.signOut();
      
      startCooldown();
      Alert.alert("Verification Email Sent", "Please check your inbox for the verification email.");
    } catch (error) {
      console.error("Resend verification error:", error);
      Alert.alert("Error", getFriendlyError(error));
    } finally {
      setIsLoading(false);
    }
  };

  const checkEmailVerification = async (userEmail, userPassword) => {
    try {
      // Sign in to check verification status
      const userCredential = await signInWithEmailAndPassword(auth, userEmail, userPassword);
      const user = userCredential.user;
      
      // Reload user to get latest verification status
      await reload(user);
      
      if (user.emailVerified) {
        return true; // Email is verified, login successful
      } else {
        // Email not verified, sign out and show modal
        await auth.signOut();
        setVerificationEmail(userEmail);
        setShowVerificationModal(true);
        return false;
      }
    } catch (error) {
      throw error;
    }
  };

  const saveUserToFirestore = async (user, username) => {
    console.log("=== FIRESTORE SAVE DEBUG ===");
    console.log("User ID:", user.uid);
    console.log("User Email:", user.email);
    console.log("Username to save:", username);
    console.log("Auth current user:", auth.currentUser?.uid);
    console.log("User email verified:", user.emailVerified);
    
    const userData = {
      username: username,
      email: user.email,
      uid: user.uid,
      createdAt: serverTimestamp(),
    };
    
    console.log("Data to save:", userData);
    console.log("Document path:", `users/${user.uid}`);
    
    try {
      await setDoc(doc(db, "users", user.uid), userData);
      console.log("✅ Firestore save successful");
      return true;
    } catch (firestoreError) {
      console.error("❌ Firestore save failed:");
      console.error("Error code:", firestoreError.code);
      console.error("Error message:", firestoreError.message);
      console.error("Full error:", firestoreError);
      throw firestoreError;
    }
  };

  const handleAuth = async () => {
    setErrorMessage("");
    if (!email || !password || (!isLogin && !username)) {
      setErrorMessage("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    try {
      if (isLogin) {
        // Check email verification
        const isVerified = await checkEmailVerification(email, password);
        if (!isVerified) {
          setErrorMessage("");
          return; // Modal will show for unverified email
        }
        // If we reach here, user is verified and logged in
      } else {
        // Create account
        console.log("=== ACCOUNT CREATION DEBUG ===");
        console.log("Email:", email);
        console.log("Username:", username);
        
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        const user = userCredential.user;
        console.log("✅ User created successfully:", user.uid);

        // First, update profile
        try {
          console.log("Updating profile with displayName:", username);
          await updateProfile(user, {
            displayName: username,
          });
          console.log("✅ Profile updated successfully");
        } catch (profileError) {
          console.error("❌ Profile update failed:", profileError);
          // Continue anyway
        }

        // Save to Firestore BEFORE sending verification email or signing out
        try {
          await saveUserToFirestore(user, username);
        } catch (firestoreError) {
          console.error("Firestore save failed, but continuing with verification...");
        }

        // Send verification email
        try {
          console.log("Sending verification email...");
          await sendEmailVerification(user);
          console.log("✅ Verification email sent");
        } catch (emailError) {
          console.error("❌ Verification email failed:", emailError);
        }

        // Sign out immediately after account creation
        console.log("Signing out user...");
        await auth.signOut();
        console.log("✅ User signed out");

        // Show verification modal
        setVerificationEmail(email);
        setShowVerificationModal(true);
        setErrorMessage("");
      }
    } catch (error) {
      console.error("❌ Auth error:", error);
      setErrorMessage(getFriendlyError(error));
    } finally {
      setIsLoading(false);
    }
  };

  const closeVerificationModal = () => {
    setShowVerificationModal(false);
    setVerificationEmail("");
    setResendCooldown(0);
    // Reset form to login mode and clear fields
    setIsLogin(true);
    setEmail("");
    setPassword("");
    setUsername("");
    setErrorMessage("");
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logo}>CineLink</Text>
            <Text style={styles.subtitle}>
              {isLogin ? "Sign in to your account" : "Create your account"}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {!isLogin && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Username</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your username"
                  placeholderTextColor="#999"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  editable={!isLoading}
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter your password"
                  placeholderTextColor="#999"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  <Text style={styles.eyeText}>
                    {showPassword ? "Hide" : "Show"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {errorMessage ? (
              <Text style={styles.errorMessage}>{errorMessage}</Text>
            ) : null}

            <TouchableOpacity 
              style={[styles.button, isLoading && styles.buttonDisabled]} 
              onPress={handleAuth}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>
                {isLoading ? "Loading..." : (isLogin ? "Sign In" : "Create Account")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Toggle */}
          <TouchableOpacity
            onPress={() => setIsLogin(!isLogin)}
            style={styles.toggleButton}
            disabled={isLoading}
          >
            <Text style={styles.toggleText}>
              {isLogin
                ? "Don't have an account? "
                : "Already have an account? "}
              <Text style={styles.toggleTextBold}>
                {isLogin ? "Sign Up" : "Sign In"}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Email Verification Modal */}
      <Modal
        visible={showVerificationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeVerificationModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Email Verification Required</Text>
            <Text style={styles.modalText}>
              We've sent a verification email to:
            </Text>
            <Text style={styles.modalEmail}>{verificationEmail}</Text>
            <Text style={styles.modalText}>
              Please check your inbox and click the verification link before signing in.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[
                  styles.modalButton, 
                  styles.resendButton,
                  (resendCooldown > 0 || isLoading) && styles.buttonDisabled
                ]} 
                onPress={handleResendVerification}
                disabled={resendCooldown > 0 || isLoading}
              >
                <Text style={styles.modalButtonText}>
                  {resendCooldown > 0 
                    ? `Resend in ${resendCooldown}s` 
                    : isLoading 
                    ? "Sending..." 
                    : "Resend Email"
                  }
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalButton, styles.okButton]} 
                onPress={closeVerificationModal}
                disabled={isLoading}
              >
                <Text style={styles.modalButtonText}>Got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
  },
  logo: {
    fontSize: 36,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#ccc",
    textAlign: "center",
  },
  form: {
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 8,
  },
  input: {
    height: 52,
    borderColor: "#333",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    color: "#fff",
    backgroundColor: "#2a2a2a",
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderColor: "#333",
    borderWidth: 1,
    borderRadius: 8,
    backgroundColor: "#2a2a2a",
  },
  passwordInput: {
    flex: 1,
    height: 52,
    paddingHorizontal: 16,
    color: "#fff",
    fontSize: 16,
  },
  eyeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  eyeText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "500",
  },
  errorMessage: {
    color: "#ff6b6b",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#e50914",
    height: 52,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  toggleButton: {
    alignItems: "center",
  },
  toggleText: {
    color: "#ccc",
    fontSize: 15,
    textAlign: "center",
  },
  toggleTextBold: {
    color: "#e50914",
    fontWeight: "600",
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#2a2a2a",
    borderRadius: 12,
    padding: 24,
    width: "100%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    marginBottom: 16,
  },
  modalText: {
    fontSize: 16,
    color: "#ccc",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 22,
  },
  modalEmail: {
    fontSize: 16,
    color: "#e50914",
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  resendButton: {
    backgroundColor: "#444",
  },
  okButton: {
    backgroundColor: "#e50914",
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default AuthScreen;