import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "../styles/Auth.css";

function EmailVerificationPage() {
  const [message, setMessage] = useState({
    type: "",
    text: "Verifying your email...",
  });
  const { token } = useParams();
  const { verifyEmail, loading } = useAuth();
  const navigate = useNavigate();

  // Use a ref to track if verification has been attempted
  const [verificationAttempted, setVerificationAttempted] = useState(false);

  useEffect(() => {
    // Only verify once
    if (!token || verificationAttempted) {
      if (!token) {
        setMessage({
          type: "error",
          text: "Invalid verification token. Please check your email for the correct link.",
        });
      }
      return;
    }

    const verifyUserEmail = async () => {
      try {
        setVerificationAttempted(true); // Mark verification as attempted
        const result = await verifyEmail(token);

        if (result.success) {
          setMessage({
            type: "success",
            text: "Your email has been verified successfully! You can now log in to your account.",
          });

          // Redirect to login after a delay
          setTimeout(() => {
            navigate("/login");
          }, 5000);
        } else {
          setMessage({
            type: "error",
            text:
              result.message ||
              "Failed to verify email. The link may have expired.",
          });
        }
      } catch (error) {
        setMessage({
          type: "error",
          text: "An unexpected error occurred. Please try again.",
        });
      }
    };

    verifyUserEmail();
  }, [token, verifyEmail, navigate, verificationAttempted]);

  return (
    <div className="auth-container">
      <div className="auth-header">
        <h1>Email Verification</h1>
      </div>

      <div className={`auth-message ${message.type || "info"}`}>
        {message.text}
      </div>

      {message.type === "error" && (
        <div className="auth-alt-action">
          <Link to="/login">Return to Login</Link>
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

export default EmailVerificationPage;
