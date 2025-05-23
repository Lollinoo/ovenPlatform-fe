import { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import authService from "../utils/authService";

// Create the context
const AuthContext = createContext();

// Hook for using the auth context
export const useAuth = () => {
  return useContext(AuthContext);
};

// Provider component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Check if user is authenticated and load user data
  const checkAuth = async () => {
    try {
      setLoading(true);
      const userData = await authService.getCurrentUser();
      setCurrentUser(userData);
      return userData;
    } catch (err) {
      console.error("Failed to check authentication:", err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Load user on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError("");
      const response = await authService.login({ email, password });

      if (!response.success) {
        throw new Error(response.message || "Login failed");
      }

      // Dopo un login riuscito, ottieni tutti i dati utente aggiornati
      const userData = await authService.getCurrentUser();
      if (userData) {
        setCurrentUser(userData);
      } else {
        // Se non è possibile ottenere i dati completi, usa quelli base dalla risposta
        setCurrentUser(response.user);
      }

      return { success: true };
    } catch (err) {
      setError(err.message || "Login failed. Please try again.");
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (username, email, password) => {
    try {
      setLoading(true);
      setError("");
      const response = await authService.register({
        username,
        email,
        password,
      });

      if (!response.success) {
        throw new Error(response.message || "Registration failed");
      }

      return { success: true, message: response.message };
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setLoading(true);
      await authService.logout();
      setCurrentUser(null);
      navigate("/login");
      return { success: true };
    } catch (err) {
      setError("Logout failed. Please try again.");
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Forgot password function
  const forgotPassword = async (email) => {
    try {
      setLoading(true);
      setError("");
      const response = await authService.forgotPassword(email);

      if (!response.success) {
        throw new Error(response.message || "Password reset request failed");
      }

      return { success: true, message: response.message };
    } catch (err) {
      setError(
        err.message || "Password reset request failed. Please try again."
      );
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Reset password function
  const resetPassword = async (token, password) => {
    try {
      setLoading(true);
      setError("");
      const response = await authService.resetPassword(token, password);

      if (!response.success) {
        throw new Error(response.message || "Password reset failed");
      }

      return { success: true, message: response.message };
    } catch (err) {
      setError(err.message || "Password reset failed. Please try again.");
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Verify email function
  const verifyEmail = async (token) => {
    try {
      setLoading(true);
      setError("");
      const response = await authService.verifyEmail(token);

      if (!response.success) {
        throw new Error(response.message || "Email verification failed");
      }

      // Email verification should NOT automatically log the user in
      // The user should be redirected to login page to authenticate with credentials
      // Do not update currentUser state to avoid showing authenticated navbar

      return { success: true, message: response.message };
    } catch (err) {
      setError(err.message || "Email verification failed. Please try again.");
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Update username
  const updateUsername = async (newUsername, password) => {
    try {
      setLoading(true);
      setError("");
      const response = await authService.updateUsername(newUsername, password);

      if (!response.success) {
        throw new Error(response.message || "Failed to update username");
      }

      return {
        success: true,
        message: response.message,
        nextAllowedDate: response.nextAllowedDate,
      };
    } catch (err) {
      setError(err.message || "Failed to update username. Please try again.");
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Confirm username change
  const confirmUsernameChange = async (token) => {
    try {
      setLoading(true);
      setError("");
      const response = await authService.confirmUsernameChange(token);

      if (!response.success) {
        throw new Error(
          response.message || "Failed to confirm username change"
        );
      }

      // Refresh the user data to get updated username and RTMP URL
      const userData = await authService.getCurrentUser();
      setCurrentUser((prevState) => ({
        ...userData,
        rtmpUrl: response.rtmpUrl || userData.rtmpUrl,
        rtmpUrlExpiresAt:
          response.rtmpUrlExpiresAt || userData.rtmpUrlExpiresAt,
        lastRtmpRegeneratedAt: new Date(), // Aggiorna anche la data di rigenerazione
      }));

      return {
        success: true,
        message: response.message,
        rtmpUrl: response.rtmpUrl,
        rtmpUrlExpiresAt: response.rtmpUrlExpiresAt,
      };
    } catch (err) {
      setError(
        err.message || "Failed to confirm username change. Please try again."
      );
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Update email
  const updateEmail = async (newEmail, password) => {
    try {
      setLoading(true);
      setError("");
      const response = await authService.updateEmail(newEmail, password);

      if (!response.success) {
        throw new Error(response.message || "Failed to update email");
      }

      return { success: true, message: response.message };
    } catch (err) {
      setError(err.message || "Failed to update email. Please try again.");
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Change password
  const changePassword = async (currentPassword, newPassword) => {
    try {
      setLoading(true);
      setError("");
      const response = await authService.changePassword(
        currentPassword,
        newPassword
      );

      if (!response.success) {
        throw new Error(response.message || "Failed to change password");
      }

      return { success: true, message: response.message };
    } catch (err) {
      setError(err.message || "Failed to change password. Please try again.");
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Regenerate RTMP URL
  const regenerateRtmpUrl = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await authService.regenerateRtmpUrl();

      if (!response.success) {
        throw new Error(response.message || "Failed to regenerate RTMP URL");
      }

      // Update current user data with new RTMP URL
      setCurrentUser((prevState) => ({
        ...prevState,
        rtmpUrl: response.rtmpUrl,
        rtmpUrlExpiresAt: response.rtmpUrlExpiresAt,
        lastRtmpRegeneratedAt: new Date(),
      }));

      return {
        success: true,
        message: response.message,
        rtmpUrl: response.rtmpUrl,
        rtmpUrlExpiresAt: response.rtmpUrlExpiresAt,
        nextAllowedDate: response.nextAllowedDate,
      };
    } catch (err) {
      setError(
        err.message || "Failed to regenerate RTMP URL. Please try again."
      );
      return {
        success: false,
        message: err.message,
        nextAllowedDate: err.nextAllowedDate,
      };
    } finally {
      setLoading(false);
    }
  };

  // Confirm email change
  const confirmEmailChange = async (token) => {
    try {
      setLoading(true);
      setError("");
      const response = await authService.confirmEmailChange(token);

      if (!response.success) {
        throw new Error(response.message || "Failed to confirm email change");
      }

      // Refresh the user data to get updated email
      const userData = await authService.getCurrentUser();
      setCurrentUser(userData);

      return { success: true, message: response.message };
    } catch (err) {
      setError(
        err.message || "Failed to confirm email change. Please try again."
      );
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Context value
  const value = {
    currentUser,
    loading,
    error,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    verifyEmail,
    updateUsername,
    updateEmail,
    changePassword,
    regenerateRtmpUrl,
    confirmEmailChange,
    confirmUsernameChange,
    isAuthenticated: !!currentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
