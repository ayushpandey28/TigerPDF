import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HiMenu, HiX } from 'react-icons/hi';
import './Navbar.css';

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  // Toggle mobile menu
  function toggleMenu() {
    setMenuOpen(!menuOpen);
  }

  // Close menu when a link is clicked
  function closeMenu() {
    setMenuOpen(false);
  }

  // Check if link is active
  function isActive(path) {
    return location.pathname === path ? 'nav-link active' : 'nav-link';
  }

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <Link to="/" className="navbar-logo" onClick={closeMenu}>
          <span className="logo-icon">🐯</span>
          <span className="logo-text">TigerPDF</span>
        </Link>

        {/* Desktop Nav Links */}
        <ul className={menuOpen ? 'nav-links open' : 'nav-links'}>
          <li>
            <Link to="/" className={isActive('/')} onClick={closeMenu}>
              Home
            </Link>
          </li>
          <li>
            <Link to="/image-to-pdf" className={isActive('/image-to-pdf')} onClick={closeMenu}>
              Image to PDF
            </Link>
          </li>
          <li>
            <Link to="/merge-pdf" className={isActive('/merge-pdf')} onClick={closeMenu}>
              Merge PDF
            </Link>
          </li>
          <li>
            <Link to="/compress-pdf" className={isActive('/compress-pdf')} onClick={closeMenu}>
              Compress PDF
            </Link>
          </li>
          <li>
            <Link to="/compress-image" className={isActive('/compress-image')} onClick={closeMenu}>
              Compress Image
            </Link>
          </li>
        </ul>

        {/* Hamburger Menu */}
        <button className="menu-btn" onClick={toggleMenu}>
          {menuOpen ? <HiX size={24} /> : <HiMenu size={24} />}
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
