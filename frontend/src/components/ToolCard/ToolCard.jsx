import React from 'react';
import { Link } from 'react-router-dom';
import { HiArrowRight } from 'react-icons/hi';
import './ToolCard.css';

function ToolCard({ icon, title, description, link, color }) {
  return (
    <Link to={link} className="tool-card">
      <div className="tool-card-icon" style={{ background: color }}>
        {icon}
      </div>
      <h3 className="tool-card-title">{title}</h3>
      <p className="tool-card-desc">{description}</p>
      <span className="tool-card-link">
        Use Tool <HiArrowRight />
      </span>
    </Link>
  );
}

export default ToolCard;
