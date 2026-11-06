import React, { useRef, useState } from 'react';
import { HiCloudUpload } from 'react-icons/hi';
import './UploadBox.css';

const supportedImageExtensions = /\.(jpg|jpeg|png|webp)$/i;
const supportedImageMimes = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

function UploadBox({ accept, multiple, onFilesSelected, onFilesRejected, label }) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);
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
    if (
      accept === 'image/*'
      || accept.includes('image')
      || accept.includes('.jpg')
      || accept.includes('.jpeg')
      || accept.includes('.png')
      || accept.includes('.webp')
    ) {
      return supportedImageMimes.has(type) || supportedImageExtensions.test(name);
    }
    return true;
  }

  function processFiles(files) {
    let selected = Array.from(files || []);
    if (!multiple) selected = selected.slice(0, 1);
    if (selected.length === 0) return;

    const valid = selected.filter(isAcceptedFile);
    const rejected = selected.filter((file) => !isAcceptedFile(file));

    if (valid.length > 0) onFilesSelected(valid);
    if (rejected.length > 0) {
      const names = rejected.map((file) => `"${file.name}"`).join(', ');
      onFilesRejected?.(`${names} ${rejected.length === 1 ? 'is' : 'are'} not a supported file format.`);
    }
  }

  // Handle file selection from input
  function handleFileChange(e) {
    processFiles(e.target.files);
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
    processFiles(e.dataTransfer.files);
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
      <button
        type="button"
        className="upload-btn"
        onClick={() => inputRef.current?.click()}
      >
        Browse Files
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileChange}
        className="file-input"
        tabIndex={-1}
        aria-label={label || 'Choose files'}
      />
      <p className="upload-limit">{selectionLimit}</p>
    </div>
  );
}

export default UploadBox;
