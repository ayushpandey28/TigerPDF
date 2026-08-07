import React from 'react';
import './Loading.css';

function Loading({ message }) {
  return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p className="loading-text">{message || 'Processing...'}</p>
    </div>
  );
}

export default Loading;
