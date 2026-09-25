import React, { useState, useEffect } from 'react';
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
  const [level, setLevel] = useState('medium');

  useEffect(() => {
    return () => {
      if (result) URL.revokeObjectURL(result);
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [result, preview]);

  function handleFiles(selected) {
    const image = selected[0];
    if (!image) return;

    if (image.size > 20 * 1024 * 1024) {
      setError('Image is larger than the 20 MB limit.');
      return;
    }

    setFile(image);
    if (result) {
      URL.revokeObjectURL(result);
      setResult(null);
    }
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setError('');

    const previewUrl = URL.createObjectURL(image);
    setPreview(previewUrl);
  }

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
        { type: response.headers['content-type'] || file.type }
      );

      if (result) URL.revokeObjectURL(result);
      setResult(URL.createObjectURL(blob));
    } catch (err) {
      console.error(err);
      const msg = await getErrorMessage(err);
      setError(msg || 'Something went wrong. Please try again.');
    }

    setLoading(false);
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="page-icon" style={{ background: '#c66a2c' }}>
          <HiColorSwatch />
        </div>
        <h1>Compress Image</h1>
        <p>Reduce your image file size while keeping great quality.</p>
      </div>

      {!loading && !result && (
        <UploadBox
          accept="image/*"
          multiple={false}
          onFilesSelected={handleFiles}
          label="Drag & drop your image here"
        />
      )}

      {file && !loading && !result && (
        <div className="file-list">
          {preview && (
            <div className="image-preview">
              <img src={preview} alt="Preview" />
            </div>
          )}

          <div className="file-item">
            <span className="file-name">{file.name}</span>
            <span className="file-size">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </span>
          </div>

          <div className="compression-options">
            <h3>Compression Level</h3>
            <div className="compression-buttons">
              <button
                type="button"
                className={level === 'high' ? 'compression-option active' : 'compression-option'}
                onClick={() => setLevel('high')}
              >
                <strong>High Quality</strong>
                <span>Less compression</span>
              </button>

              <button
                type="button"
                className={level === 'medium' ? 'compression-option active' : 'compression-option'}
                onClick={() => setLevel('medium')}
              >
                <strong>Medium</strong>
                <span>Balanced</span>
              </button>

              <button
                type="button"
                className={level === 'low' ? 'compression-option active' : 'compression-option'}
                onClick={() => setLevel('low')}
              >
                <strong>Small Size</strong>
                <span>Maximum compression</span>
              </button>
            </div>
          </div>

          <button className="action-btn" onClick={handleCompress}>
            Compress Image
          </button>
        </div>
      )}

      {loading && <Loading message="Compressing your image..." />}

      {result && (
        <div className="result-box">
          <p className="result-text">Your compressed image is ready.</p>
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

      {error && <p className="error-text">{error}</p>}
    </div>
  );
}

export default CompressImage;
