// Navigation bar component for the application
// Provides responsive navigation with mobile menu support
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import "../styles/theme.css";
import "../styles/Navbar.css";
import config from "../utils/envConfig";
import packageJson from "../package.json";

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { currentUser, logout, isAuthenticated } = useAuth();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleLogout = async () => {
    await logout();
    setIsOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo">
          <Link to="/">OvenPlatform</Link>
          <div className="version-badge">
            v{packageJson.version}
            <span className={config.app.isProduction ? "env-prod" : "env-dev"}>
              {config.app.isProduction ? "PROD" : "DEV"}
            </span>
          </div>
        </div>

        <div className="navbar-toggle" onClick={toggleMenu}>
          <span className={`toggle-icon ${isOpen ? "open" : ""}`}></span>
        </div>

        <ul className={`navbar-menu ${isOpen ? "active" : ""}`}>
          {isAuthenticated && (
            <li className="navbar-item">
              <Link
                to="/streams"
                className="navbar-link"
                onClick={() => setIsOpen(false)}
              >
                Streams
              </Link>
            </li>
          )}

          {!isAuthenticated ? (
            <>
              <li className="navbar-item">
                <Link
                  to="/login"
                  className="navbar-link"
                  onClick={() => setIsOpen(false)}
                >
                  Login
                </Link>
              </li>
              <li className="navbar-item">
                <Link
                  to="/register"
                  className="navbar-link"
                  onClick={() => setIsOpen(false)}
                >
                  Sign Up
                </Link>
              </li>
            </>
          ) : (
            <>
              <li className="navbar-item">
                <span className="navbar-user">
                  {currentUser?.username || currentUser?.email || "User"}
                </span>
              </li>
              <li className="navbar-item">
                <Link
                  to="/profile"
                  className="navbar-link"
                  onClick={() => setIsOpen(false)}
                >
                  Profile
                </Link>
              </li>
              <li className="navbar-item">
                <button className="navbar-logout" onClick={handleLogout}>
                  Logout
                </button>
              </li>
            </>
          )}
        </ul>
      </div>
    </nav>
  );
}

export default Navbar;
