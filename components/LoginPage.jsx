import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { loginSchema } from "../utils/validationSchema";
import "../styles/Auth.css";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState({ type: "", text: "" });
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  // Validate email in real-time
  const validateEmail = (email) => {
    try {
      const result = loginSchema.shape.email.safeParse(email);
      return result.success;
    } catch (error) {
      return false;
    }
  };

  // Validate password in real-time
  const validatePassword = (password) => {
    try {
      const result = loginSchema.shape.password.safeParse(password);
      return result.success;
    } catch (error) {
      return false;
    }
  };

  // Handle field changes with real-time validation
  const handleEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);

    try {
      loginSchema.parse({ email: value, password: "dummyPassword123!" });
      // Remove the error if validation passes
      if (errors.email) {
        setErrors({ ...errors, email: undefined });
      }
    } catch (error) {
      if (value) {
        // Only set error if field is not empty
        // Safely handle error structure which may vary
        const zodError = error;
        let errorMessage = "Invalid email";

        if (zodError.errors) {
          const emailError = zodError.errors.find((e) => e.path[0] === "email");
          if (emailError) {
            errorMessage = emailError.message;
          }
        }

        setErrors({
          ...errors,
          email: errorMessage,
        });
      } else {
        // Clear error if field is empty
        setErrors({ ...errors, email: undefined });
      }
    }
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);

    try {
      loginSchema.shape.password.parse(value);
      // Remove the error if validation passes
      if (errors.password) {
        setErrors({ ...errors, password: undefined });
      }
    } catch (error) {
      if (value) {
        // Only set error if field is not empty
        // Safely handle error structure which may vary
        const errorMessage =
          error.errors && error.errors[0]?.message
            ? error.errors[0].message
            : error.message || "Password is required";

        setErrors({
          ...errors,
          password: errorMessage,
        });
      } else {
        // Clear error if field is empty
        setErrors({ ...errors, password: undefined });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: "", text: "" });
    setErrors({});

    try {
      // Validate form using Zod
      loginSchema.parse({ email, password });
    } catch (error) {
      // Safely handle Zod validation errors
      const formattedErrors = {};
      if (error.errors && Array.isArray(error.errors)) {
        error.errors.forEach((err) => {
          if (err.path && err.path.length > 0) {
            formattedErrors[err.path[0]] = err.message;
          }
        });
      } else if (error.message) {
        // If it's not a Zod format error, use the general message
        formattedErrors.general = error.message;
      }
      setErrors(formattedErrors);
      return;
    }

    try {
      const result = await login(email, password);

      if (result.success) {
        navigate("/streams");
      } else {
        setMessage({
          type: "error",
          text: result.message || "Failed to login. Please try again.",
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
        <h1>Welcome Back</h1>
        <p>Log in to your OvenPlatform account</p>
      </div>

      {message.text && (
        <div className={`auth-message ${message.type}`}>{message.text}</div>
      )}

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <div className="input-wrapper">
            <input
              type="email"
              id="email"
              value={email}
              onChange={handleEmailChange}
              className={
                errors.email
                  ? "error"
                  : email && validateEmail(email)
                  ? "valid"
                  : ""
              }
              autoComplete="email"
              placeholder="Enter your email address"
            />
            {email && validateEmail(email)}
          </div>
          {/* {errors.email && <div className="error-message">{errors.email}</div>}
          {email && validateEmail(email) && !errors.email && (
            <div className="error-message success">Valid email format</div>
          )} */}
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <div className="input-wrapper">
            <input
              type="password"
              id="password"
              value={password}
              onChange={handlePasswordChange}
              className={
                errors.password
                  ? "error"
                  : password && validatePassword(password)
                  ? ""
                  : ""
              }
              autoComplete="current-password"
              placeholder="Enter your password"
            />
            {/* {password && validatePassword(password) && (
              <div className="validation-indicator">✓</div>
            )} */}
          </div>
          {/* {errors.password && (
            <div className="error-message">{errors.password}</div>
          )} */}
          {/* {password && validatePassword(password) && !errors.password && (
            <div className="error-message success">Password accepted</div>
          )} */}
        </div>

        <Link to="/forgot-password" className="auth-alt-action">
          Forgot your password?
        </Link>

        <button type="submit" className="auth-btn" disabled={loading}>
          {loading ? "Logging in..." : "Log In"}
        </button>
      </form>

      <div className="auth-alt-action">
        Don't have an account? <Link to="/register">Sign up</Link>
      </div>
    </div>
  );
}

export default LoginPage;
