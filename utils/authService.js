/**
 * Authentication service for OvenPlatform
 * Provides methods for user authentication, registration, and password management
 */
import config from "./envConfig";

// Base URLs for APIs
const AUTH_API_URL = `${config.app.apiUrl}/v1/auth`;
const PROFILE_API_URL = `${config.app.apiUrl}/v1/profile`;

/**
 * Authentication service for managing user authentication
 */
const authService = {
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @param {string} userData.username - User's username
   * @param {string} userData.email - User's email
   * @param {string} userData.password - User's password
   * @returns {Promise<Object>} - Response from the server
   */
  async register(userData) {
    const response = await fetch(`${AUTH_API_URL}/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    return response.json();
  },

  /**
   * Log in a user
   * @param {Object} credentials - User login credentials
   * @param {string} credentials.email - User's email
   * @param {string} credentials.password - User's password
   * @returns {Promise<Object>} - Response from the server with user data
   */
  async login(credentials) {
    const response = await fetch(`${AUTH_API_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Important for cookies
      body: JSON.stringify(credentials),
    });

    return response.json();
  },

  /**
   * Log out the current user
   * @returns {Promise<Object>} - Response from the server
   */
  async logout() {
    const response = await fetch(`${AUTH_API_URL}/logout`, {
      method: "POST",
      credentials: "include", // Important for cookies
    });

    return response.json();
  },

  /**
   * Get the current authenticated user
   * @returns {Promise<Object|null>} - User data or null if not authenticated
   */
  async getCurrentUser() {
    try {
      const response = await fetch(`${AUTH_API_URL}/profile`, {
        method: "GET",
        credentials: "include", // Important for cookies
      });

      if (!response.ok) {
        return null;
      }

      return response.json();
    } catch (error) {
      console.error("Failed to get current user:", error);
      return null;
    }
  },

  /**
   * Request password reset for a user
   * @param {string} email - User's email
   * @returns {Promise<Object>} - Response from the server
   */
  async forgotPassword(email) {
    const response = await fetch(`${AUTH_API_URL}/forgot-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    return response.json();
  },

  /**
   * Reset user password with token
   * @param {string} token - Password reset token
   * @param {string} password - New password
   * @returns {Promise<Object>} - Response from the server
   */
  async resetPassword(token, password) {
    const response = await fetch(`${AUTH_API_URL}/reset-password/${token}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password }),
    });

    return response.json();
  },

  /**
   * Verify a user's email address with token
   * @param {string} token - Email verification token
   * @returns {Promise<Object>} - Response from the server
   */
  async verifyEmail(token) {
    const response = await fetch(`${AUTH_API_URL}/verify-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    });

    return response.json();
  },

  /**
   * Check if the user is authenticated
   * @returns {Promise<boolean>} - True if authenticated, false otherwise
   */
  async isAuthenticated() {
    const user = await this.getCurrentUser();
    return !!user;
  },

  /**
   * Update user's username
   * @param {string} newUsername - New username
   * @param {string} password - Current password for verification
   * @returns {Promise<Object>} - Response from the server
   */
  async updateUsername(newUsername, password) {
    const response = await fetch(`${PROFILE_API_URL}/update-username`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Important for cookies
      body: JSON.stringify({ username: newUsername, password }),
    });

    return response.json();
  },

  /**
   * Confirm username change with token
   * @param {string} token - Username change confirmation token
   * @returns {Promise<Object>} - Response from the server including the new RTMP URL
   */
  async confirmUsernameChange(token) {
    const response = await fetch(`${PROFILE_API_URL}/confirm-username-update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Important for cookies
      body: JSON.stringify({ token }),
    });

    return response.json();
  },

  /**
   * Update user's email
   * @param {string} newEmail - New email address
   * @param {string} password - Current password for verification
   * @returns {Promise<Object>} - Response from the server
   */
  async updateEmail(newEmail, password) {
    const response = await fetch(`${PROFILE_API_URL}/update-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Important for cookies
      body: JSON.stringify({ email: newEmail, password }),
    });

    return response.json();
  },

  /**
   * Change user's password
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} - Response from the server
   */
  async changePassword(currentPassword, newPassword) {
    const response = await fetch(`${PROFILE_API_URL}/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Important for cookies
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    return response.json();
  },

  /**
   * Regenerate RTMP URL for the user
   * @returns {Promise<Object>} - Response with the new RTMP URL and expiration
   */
  async regenerateRtmpUrl() {
    const response = await fetch(`${PROFILE_API_URL}/regenerate-rtmp-url`, {
      method: "POST",
      credentials: "include", // Important for cookies
    });

    return response.json();
  },

  /**
   * Confirm email change with token
   * @param {string} token - Email change confirmation token
   * @returns {Promise<Object>} - Response from the server
   */
  async confirmEmailChange(token) {
    const response = await fetch(`${PROFILE_API_URL}/confirm-email-update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include", // Important for cookies
      body: JSON.stringify({ token }),
    });

    return response.json();
  },

  /**
   * Get user's stream information
   * @returns {Promise<Object>} - Response with the user's stream information
   */
  async getUserStreamInfo() {
    const response = await fetch(
      `${config.app.apiUrl}/v1/ome/streams/my-stream`,
      {
        method: "GET",
        credentials: "include", // Important for cookies
      }
    );

    return response.json();
  },

  /**
   * Terminate a stream
   * @param {string} streamId - The ID of the stream to terminate
   * @returns {Promise<Object>} - Response from the server
   */
  async terminateStream(streamId) {
    const response = await fetch(
      `${config.app.apiUrl}/v1/ome/streams/${streamId}/terminate`,
      {
        method: "POST",
        credentials: "include", // Important for cookies
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return response.json();
  },
};

export default authService;
