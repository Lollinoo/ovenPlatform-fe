import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { forgotPasswordSchema } from "../utils/validationSchema";
import "../styles/Auth.css";

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState({ type: "", text: "" });
  const { forgotPassword, loading } = useAuth();

  // Validate email in real-time
  const validateEmail = (email) => {
    try {
      const result = forgotPasswordSchema.shape.email.safeParse(email);
      return result.success;
    } catch (error) {
      return false;
    }
  };

  // Handle email change with real-time validation
  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    
    try {
      forgotPasswordSchema.shape.email.parse(value);
      // Remove the error if validation passes
      if (errors.email) {
        setErrors({...errors, email: undefined});
      }
    } catch (error) {
      if (value) { // Only set error if field is not empty
        setErrors({
          ...errors,
          email: error.errors[0]?.message || 'Invalid email'
        });
      } else {
        // Clear error if field is empty
        setErrors({...errors, email: undefined});
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });
    setErrors({});

    try {
      // Validate email using Zod
      forgotPasswordSchema.parse({ email });
    } catch (error) {
      const formattedErrors = {};
      error.errors.forEach((err) => {
        formattedErrors[err.path[0]] = err.message;
      });
      setErrors(formattedErrors);
      return;
    }

    try {
      const result = await forgotPassword(email);

      if (result.success) {
        setMessage({
          type: "success",
          text: "Password reset instructions have been sent to your email.",
        });
        setEmail(""); // Clear the form
      } else {
        setMessage({
          type: "error",
          text:
            result.message ||
            "Failed to request password reset. Please try again.",
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "An unexpected error occurred. Please try again.",
      });
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-header">
        <h1>Reset Password</h1>
        <p>Enter your email to receive password reset instructions</p>
      </div>

      {message.text && (
        <div className={`auth-message ${message.type}`}>{message.text}</div>
      )}

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={handleEmailChange}
            className={errors.email ? "error" : email && validateEmail(email) ? "valid" : ""}
            autoComplete="email"
            placeholder="Enter your registered email"
          />
          {errors.email && <div className="error-message">{errors.email}</div>}
          {email && !errors.email && validateEmail(email) && (
            <div className="error-message success">Email is valid</div>
          )}
        </div>

        <button type="submit" className="auth-btn" disabled={loading}>
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
      </form>

      <div className="auth-alt-action">
        <Link to="/login">Back to Login</Link>
      </div>
    </div>
  );
}

export default ForgotPasswordPage;
