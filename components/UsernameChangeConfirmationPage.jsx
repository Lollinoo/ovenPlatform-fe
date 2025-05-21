import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "../styles/Auth.css";

function UsernameChangeConfirmationPage() {
  const [message, setMessage] = useState({
    type: "",
    text: "Confirming your username change...",
  });
  const { token } = useParams();
  const { confirmUsernameChange, loading } = useAuth();
  const navigate = useNavigate();

  // Use a ref to track if verification has been attempted
  const [verificationAttempted, setVerificationAttempted] = useState(false);

  useEffect(() => {
    // Only verify once
    if (!token || verificationAttempted) {
      if (!token) {
        setMessage({
          type: "error",
          text: "Invalid token. Please check your email for the correct link.",
        });
      }
      return;
    }

    const verifyUsernameChange = async () => {
      try {
        setVerificationAttempted(true); // Mark verification as attempted
        const result = await confirmUsernameChange(token);

        if (result.success) {
          setMessage({
            type: "success",
            text: "Your username has been updated successfully! Your RTMP streaming URL has also been regenerated.",
          });

          // Redirect to profile after a delay
          setTimeout(() => {
            navigate("/profile");
          }, 3000);
        } else {
          setMessage({
            type: "error",
            text:
              result.message ||
              "Failed to confirm username change. The link may have expired.",
          });
        }
      } catch (error) {
        setMessage({
          type: "error",
          text: "An unexpected error occurred. Please try again.",
        });
      }
    };

    verifyUsernameChange();
  }, [token, confirmUsernameChange, navigate, verificationAttempted]);

  return (
    <div className="auth-container">
      <div className="auth-header">
        <h1>Username Change Confirmation</h1>
      </div>

      <div className={`auth-message ${message.type || "info"}`}>
        {message.text}
      </div>

      {message.type === "error" && (
        <div className="auth-alt-action">
          <Link to="/profile">Return to Profile</Link>
        </div>
      )}

      {loading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
        </div>
      )}
    </div>
  );
}

export default UsernameChangeConfirmationPage;
