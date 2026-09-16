import React from 'react';
import { Link } from 'react-router-dom';
import { HiArrowRight, HiCheck } from 'react-icons/hi';
import './Hero.css';

function Hero() {
  return (
    <section className="hero">
      <div className="hero-content">
        <span className="hero-eyebrow">TigerPDF tools</span>
        <h1 className="hero-title">Simple tools for everyday PDF work.</h1>
        <p className="hero-subtitle">Convert images, combine PDFs, and reduce file sizes without an account.</p>

        <div className="hero-buttons">
          <Link to="/image-to-pdf" className="btn-primary">
            Choose a tool <HiArrowRight />
          </Link>
          <a href="#tools" className="btn-secondary">
            View all tools
          </a>
        </div>

        <div className="hero-notes">
          <span><HiCheck /> Free to use</span>
          <span><HiCheck /> No signup</span>
          <span><HiCheck /> Files processed securely</span>
        </div>
      </div>
    </section>
  );
}

export default Hero;
