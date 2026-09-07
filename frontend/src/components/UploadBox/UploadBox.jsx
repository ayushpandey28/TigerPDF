import React, { useState } from 'react';
import { HiCloudUpload } from 'react-icons/hi';
import './UploadBox.css';

function UploadBox({ accept, multiple, onFilesSelected, label }) {
  const [isDragging, setIsDragging] = useState(false);

  // Handle file selection from input
  function handleFileChange(e) {
    const selected = Array.from(e.target.files);
    if (selected.length > 0) {
      onFilesSelected(selected);
    }
    // Reset input value so re-selecting the exact same file triggers onChange
    e.target.value = '';
  }

  // Handle drag over
  function handleDragOver(e) {
    e.preventDefault();
    setIsDragging(true);
  }

  // Handle drag leave
  function handleDragLeave() {
    setIsDragging(false);
  }

  // Handle file drop
  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length > 0) {
      onFilesSelected(dropped);
    }
  }

  return (
    <div
      className={isDragging ? 'upload-box dragging' : 'upload-box'}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <HiCloudUpload className="upload-icon" />
      <p className="upload-text">{label || 'Drag & drop your files here'}</p>
      <p className="upload-or">or</p>
      <label className="upload-btn">
        Browse Files
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileChange}
          hidden
        />
      </label>
    </div>
  );
}

export default UploadBox;
