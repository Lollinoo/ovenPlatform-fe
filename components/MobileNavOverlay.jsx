/**
 * MobileNavOverlay Component
 */
import React from "react";

const MobileNavOverlay = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
  };

  return (
    <div
      className="mobile-nav-overlay"
      onClick={handleClick}
      role="button"
      aria-label="Close menu"
      tabIndex={-1}
    />
  );
};

export default MobileNavOverlay;
