import React from 'react';
import { HiDownload } from 'react-icons/hi';
import './DownloadButton.css';

function DownloadButton({ fileUrl, fileName }) {
  // Download the file
  function handleDownload() {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName || 'download';
    link.click();
  }

  return (
    <button className="download-btn" onClick={handleDownload}>
      <HiDownload size={20} />
      Download File
    </button>
  );
}

export default DownloadButton;
