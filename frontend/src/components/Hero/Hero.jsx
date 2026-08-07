import React from 'react';
import { Link } from 'react-router-dom';
import { HiArrowRight } from 'react-icons/hi';
import './Hero.css';

function Hero() {
  return (
    <section className="hero">
      {/* Background glow effects */}
      <div className="hero-glow hero-glow-1"></div>
      <div className="hero-glow hero-glow-2"></div>

      <div className="hero-content">
        <span className="hero-badge">✨ Free & Fast PDF Tools</span>

        <h1 className="hero-title">
          All Your <span className="gradient-text">PDF Tools</span> in One Place
        </h1>

        <p className="hero-subtitle">
          Convert images to PDF, merge documents, compress files — all for free,
          right in your browser. No signup required.
        </p>

        <div className="hero-buttons">
          <Link to="/image-to-pdf" className="btn-primary">
            Get Started <HiArrowRight />
          </Link>
          <a href="#tools" className="btn-secondary">
            View Tools
          </a>
        </div>

        {/* Stats */}
        <div className="hero-stats">
          <div className="stat">
            <span className="stat-number">4</span>
            <span className="stat-label">Free Tools</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat">
            <span className="stat-number">100%</span>
            <span className="stat-label">Free Forever</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat">
            <span className="stat-number">Fast</span>
            <span className="stat-label">Processing</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
