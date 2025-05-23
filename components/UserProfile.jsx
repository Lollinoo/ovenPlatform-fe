/**
 * UserProfile Component
 *
 * A responsive user profile dropdown component that displays user information
 * and navigation options. Adapts to different screen sizes with optimized
 * layouts for mobile, tablet, and desktop devices.
 *
 * Features:
 * - Circular avatar with gradient border
 * - User name and email display
 * - Clickable menu items with icons
 * - Responsive design with mobile-first approach
 * - Smooth animations and glassmorphism effects
 * - Follows the current site's design system
 */

import { useState, useRef, useEffect } from "react";
import "../styles/UserProfile.css";

const UserProfile = ({
  user,
  onProfileClick,
  onSettingsClick,
  onSignOut,
  isMobileMenuOpen = false,
  onCloseMobileMenu,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const avatarRef = useRef(null);

  // Handle click outside to close dropdown (only on desktop)
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Only handle click outside on desktop (when not in mobile menu)
      if (window.innerWidth > 768) {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target) &&
          avatarRef.current &&
          !avatarRef.current.contains(event.target)
        ) {
          setIsOpen(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle escape key to close dropdown
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscapeKey);
    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, []);

  // Close dropdown when mobile menu opens/closes
  useEffect(() => {
    if (isMobileMenuOpen && window.innerWidth <= 768) {
      setIsOpen(false);
    }
  }, [isMobileMenuOpen]);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  const handleMenuItemClick = (action) => {
    setIsOpen(false);
    if (onCloseMobileMenu && window.innerWidth <= 768) {
      onCloseMobileMenu();
    }
    action();
  };

  // Get user initials for avatar fallback
  const getUserInitials = (name) => {
    if (!name) return "👤";

    // Handle email addresses as names
    const displayName = name.includes("@") ? name.split("@")[0] : name;

    return (
      displayName
        .split(" ")
        .map((word) => word[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "👤"
    );
  };

  const menuItems = [
    {
      id: "profile",
      label: "Profile",
      icon: "👤",
      action: onProfileClick,
    },
    {
      id: "settings",
      label: "Settings",
      icon: "⚙️",
      action: onSettingsClick,
    },
  ];

  return (
    <div className="user-profile">
      {/* Desktop/Tablet: Avatar Button with Dropdown */}
      <div className="user-profile__desktop-mode">
        <button
          ref={avatarRef}
          className={`user-profile__avatar ${
            isOpen ? "user-profile__avatar--active" : ""
          }`}
          onClick={toggleDropdown}
          aria-label="Open user menu"
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          <div className="user-profile__avatar-inner">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={`${user.name}'s avatar`}
                className="user-profile__avatar-image"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "flex";
                }}
              />
            ) : null}
            <span
              className="user-profile__avatar-initials"
              style={{ display: user?.avatar ? "none" : "flex" }}
            >
              {getUserInitials(user?.name)}
            </span>
          </div>
          <div className="user-profile__avatar-indicator">
            <svg
              className="user-profile__dropdown-icon"
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 4.5L6 7.5L9 4.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </button>

        {/* Dropdown Panel */}
        {isOpen && (
          <>
            {/* Mobile overlay */}
            <div className="user-profile__overlay" />

            <div
              ref={dropdownRef}
              className="user-profile__dropdown"
              role="menu"
              aria-labelledby="user-menu"
            >
              {/* User Info Section */}
              <div className="user-profile__header">
                <div className="user-profile__user-avatar">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={`${user.name}'s avatar`}
                      className="user-profile__user-avatar-image"
                      onError={(e) => {
                        e.target.style.display = "none";
                        e.target.nextSibling.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <span
                    className="user-profile__user-avatar-initials"
                    style={{ display: user?.avatar ? "none" : "flex" }}
                  >
                    {getUserInitials(user?.name)}
                  </span>
                </div>
                <div className="user-profile__user-info">
                  <h3 className="user-profile__user-name">
                    {user?.name || "Guest User"}
                  </h3>
                  <p className="user-profile__user-email">
                    {user?.email || "guest@example.com"}
                  </p>
                </div>
              </div>

              {/* Menu Items */}
              <div className="user-profile__menu">
                {menuItems.map((item) => (
                  <button
                    key={item.id}
                    className="user-profile__menu-item"
                    onClick={() => handleMenuItemClick(item.action)}
                    role="menuitem"
                  >
                    <span className="user-profile__menu-icon">{item.icon}</span>
                    <span className="user-profile__menu-label">
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Sign Out Section */}
              <div className="user-profile__footer">
                <button
                  className="user-profile__signout-button"
                  onClick={() => handleMenuItemClick(onSignOut)}
                  role="menuitem"
                >
                  <span className="user-profile__signout-icon">🚪</span>
                  <span className="user-profile__signout-label">Sign out</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Mobile: Inline Menu Items (for integration in navbar mobile menu) */}
      <div className="user-profile__mobile-mode">
        {/* User Info Header */}
        <div className="user-profile__mobile-header">
          <div className="user-profile__mobile-avatar">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={`${user.name}'s avatar`}
                className="user-profile__mobile-avatar-image"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.nextSibling.style.display = "flex";
                }}
              />
            ) : null}
            <span
              className="user-profile__mobile-avatar-initials"
              style={{ display: user?.avatar ? "none" : "flex" }}
            >
              {getUserInitials(user?.name)}
            </span>
          </div>
          <div className="user-profile__mobile-info">
            <h3 className="user-profile__mobile-name">
              {user?.name || "Guest User"}
            </h3>
            <p className="user-profile__mobile-email">
              {user?.email || "guest@example.com"}
            </p>
          </div>
        </div>

        {/* Mobile Menu Items */}
        <div className="user-profile__mobile-menu">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className="user-profile__mobile-menu-item"
              onClick={() => handleMenuItemClick(item.action)}
            >
              <span className="user-profile__mobile-menu-icon">
                {item.icon}
              </span>
              <span className="user-profile__mobile-menu-label">
                {item.label}
              </span>
            </button>
          ))}

          {/* Mobile Sign Out */}
          <button
            className="user-profile__mobile-signout"
            onClick={() => handleMenuItemClick(onSignOut)}
          >
            <span className="user-profile__mobile-signout-icon">🚪</span>
            <span className="user-profile__mobile-signout-label">Sign out</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
