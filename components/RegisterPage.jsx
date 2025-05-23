import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { registerSchema } from "../utils/validationSchema";
import "../styles/Auth.css";

function RegisterPage() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [validFields, setValidFields] = useState({});
  const [message, setMessage] = useState({ type: "", text: "" });
  const { register, loading } = useAuth();
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

  // Validate the entire form or specific fields
  const validateField = (field, value) => {
    // Create temporary form data with current values plus the new value
    const dataToValidate = { ...formData, [field]: value };

    // Use safeParse to get detailed validation results
    const result = registerSchema.safeParse(dataToValidate);

    // Update validFields state
    setValidFields((prev) => ({
      ...prev,
      [field]:
        result.success ||
        !result.error?.issues.some((issue) => issue.path[0] === field),
    }));

    // If not successful, extract the error for this field
    if (!result.success) {
      const fieldError = result.error.issues.find(
        (issue) => issue.path[0] === field
      );

      // Update errors state
      if (fieldError && value !== "") {
        setErrors((prev) => ({ ...prev, [field]: fieldError.message }));
      } else {
        // Clear error if field is empty or no error found
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }

      return false;
    } else {
      // Clear error for this field if validation passes
      setErrors((prev) => ({ ...prev, [field]: undefined }));
      return true;
    }
  };

  // Handle field change with unified approach
  const handleFieldChange = (field) => (e) => {
    const value = e.target.value;

    // Update formData
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Validate the field
    validateField(field, value);
  };

  // Handle password change separately to update password requirements
  const handlePasswordChange = (e) => {
    const value = e.target.value;

    // Update formData
    setFormData((prev) => ({ ...prev, password: value }));

    // Update password requirements validation
    const hasMinLength = value.length >= 8;
    const hasUppercase = /[A-Z]/.test(value);
    const hasLowercase = /[a-z]/.test(value);
    const hasNumber = /\d/.test(value);
    const hasSpecial = /[!@#$%&]/.test(value);
    const isValid =
      hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;
    const passwordsMatch = value === formData.confirmPassword && value !== "";

    setValidation({
      minLength: hasMinLength,
      hasUppercase: hasUppercase,
      hasLowercase: hasLowercase,
      hasNumber: hasNumber,
      hasSpecial: hasSpecial,
      isValid: isValid,
      passwordsMatch: passwordsMatch,
    });

    // Validate the field with Zod as well
    validateField("password", value);
  };

  // Handle confirm password change to check matching
  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value;

    // Update formData
    setFormData((prev) => ({ ...prev, confirmPassword: value }));

    // Check password matching
    const passwordsMatch = formData.password === value && value !== "";
    setValidation((prev) => ({ ...prev, passwordsMatch }));

    // Validate the field
    validateField("confirmPassword", value);
  };

  // Validate password requirements anytime password or confirmPassword changes
  useEffect(() => {
    const { password, confirmPassword } = formData;
    const passwordsMatch =
      password === confirmPassword && confirmPassword !== "";

    if (validation.passwordsMatch !== passwordsMatch) {
      setValidation((prev) => ({ ...prev, passwordsMatch }));
    }
  }, [formData.password, formData.confirmPassword]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    // Validate all fields before submission
    const result = registerSchema.safeParse(formData);
    if (!result.success) {
      const newErrors = {};
      result.error.issues.forEach((issue) => {
        newErrors[issue.path[0]] = issue.message;
      });
      setErrors(newErrors);
      return;
    }

    try {
      const { username, email, password } = formData;
      const response = await register(username, email, password);

      if (response.success) {
        setMessage({
          type: "success",
          text: "Registration successful! Please check your email to verify your account.",
        });

        // Redirect to login after a delay
        setTimeout(() => {
          navigate("/login");
        }, 3000);
      } else {
        setMessage({
          type: "error",
          text: response.message || "Registration failed. Please try again.",
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
        <h1>Create Account</h1>
        <p>Sign up for OvenPlatform</p>
      </div>

      {message.text && (
        <div className={`auth-message ${message.type}`}>{message.text}</div>
      )}

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="username">Username</label>
          <div className="input-wrapper">
            <input
              type="text"
              id="username"
              value={formData.username}
              onChange={handleFieldChange("username")}
              className={
                errors.username ? "error" : validFields.username ? "valid" : ""
              }
              autoComplete="username"
              placeholder="3-30 characters, alphanumeric & underscore"
            />
            {formData.username && validFields.username && !errors.username && (
              <span className="validation-indicator">✓</span>
            )}
          </div>
          {/* {errors.username && (
            <div className="error-message">{errors.username}</div>
          )}
          {formData.username && validFields.username && !errors.username && (
            <div className="error-message success">Valid username</div>
          )} */}
        </div>

        <div className="form-group">
          <label htmlFor="email">Email</label>
          <div className="input-wrapper">
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={handleFieldChange("email")}
              className={
                errors.email ? "error" : validFields.email ? "valid" : ""
              }
              autoComplete="email"
              placeholder="Enter your email address"
            />
            {formData.email && validFields.email && !errors.email && (
              <span className="validation-indicator">✓</span>
            )}
          </div>
          {/* {errors.email && <div className="error-message">{errors.email}</div>}
          {formData.email && validFields.email && !errors.email && (
            <div className="error-message success">Valid email format</div>
          )} */}
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <div className="input-wrapper">
            <input
              type="password"
              id="password"
              value={formData.password}
              onChange={handlePasswordChange}
              className={
                errors.password ? "error" : validation.isValid ? "valid" : ""
              }
              autoComplete="new-password"
              placeholder="Enter password (min 8 characters)"
            />
            {formData.password && validation.isValid && !errors.password && (
              <span className="validation-indicator">✓</span>
            )}
          </div>
          {/* {errors.password && (
            <div className="error-message">{errors.password}</div>
          )} */}
          <div className="validation-requirements">
            <p className="validation-title">Password requirements:</p>
            <ul className="validation-list">
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
                One special character (!@#$%&)
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
              value={formData.confirmPassword}
              onChange={handleConfirmPasswordChange}
              className={
                errors.confirmPassword
                  ? "error"
                  : formData.confirmPassword && validation.passwordsMatch
                  ? "valid"
                  : ""
              }
              autoComplete="new-password"
              placeholder="Repeat your password"
            />
            {formData.confirmPassword &&
              validation.passwordsMatch &&
              !errors.confirmPassword && (
                <span className="validation-indicator">✓</span>
              )}
          </div>
          {/* {errors.confirmPassword && (
            <div className="error-message">{errors.confirmPassword}</div>
          )}
          {formData.confirmPassword &&
            !errors.confirmPassword &&
            validation.passwordsMatch && (
              <div className="error-message success">Passwords match</div>
            )}
          {formData.confirmPassword &&
            !errors.confirmPassword &&
            !validation.passwordsMatch && (
              <div className="error-message">Passwords do not match</div>
            )} */}
        </div>

        <button
          type="submit"
          className="auth-btn"
          disabled={
            loading || !validation.isValid || !validation.passwordsMatch
          }
        >
          {loading ? "Creating Account..." : "Sign Up"}
        </button>
      </form>

      <div className="auth-alt-action">
        Already have an account? <Link to="/login">Log in</Link>
      </div>
    </div>
  );
}

export default RegisterPage;
