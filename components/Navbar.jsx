// Navigation bar component for the application
// Provides responsive navigation with mobile menu support and integrated UserProfile dropdown
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import UserProfile from "./UserProfile";
import MobileNavOverlay from "./MobileNavOverlay";
import "../styles/theme.css";
import "../styles/Navbar.css";
import config from "../utils/envConfig";
import packageJson from "../package.json";

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const { currentUser, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const toggleMenu = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsOpen((prev) => !prev);
    console.log("Menu toggled, new state will be:", !isOpen);

    // Log the menu state after a short delay to ensure it reflects the new state
    setTimeout(() => {
      console.log("Menu state after toggle:", isOpen ? "open" : "closed");
    }, 10);
  };

  const closeMenu = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    console.log("Closing menu explicitly");
    setIsOpen(false);
  };

  // Non abbiamo più bisogno di questo gestore perché ora usiamo MobileNavOverlay
  // per gestire i click fuori dal menu

  // Gestione semplificata per lo scroll del body (solo su mobile)
  useEffect(() => {
    // Ora che abbiamo MobileNavOverlay per gestire i click fuori dal menu,
    // questo effetto si occupa solo di gestire lo scroll del body
    if (isOpen && window.innerWidth <= 768) {
      // Previeni lo scroll del body quando il menu è aperto su mobile
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleLogout = async () => {
    await logout();
    setIsOpen(false);
  };

  const handleProfileClick = () => {
    navigate("/profile");
    setIsOpen(false); // Close mobile menu when navigating
  };

  const handleSettingsClick = () => {
    // Navigate to settings page when it exists
    // For now, navigate to profile as a placeholder
    navigate("/profile");
    setIsOpen(false); // Close mobile menu when navigating
  };

  const handleUserSignOut = async () => {
    await handleLogout();
    setIsOpen(false); // Close mobile menu when signing out
  };

  // Prepare user data for UserProfile component
  const userData = currentUser
    ? {
        name:
          currentUser.username ||
          currentUser.displayName ||
          currentUser.email?.split("@")[0] ||
          "User",
        email: currentUser.email || "user@example.com",
        avatar:
          currentUser.photoURL ||
          currentUser.avatar ||
          currentUser.profilePicture ||
          null,
      }
    : null;

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

        <button
          className="navbar-toggle"
          onClick={toggleMenu}
          aria-label="Toggle menu"
          aria-expanded={isOpen}
        >
          <span className={`toggle-icon ${isOpen ? "open" : ""}`}></span>
        </button>

        {/* Indipendent Overlay */}
        <MobileNavOverlay isOpen={isOpen} onClose={closeMenu} />

        <div
          className={`navbar-menu ${isOpen ? "active" : ""}`}
          aria-hidden={!isOpen}
        >
          <ul className="navbar-menu-items">
            {isAuthenticated && (
              <li className="navbar-item">
                <Link
                  to="/streams"
                  className="navbar-link"
                  onClick={(e) => {
                    if (window.innerWidth <= 768) {
                      e.preventDefault();
                      setTimeout(() => {
                        closeMenu();
                        navigate("/streams");
                      }, 100);
                    }
                  }}
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
                    onClick={(e) => {
                      if (window.innerWidth <= 768) {
                        e.preventDefault();
                        setTimeout(() => {
                          closeMenu();
                          navigate("/login");
                        }, 100);
                      }
                    }}
                  >
                    Login
                  </Link>
                </li>
                <li className="navbar-item">
                  <Link
                    to="/register"
                    className="navbar-link"
                    onClick={(e) => {
                      if (window.innerWidth <= 768) {
                        e.preventDefault();
                        setTimeout(() => {
                          closeMenu();
                          navigate("/register");
                        }, 100);
                      }
                    }}
                  >
                    Sign Up
                  </Link>
                </li>
              </>
            ) : (
              <>
                {/* UserProfile component - desktop dropdown, mobile inline */}
                <li className="navbar-item navbar-item--user-profile">
                  <UserProfile
                    user={userData}
                    onProfileClick={handleProfileClick}
                    onSettingsClick={handleSettingsClick}
                    onSignOut={handleUserSignOut}
                    isMobileMenuOpen={isOpen}
                    onCloseMobileMenu={() => setIsOpen(false)}
                  />
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
