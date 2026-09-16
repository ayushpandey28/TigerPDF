import React, { useState, useEffect } from 'react';
import './Loading.css';

function Loading({ message }) {
  const [takingLonger, setTakingLonger] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTakingLonger(true);
    }, 7000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p className="loading-text">{message || 'Processing...'}</p>
      {takingLonger && (
        <p className="loading-subtext" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '8px' }}>
          Server may be waking up from sleep, thank you for waiting...
        </p>
      )}
    </div>
  );
}

export default Loading;
