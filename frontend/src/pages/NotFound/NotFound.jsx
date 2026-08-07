import React from 'react';
import { Link } from 'react-router-dom';
import { HiHome } from 'react-icons/hi';
import './NotFound.css';

function NotFound() {
  return (
    <div className="not-found">
      <h1 className="not-found-code">404</h1>
      <h2 className="not-found-title">Page Not Found</h2>
      <p className="not-found-text">
        Sorry, the page you are looking for doesn't exist or has been moved.
      </p>
      <Link to="/" className="not-found-btn">
        <HiHome size={18} />
        Back to Home
      </Link>
    </div>
  );
}

export default NotFound;
