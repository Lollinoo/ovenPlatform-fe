import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import authService from "../utils/authService";
import { fetchUserStreamInfo } from "../utils/streamInfoService";
import StreamDuration from "./StreamDuration";
import "../styles/ProfilePage.css";

function ProfilePage() {
  const { currentUser, login } = useAuth();
  const [activeTab, setActiveTab] = useState("general");

  // General info state
  const [username, setUsername] = useState("");
  const [usernamePassword, setUsernamePassword] = useState("");
  const [email, setEmail] = useState("");

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // RTMP URL state
  const [rtmpUrl, setRtmpUrl] = useState("");
  const [rtmpUrlExpiry, setRtmpUrlExpiry] = useState(null);

  // Stream state
  const [streamInfo, setStreamInfo] = useState(null);
  const [isStreamActive, setIsStreamActive] = useState(false);
  const [streamStartTime, setStreamStartTime] = useState(null);
  const [streamLoading, setStreamLoading] = useState(false);
  const streamTimerRef = useRef(null);
  const fetchInProgress = useRef(false);

  // Tracking change limits
  const [usernameNextAllowedDate, setUsernameNextAllowedDate] = useState(null);
  const [rtmpNextAllowedDate, setRtmpNextAllowedDate] = useState(null);
  const [isUsernameChangeAllowed, setIsUsernameChangeAllowed] = useState(true);
  const [isRtmpChangeAllowed, setIsRtmpChangeAllowed] = useState(true);

  // Status messages
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Function to check if enough time has passed since last change
  const isChangeAllowed = (lastChangeDate) => {
    if (!lastChangeDate) return true;

    const now = new Date();
    const lastChange = new Date(lastChangeDate);
    const timeDiff = now.getTime() - lastChange.getTime();
    const daysDiff = timeDiff / (1000 * 3600 * 24);

    // Limit to one change per 30 days
    return daysDiff >= 30;
  };

  // Function to format date in a user-friendly way
  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Load user data
  useEffect(() => {
    if (currentUser) {
      setUsername(currentUser.username || "");
      setEmail(currentUser.email || "");

      if (currentUser.rtmpUrl) {
        setRtmpUrl(currentUser.rtmpUrl);
      } else {
        setRtmpUrl("");
      }

      if (currentUser.rtmpUrlExpiresAt) {
        const expiryDate = new Date(currentUser.rtmpUrlExpiresAt);
        setRtmpUrlExpiry(expiryDate);
      }

      // Check username change availability
      if (currentUser.lastUsernameChangeAt) {
        const lastChange = new Date(currentUser.lastUsernameChangeAt);
        const nextAllowedDate = new Date(lastChange);
        nextAllowedDate.setDate(nextAllowedDate.getDate() + 30);

        setUsernameNextAllowedDate(nextAllowedDate);
        setIsUsernameChangeAllowed(
          isChangeAllowed(currentUser.lastUsernameChangeAt)
        );
      }

      // Check RTMP regeneration availability
      if (currentUser.lastRtmpRegeneratedAt) {
        const lastChange = new Date(currentUser.lastRtmpRegeneratedAt);
        const nextAllowedDate = new Date(lastChange);
        nextAllowedDate.setDate(nextAllowedDate.getDate() + 30);

        setRtmpNextAllowedDate(nextAllowedDate);
        setIsRtmpChangeAllowed(
          isChangeAllowed(currentUser.lastRtmpRegeneratedAt)
        );
      }
    }
  }, [currentUser]);

  // Function to fetch stream information
  const fetchStreamInfo = useCallback(async () => {
    if (fetchInProgress.current) return;

    if (activeTab !== "stream" && streamInfo !== null) return;

    try {
      fetchInProgress.current = true;
      setStreamLoading(true);
      const response = await fetchUserStreamInfo();
      if (response.success) {
        setStreamInfo(response.data);
        setIsStreamActive(response.data?.isActive || false);

        if (response.data?.lastStreamStartedAt) {
          setStreamStartTime(new Date(response.data.lastStreamStartedAt));
        }
      }
    } catch (error) {
      console.error("Error fetching stream info:", error);
    } finally {
      setStreamLoading(false);
      fetchInProgress.current = false;
    }
  }, [activeTab, streamInfo]);

  // Set up periodic refresh of stream status
  useEffect(() => {
    // Cleanup any existing interval
    if (streamTimerRef.current) {
      clearInterval(streamTimerRef.current);
      streamTimerRef.current = null;
    }

    // Initial fetch only when needed
    if (currentUser && (activeTab === "stream" || streamInfo === null)) {
      fetchStreamInfo();
    }

    // Set up interval for refreshing stream status only when actively viewing stream tab
    // or when stream is active (to keep status updated)
    if (currentUser && (activeTab === "stream" || isStreamActive)) {
      streamTimerRef.current = setInterval(() => {
        fetchStreamInfo();
      }, 30000); // Refresh every 30 seconds
    }

    return () => {
      if (streamTimerRef.current) {
        clearInterval(streamTimerRef.current);
        streamTimerRef.current = null;
      }
    };
  }, [activeTab, currentUser, fetchStreamInfo, isStreamActive, streamInfo]);

  // Add page visibility tracking to avoid unnecessary API calls when page is not visible
  useEffect(() => {
    // Skip if not in stream tab or if no stream is active
    if (!currentUser || (activeTab !== "stream" && !isStreamActive)) {
      return;
    }

    // Handler for page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden, clear interval to save resources
        if (streamTimerRef.current) {
          clearInterval(streamTimerRef.current);
          streamTimerRef.current = null;
        }
      } else {
        // Page is visible again, fetch latest data and restart interval if needed
        fetchStreamInfo();

        if (
          !streamTimerRef.current &&
          (activeTab === "stream" || isStreamActive)
        ) {
          streamTimerRef.current = setInterval(() => {
            fetchStreamInfo();
          }, 30000);
        }
      }
    };

    // Add visibility change listener
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeTab, currentUser, fetchStreamInfo, isStreamActive]);

  // Function to terminate active stream
  const handleTerminateStream = async () => {
    if (!streamInfo || !isStreamActive) return;

    setStreamLoading(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const response = await authService.terminateStream(
        streamInfo.streamSessionId
      );

      if (response.success) {
        setSuccessMessage("Stream terminated successfully!");
        setIsStreamActive(false);
        setStreamInfo({
          ...streamInfo,
          isActive: false,
          streamSessionId: null,
        });
      } else {
        setErrorMessage(response.message || "Failed to terminate stream");
      }
    } catch (error) {
      setErrorMessage("An error occurred while terminating the stream");
      console.error("Error terminating stream:", error);
    } finally {
      setStreamLoading(false);
    }
  };

  // Format stream duration
  const formatDuration = (startTime) => {
    if (!startTime) return "N/A";

    const now = new Date();
    const start = new Date(startTime);
    const diff = now - start;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    // Reset messages when changing tabs
    setSuccessMessage("");
    setErrorMessage("");
  };

  const handleUsernameUpdate = async (e) => {
    e.preventDefault();
    // Prevents multiple requests while one is in progress
    if (isLoading) return;

    setIsLoading(true);
    setSuccessMessage("");
    setErrorMessage("");

    if (!isUsernameChangeAllowed) {
      setErrorMessage(
        `Username can only be changed once every 30 days. Next change allowed on ${formatDate(
          usernameNextAllowedDate
        )}`
      );
      setIsLoading(false);
      return;
    }

    if (!usernamePassword) {
      setErrorMessage("Password is required to verify your identity");
      setIsLoading(false);
      return;
    }

    try {
      const response = await authService.updateUsername(
        username,
        usernamePassword
      );
      if (response.success) {
        setSuccessMessage(
          "A verification email has been sent to confirm your username change!"
        );
        setUsernamePassword("");
      } else {
        if (response.nextAllowedDate) {
          setUsernameNextAllowedDate(new Date(response.nextAllowedDate));
          setIsUsernameChangeAllowed(false);
          setErrorMessage(
            `${response.message}. Next change allowed on ${formatDate(
              response.nextAllowedDate
            )}`
          );
        } else {
          setErrorMessage(response.message || "Failed to update username");
        }
      }
    } catch (error) {
      setErrorMessage("An error occurred. Please try again.");
      console.error("Error updating username:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailUpdate = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const response = await authService.updateEmail(email, currentPassword);
      if (response.success) {
        setSuccessMessage(
          "Email update request sent! Please check your new email for verification."
        );
      } else {
        setErrorMessage(response.message || "Failed to update email");
      }
    } catch (error) {
      setErrorMessage("An error occurred. Please try again.");
      console.error("Error updating email:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setSuccessMessage("");
    setErrorMessage("");

    if (newPassword !== confirmPassword) {
      setErrorMessage("New passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const response = await authService.changePassword(
        currentPassword,
        newPassword
      );
      if (response.success) {
        setSuccessMessage("Password changed successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setErrorMessage(response.message || "Failed to change password");
      }
    } catch (error) {
      setErrorMessage("An error occurred. Please try again.");
      console.error("Error changing password:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerateRtmpUrl = async () => {
    setIsLoading(true);
    setSuccessMessage("");
    setErrorMessage("");

    if (!isRtmpChangeAllowed) {
      setErrorMessage(
        `RTMP URL can only be regenerated once every 30 days. Next regeneration allowed on ${formatDate(
          rtmpNextAllowedDate
        )}`
      );
      setIsLoading(false);
      return;
    }

    try {
      const response = await authService.regenerateRtmpUrl();
      if (response.success) {
        setRtmpUrl(response.rtmpUrl);
        setRtmpUrlExpiry(new Date(response.rtmpUrlExpiresAt));
        setSuccessMessage("RTMP URL regenerated successfully!");

        // Update limitations
        if (response.nextAllowedDate) {
          const nextDate = new Date(response.nextAllowedDate);
          setRtmpNextAllowedDate(nextDate);
          setIsRtmpChangeAllowed(false);
        }
      } else {
        if (response.nextAllowedDate) {
          setRtmpNextAllowedDate(new Date(response.nextAllowedDate));
          setIsRtmpChangeAllowed(false);
          setErrorMessage(
            `${response.message}. Next regeneration allowed on ${formatDate(
              response.nextAllowedDate
            )}`
          );
        } else {
          setErrorMessage(response.message || "Failed to regenerate RTMP URL");
        }
      }
    } catch (error) {
      setErrorMessage("An error occurred. Please try again.");
      console.error("Error regenerating RTMP URL:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setSuccessMessage("Copied to clipboard!");
        setTimeout(() => setSuccessMessage(""), 2000);
      })
      .catch((err) => {
        setErrorMessage("Failed to copy. Please try again.");
        console.error("Error copying to clipboard:", err);
      });
  };

  const formatExpiryDate = (date) => {
    if (!date) return "N/A";

    return new Date(date).toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="profile-container">
      <h1>User Profile</h1>

      <div className="profile-tabs">
        <button
          className={`tab-button ${activeTab === "general" ? "active" : ""}`}
          onClick={() => handleTabChange("general")}
        >
          General Info
        </button>
        <button
          className={`tab-button ${activeTab === "password" ? "active" : ""}`}
          onClick={() => handleTabChange("password")}
        >
          Change Password
        </button>
        <button
          className={`tab-button ${activeTab === "rtmp" ? "active" : ""}`}
          onClick={() => handleTabChange("rtmp")}
        >
          RTMP Settings
        </button>
        <button
          className={`tab-button ${activeTab === "stream" ? "active" : ""}`}
          onClick={() => handleTabChange("stream")}
        >
          Stream Status
        </button>
      </div>

      {successMessage && (
        <div className="message success-message">{successMessage}</div>
      )}

      {errorMessage && (
        <div className="message error-message">{errorMessage}</div>
      )}

      <div className="profile-content">
        {/* General Info Tab */}
        {activeTab === "general" && (
          <div className="tab-content">
            <h2>User Information</h2>

            <form onSubmit={handleUsernameUpdate} className="profile-form">
              <div className="form-group">
                <label htmlFor="username">Username</label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="username-password">
                  Password (for verification)
                </label>
                <input
                  type="password"
                  id="username-password"
                  value={usernamePassword}
                  onChange={(e) => setUsernamePassword(e.target.value)}
                  required
                />
              </div>
              <div className="info-message">
                <small>
                  <strong>Note:</strong> Changing your username will also
                  regenerate your RTMP streaming URL.
                </small>
              </div>
              {!isUsernameChangeAllowed && (
                <div className="restriction-message">
                  <small>
                    Username can only be changed once every 30 days.
                    <br />
                    Next change allowed on:{" "}
                    {formatDate(usernameNextAllowedDate)}
                  </small>
                </div>
              )}
              <button
                type="submit"
                className="btn primary-btn"
                disabled={isLoading || !isUsernameChangeAllowed}
              >
                {isLoading ? "Updating..." : "Update Username"}
              </button>
            </form>

            <form onSubmit={handleEmailUpdate} className="profile-form">
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="current-password-email">
                  Current Password (to verify)
                </label>
                <input
                  type="password"
                  id="current-password-email"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                className="btn primary-btn"
                disabled={isLoading}
              >
                {isLoading ? "Updating..." : "Update Email"}
              </button>
            </form>
          </div>
        )}

        {/* Password Change Tab */}
        {activeTab === "password" && (
          <div className="tab-content">
            <h2>Change Password</h2>

            <form onSubmit={handlePasswordChange} className="profile-form">
              <div className="form-group">
                <label htmlFor="current-password">Current Password</label>
                <input
                  type="password"
                  id="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="new-password">New Password</label>
                <input
                  type="password"
                  id="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength="8"
                />
              </div>
              <div className="form-group">
                <label htmlFor="confirm-password">Confirm New Password</label>
                <input
                  type="password"
                  id="confirm-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength="8"
                />
              </div>
              <div className="password-requirements">
                <small>
                  Password must be at least 8 characters long and include
                  uppercase, lowercase, number and special character (!@#$%&)
                </small>
              </div>
              <button
                type="submit"
                className="btn primary-btn"
                disabled={isLoading}
              >
                {isLoading ? "Changing..." : "Change Password"}
              </button>
            </form>
          </div>
        )}

        {/* RTMP Settings Tab */}
        {activeTab === "rtmp" && (
          <div className="tab-content">
            <h2>RTMP Streaming Settings</h2>

            <div className="rtmp-info">
              <div className="form-group">
                <label>Your RTMP URL</label>
                <div className="rtmp-url-container">
                  <input
                    type="text"
                    value={
                      rtmpUrl ||
                      "Generating RTMP URL... Please wait or refresh the page."
                    }
                    readOnly
                  />
                  {rtmpUrl && (
                    <button
                      className="copy-btn"
                      onClick={() => copyToClipboard(rtmpUrl)}
                      type="button"
                    >
                      Copy
                    </button>
                  )}
                </div>
              </div>

              <div className="rtmp-expiry">
                <p>
                  <strong>Expires At: </strong>
                  {formatExpiryDate(rtmpUrlExpiry)}
                </p>
              </div>

              {isStreamActive && (
                <div className="stream-active-warning">
                  <p>
                    <strong>Warning:</strong> You have an active stream.
                    Regenerating your RTMP URL will terminate your current
                    stream.
                  </p>
                </div>
              )}

              {!isRtmpChangeAllowed && (
                <div className="restriction-message">
                  <small>
                    RTMP URL can only be regenerated once every 30 days.
                    <br />
                    Next regeneration allowed on:{" "}
                    {formatDate(rtmpNextAllowedDate)}
                  </small>
                </div>
              )}
              <button
                onClick={handleRegenerateRtmpUrl}
                className="btn primary-btn"
                disabled={isLoading || !isRtmpChangeAllowed || isStreamActive}
              >
                {isLoading ? "Regenerating..." : "Regenerate RTMP URL"}
              </button>

              <div className="rtmp-help">
                <h3>How to use:</h3>
                <ol>
                  <li>Copy your unique RTMP URL.</li>
                  <li>Open your streaming software (OBS, Streamlabs, etc.)</li>
                  <li>Paste the URL in the "Server" or "RTMP URL" field.</li>
                  <li>Start streaming!</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* Stream Status Tab */}
        {activeTab === "stream" && (
          <div className="tab-content">
            <h2>Stream Status</h2>

            {streamLoading ? (
              <div className="loading-spinner">Loading stream data...</div>
            ) : (
              <div className="stream-info">
                <div className="stream-status-container">
                  <div
                    className={`stream-status ${
                      isStreamActive ? "active" : "inactive"
                    }`}
                  >
                    <span className="status-indicator"></span>
                    <span className="status-text">
                      {isStreamActive ? "LIVE" : "Offline"}
                    </span>
                  </div>
                </div>

                {isStreamActive && streamInfo && (
                  <>
                    <div className="stream-details">
                      <div className="detail-item">
                        <strong>Stream Started:</strong>{" "}
                        {formatDate(streamStartTime)}
                      </div>
                      <div className="detail-item">
                        <strong>Duration:</strong>{" "}
                        <StreamDuration startTime={streamStartTime} />
                      </div>
                      <div className="detail-item">
                        <strong>Stream ID:</strong> {streamInfo.streamSessionId}
                      </div>
                    </div>

                    <div className="stream-controls">
                      <button
                        onClick={handleTerminateStream}
                        className="btn danger-btn"
                        disabled={streamLoading}
                      >
                        {streamLoading ? "Terminating..." : "Terminate Stream"}
                      </button>
                    </div>
                  </>
                )}

                {!isStreamActive && (
                  <div className="no-stream-message">
                    <p>You don't have any active streams at the moment.</p>
                    <p>
                      To start streaming, use your RTMP URL in your streaming
                      software.
                    </p>
                    <button
                      onClick={() => handleTabChange("rtmp")}
                      className="btn secondary-btn"
                    >
                      View RTMP Settings
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfilePage;
