import React, { useState } from 'react';
import { HiCloudUpload } from 'react-icons/hi';
import './UploadBox.css';

function UploadBox({ accept, multiple, onFilesSelected, label }) {
  const [isDragging, setIsDragging] = useState(false);
  const supportedFormats = accept === '.pdf' ? 'PDF files' : 'JPG, PNG, or WEBP';
  const selectionLimit = multiple ? 'You can add multiple files.' : 'One file at a time.';

  // Validate file against accepted pattern
  function isAcceptedFile(file) {
    if (!accept) return true;
    const name = (file.name || '').toLowerCase();
    const type = (file.type || '').toLowerCase();

    if (accept === '.pdf') {
      return name.endsWith('.pdf') || type === 'application/pdf';
    }
    if (accept === 'image/*' || accept.includes('image')) {
      return type.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(name);
    }
    return true;
  }

  // Handle file selection from input
  function handleFileChange(e) {
    let selected = Array.from(e.target.files);
    if (selected.length > 0) {
      if (!multiple) selected = [selected[0]];
      const valid = selected.filter(isAcceptedFile);
      if (valid.length > 0) {
        onFilesSelected(valid);
      }
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
    let dropped = Array.from(e.dataTransfer.files);
    if (dropped.length > 0) {
      if (!multiple) dropped = [dropped[0]];
      const valid = dropped.filter(isAcceptedFile);
      if (valid.length > 0) {
        onFilesSelected(valid);
      }
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
      <p className="upload-help">{supportedFormats} · Up to 20 MB per file</p>
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
      <p className="upload-limit">{selectionLimit}</p>
    </div>
  );
}

export default UploadBox;
