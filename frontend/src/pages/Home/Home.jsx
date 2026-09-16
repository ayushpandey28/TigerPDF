import React from 'react';
import Hero from '../../components/Hero/Hero';
import ToolCard from '../../components/ToolCard/ToolCard';
import { HiPhotograph, HiDocumentDuplicate, HiCollection, HiColorSwatch } from 'react-icons/hi';
import './Home.css';

function Home() {
  // Tool data
  const tools = [
    {
      icon: <HiPhotograph size={24} />,
      title: 'Image to PDF',
      description: 'Convert your images (JPG, PNG) into a single PDF document quickly and easily.',
      link: '/image-to-pdf',
      color: '#2f6fed',
    },
    {
      icon: <HiDocumentDuplicate size={24} />,
      title: 'Merge PDF',
      description: 'Combine multiple PDF files into one document in just a few clicks.',
      link: '/merge-pdf',
      color: '#1683a5',
    },
    {
      icon: <HiCollection size={24} />,
      title: 'Compress PDF',
      description: 'Reduce the file size of your PDF without losing quality.',
      link: '/compress-pdf',
      color: '#247a64',
    },
    {
      icon: <HiColorSwatch size={24} />,
      title: 'Compress Image',
      description: 'Shrink your image file size while keeping great quality.',
      link: '/compress-image',
      color: '#c66a2c',
    },
  ];

  return (
    <div className="home">
      <Hero />

      {/* Tools Section */}
      <section className="tools-section" id="tools">
        <div className="tools-container">
          <h2 className="section-title">Choose a tool</h2>
          <p className="section-subtitle">
            Start with the task you need to finish today.
          </p>

          <div className="tools-grid">
            {tools.map((tool, index) => (
              <ToolCard
                key={index}
                icon={tool.icon}
                title={tool.title}
                description={tool.description}
                link={tool.link}
                color={tool.color}
              />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="how-section">
        <div className="how-container">
          <h2 className="section-title">How it works</h2>
          <p className="section-subtitle">
            Three simple steps to get your work done.
          </p>

          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <h3>Upload File</h3>
              <p>Select or drag and drop your files into the upload area.</p>
            </div>
            <div className="step-card">
              <div className="step-number">2</div>
              <h3>Process</h3>
              <p>Click the action button and let us handle the rest.</p>
            </div>
            <div className="step-card">
              <div className="step-number">3</div>
              <h3>Download</h3>
              <p>Download your processed file instantly — it's that easy!</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
