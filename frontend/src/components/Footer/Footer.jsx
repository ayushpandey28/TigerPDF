import React from 'react';
import { Link } from 'react-router-dom';
import { HiHeart } from 'react-icons/hi';
import './Footer.css';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        {/* Brand */}
        <div className="footer-brand">
          <Link to="/" className="footer-logo">
            <span>🐯</span>
            <span className="footer-logo-text">TigerPDF</span>
          </Link>
          <p className="footer-desc">
            Free online tools to convert, merge and compress your PDF files.
          </p>
        </div>

        {/* Quick Links */}
        <div className="footer-links">
          <h4 className="footer-heading">Tools</h4>
          <Link to="/image-to-pdf">Image to PDF</Link>
          <Link to="/merge-pdf">Merge PDF</Link>
          <Link to="/compress-pdf">Compress PDF</Link>
          <Link to="/compress-image">Compress Image</Link>
        </div>
      </div>

      {/* Bottom */}
      <div className="footer-bottom">
        <p>
          Made with <HiHeart className="heart-icon" /> by TigerPDF Team &copy; {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}

export default Footer;
