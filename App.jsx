// Main application component that sets up routing
// Configures the application's navigation structure with conditional routes based on environment
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import HomePage from "./components/HomePage";
import LoginPage from "./components/LoginPage";
import RegisterPage from "./components/RegisterPage";
import ForgotPasswordPage from "./components/ForgotPasswordPage";
import ResetPasswordPage from "./components/ResetPasswordPage";
import EmailVerificationPage from "./components/EmailVerificationPage";
import EmailChangeConfirmationPage from "./components/EmailChangeConfirmationPage";
import UsernameChangeConfirmationPage from "./components/UsernameChangeConfirmationPage";
import StreamsPage from "./components/StreamsPage";
import PlayerPage from "./components/PlayerPage";
import ProfilePage from "./components/ProfilePage";
import EnvDebugger from "./components/EnvDebugger";
import ProtectedRoute from "./components/ProtectedRoute";
import config from "./utils/envConfig";
import "./styles/theme.css";
import "./styles/App.css";

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="app-container">
          <Navbar />
          <div className="content-container">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route
                path="/reset-password/:token"
                element={<ResetPasswordPage />}
              />
              <Route
                path="/verify-email/:token"
                element={<EmailVerificationPage />}
              />
              <Route
                path="/confirm-email-change/:token"
                element={<EmailChangeConfirmationPage />}
              />
              <Route
                path="/confirm-username-change/:token"
                element={<UsernameChangeConfirmationPage />}
              />

              {/* Protected Routes */}
              <Route
                path="/streams"
                element={
                  <ProtectedRoute>
                    <StreamsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/player/:streamName"
                element={
                  <ProtectedRoute>
                    <PlayerPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />

              {/* Debug Routes (Development Only) */}
              {!config.app.isProduction && (
                <>
                  <Route
                    path="/env-debug"
                    element={
                      <ProtectedRoute>
                        <EnvDebugger />
                      </ProtectedRoute>
                    }
                  />
                </>
              )}

              {/* Fallback Route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
          <Footer />
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
