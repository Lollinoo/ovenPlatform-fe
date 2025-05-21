import { useState, useEffect } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { resetPasswordSchema } from "../utils/validationSchema";
import "../styles/Auth.css";

function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState({ type: "", text: "" });
  const [validToken, setValidToken] = useState(true);
  const { token } = useParams();
  const { resetPassword, loading } = useAuth();
  const navigate = useNavigate();

  // Password validation state
  const [validation, setValidation] = useState({
    minLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecial: false,
    isValid: false,
    passwordsMatch: false,
  });

  // Validate password in real-time
  useEffect(() => {
    validatePassword(password, confirmPassword);
  }, [password, confirmPassword]);

  useEffect(() => {
    // Basic token validation (can be extended)
    if (!token || token.length < 10) {
      setValidToken(false);
      setMessage({
        type: "error",
        text: "Invalid or expired reset token. Please request a new password reset link.",
      });
    }
  }, [token]);

  const validatePassword = (password, confirmPassword) => {
    // Check for minimum length (8 characters)
    const hasMinLength = password.length >= 8;

    // Check for uppercase letter
    const hasUppercase = /[A-Z]/.test(password);

    // Check for lowercase letter
    const hasLowercase = /[a-z]/.test(password);

    // Check for number
    const hasNumber = /\d/.test(password);

    // Check for special character
    const hasSpecial = /[!@#$%&]/.test(password);

    // Check if passwords match
    const passwordsMatch = password === confirmPassword && password !== "";

    // Overall password validity
    const isValid =
      hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;

    setValidation({
      minLength: hasMinLength,
      hasUppercase: hasUppercase,
      hasLowercase: hasLowercase,
      hasNumber: hasNumber,
      hasSpecial: hasSpecial,
      isValid: isValid,
      passwordsMatch: passwordsMatch,
    });

    return isValid;
  };

  // Handle password change with real-time validation
  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);

    try {
      resetPasswordSchema.shape.password.parse(value);
      // Remove the error if validation passes
      if (errors.password) {
        setErrors({ ...errors, password: undefined });
      }
    } catch (error) {
      if (value) {
        // Only set error if field is not empty
        setErrors({
          ...errors,
          password: error.errors[0]?.message || "Invalid password",
        });
      } else {
        // Clear error if field is empty
        setErrors({ ...errors, password: undefined });
      }
    }
  };

  // Handle confirm password change with real-time validation
  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value;
    setConfirmPassword(value);

    try {
      if (password && value !== password) {
        throw new Error("Passwords do not match");
      }

      // Remove the error if validation passes
      if (errors.confirmPassword) {
        setErrors({ ...errors, confirmPassword: undefined });
      }
    } catch (error) {
      if (value) {
        // Only set error if field is not empty
        setErrors({
          ...errors,
          confirmPassword: error.message || "Passwords do not match",
        });
      } else {
        // Clear error if field is empty
        setErrors({ ...errors, confirmPassword: undefined });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });
    setErrors({});

    try {
      // Validate form using Zod
      resetPasswordSchema.parse({ password, confirmPassword });
    } catch (error) {
      const formattedErrors = {};
      error.errors.forEach((err) => {
        formattedErrors[err.path[0]] = err.message;
      });
      setErrors(formattedErrors);
      return;
    }

    try {
      const result = await resetPassword(token, password);

      if (result.success) {
        setMessage({
          type: "success",
          text: "Your password has been reset successfully! Redirecting to login...",
        });

        // Redirect to login after a delay
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      } else {
        setMessage({
          type: "error",
          text: result.message || "Failed to reset password. Please try again.",
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "An unexpected error occurred. Please try again.",
      });
    }
  };

  if (!validToken) {
    return (
      <div className="auth-container">
        <div className="auth-header">
          <h1>Invalid Token</h1>
        </div>
        <div className="auth-message error">{message.text}</div>
        <div className="auth-alt-action">
          <Link to="/forgot-password">Request a new password reset</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-header">
        <h1>Create New Password</h1>
        <p>Enter a new password for your account</p>
      </div>

      {message.text && (
        <div className={`auth-message ${message.type}`}>{message.text}</div>
      )}

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="password">New Password</label>
          <div className="input-wrapper">
            <input
              type="password"
              id="password"
              value={password}
              onChange={handlePasswordChange}
              className={
                errors.password
                  ? "error"
                  : password && validation.isValid
                  ? "valid"
                  : ""
              }
              autoComplete="new-password"
              placeholder="Enter your new password"
            />
            {password && validation.isValid && !errors.password && (
              <span className="validation-indicator">✓</span>
            )}
          </div>
          {errors.password && (
            <div className="error-message">{errors.password}</div>
          )}
          {password && validation.isValid && !errors.password && (
            <div className="error-message success">Password valid</div>
          )}

          <div className="password-requirements">
            <small>Password requirements:</small>
            <ul>
              <li className={validation.minLength ? "valid" : "invalid"}>
                <span className="validation-icon">
                  {validation.minLength ? "✓" : "✗"}
                </span>
                Minimum 8 characters
              </li>
              <li className={validation.hasUppercase ? "valid" : "invalid"}>
                <span className="validation-icon">
                  {validation.hasUppercase ? "✓" : "✗"}
                </span>
                One uppercase letter
              </li>
              <li className={validation.hasLowercase ? "valid" : "invalid"}>
                <span className="validation-icon">
                  {validation.hasLowercase ? "✓" : "✗"}
                </span>
                One lowercase letter
              </li>
              <li className={validation.hasNumber ? "valid" : "invalid"}>
                <span className="validation-icon">
                  {validation.hasNumber ? "✓" : "✗"}
                </span>
                One number
              </li>
              <li className={validation.hasSpecial ? "valid" : "invalid"}>
                <span className="validation-icon">
                  {validation.hasSpecial ? "✓" : "✗"}
                </span>
                One special character
              </li>
            </ul>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <div className="input-wrapper">
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              className={
                errors.confirmPassword
                  ? "error"
                  : confirmPassword && validation.passwordsMatch
                  ? "valid"
                  : ""
              }
              autoComplete="new-password"
              placeholder="Confirm your new password"
            />
            {confirmPassword &&
              validation.passwordsMatch &&
              !errors.confirmPassword && (
                <span className="validation-indicator">✓</span>
              )}
          </div>
          {confirmPassword &&
            validation.passwordsMatch &&
            !errors.confirmPassword && (
              <div className="error-message success">Passwords match</div>
            )}
          {confirmPassword &&
            !validation.passwordsMatch &&
            !errors.confirmPassword && (
              <div className="error-message">Passwords don't match</div>
            )}
          {errors.confirmPassword && (
            <div className="error-message">{errors.confirmPassword}</div>
          )}
        </div>

        <button
          type="submit"
          className="auth-btn"
          disabled={
            loading || !validation.isValid || !validation.passwordsMatch
          }
        >
          {loading ? "Resetting Password..." : "Reset Password"}
        </button>
      </form>

      <div className="auth-alt-action">
        <Link to="/login">Back to Login</Link>
      </div>
    </div>
  );
}

export default ResetPasswordPage;
