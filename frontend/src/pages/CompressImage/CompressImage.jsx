import React, { useState } from 'react';
import UploadBox from '../../components/UploadBox/UploadBox';
import Loading from '../../components/Loading/Loading';
import DownloadButton from '../../components/DownloadButton/DownloadButton';
import { HiColorSwatch } from 'react-icons/hi';
import { compressImage, getErrorMessage } from '../../services/api';
import './CompressImage.css';

function CompressImage() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Compression level
  const [level, setLevel] = useState('medium');

  // Handle file selected
  function handleFiles(selected) {
    const image = selected[0];

    if (!image) {
      return;
    }

    setFile(image);
    setResult(null);
    setError('');

    // Create preview
    const reader = new FileReader();

    reader.onload = function (e) {
      setPreview(e.target.result);
    };

    reader.readAsDataURL(image);
  }

  // Compress image
  async function handleCompress() {
    if (!file) {
      setError('Please select an image.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await compressImage(file, level);

      const blob = new Blob(
        [response.data],
        {
          type: response.headers['content-type'] || file.type,
        }
      );

      const url = URL.createObjectURL(blob);

      setResult(url);
    } catch (err) {
      console.error(err);
      const msg = getErrorMessage(err);
      setError(msg || 'Something went wrong. Please try again.');
    }

    setLoading(false);
  }

  return (
    <div className="page-container">

      {/* Page Header */}
      <div className="page-header">

        <div
          className="page-icon"
          style={{
            background:
              'linear-gradient(135deg, #F59E0B, #D97706)',
          }}
        >
          <HiColorSwatch />
        </div>

        <h1>Compress Image</h1>

        <p>
          Reduce your image file size while keeping great quality.
        </p>

      </div>

      {/* Upload */}
      {!loading && !result && (
        <UploadBox
          accept="image/*"
          multiple={false}
          onFilesSelected={handleFiles}
          label="Drag & drop your image here"
        />
      )}

      {/* Preview */}
      {file && !loading && !result && (
        <div className="file-list">

          {preview && (
            <div className="image-preview">
              <img
                src={preview}
                alt="Preview"
              />
            </div>
          )}

          <div className="file-item">

            <span className="file-name">
              {file.name}
            </span>

            <span className="file-size">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </span>

          </div>

          {/* Compression Options */}
          <div className="compression-options">

            <h3>Compression Level</h3>

            <div className="compression-buttons">

              <button
                type="button"
                className={
                  level === 'high'
                    ? 'compression-option active'
                    : 'compression-option'
                }
                onClick={() => setLevel('high')}
              >
                <strong>High Quality</strong>
                <span>Less compression</span>
              </button>

              <button
                type="button"
                className={
                  level === 'medium'
                    ? 'compression-option active'
                    : 'compression-option'
                }
                onClick={() => setLevel('medium')}
              >
                <strong>Medium</strong>
                <span>Balanced</span>
              </button>

              <button
                type="button"
                className={
                  level === 'low'
                    ? 'compression-option active'
                    : 'compression-option'
                }
                onClick={() => setLevel('low')}
              >
                <strong>Small Size</strong>
                <span>Maximum compression</span>
              </button>

            </div>

          </div>

          <button
            className="action-btn"
            onClick={handleCompress}
          >
            Compress Image
          </button>

        </div>
      )}

      {/* Loading */}
      {loading && (
        <Loading message="Compressing your image..." />
      )}

      {/* Result */}
      {result && (
        <div className="result-box">

          <p className="result-text">
            ✅ Your compressed image is ready!
          </p>

          <DownloadButton
            fileUrl={result}
            fileName={'compressed-' + file.name}
          />

          <button
            className="reset-btn"
            onClick={() => {
              if (result) URL.revokeObjectURL(result);
              setFile(null);
              setPreview(null);
              setResult(null);
              setLevel('medium');
            }}
          >
            Compress Another Image
          </button>

        </div>
      )}

      {/* Error */}
      {error && (
        <p className="error-text">
          {error}
        </p>
      )}

    </div>
  );
}

export default CompressImage;