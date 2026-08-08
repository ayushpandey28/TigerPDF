import React, { useState } from 'react';
import UploadBox from '../../components/UploadBox/UploadBox';
import Loading from '../../components/Loading/Loading';
import DownloadButton from '../../components/DownloadButton/DownloadButton';
import { HiCollection } from 'react-icons/hi';
import { compressPDF, getErrorMessage } from '../../services/api';
import './CompressPDF.css';

function CompressPDF() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Compression level
  const [level, setLevel] = useState('medium');

  // Handle file selected
  function handleFiles(selected) {
    setFile(selected[0]);
    setResult(null);
    setError('');
  }

  // Compress PDF
  async function handleCompress() {
    if (!file) {
      setError('Please select a PDF file.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await compressPDF(file, level);

      const blob = new Blob(
        [response.data],
        { type: 'application/pdf' }
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
              'linear-gradient(135deg, #10B981, #059669)'
          }}
        >
          <HiCollection />
        </div>

        <h1>Compress PDF</h1>

        <p>
          Reduce your PDF file size without losing quality.
        </p>

      </div>

      {/* Upload */}
      {!loading && !result && (
        <UploadBox
          accept=".pdf"
          multiple={false}
          onFilesSelected={handleFiles}
          label="Drag & drop your PDF here"
        />
      )}

      {/* Selected File */}
      {file && !loading && !result && (
        <div className="file-list">

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
            Compress PDF
          </button>

        </div>
      )}

      {/* Loading */}
      {loading && (
        <Loading message="Compressing your PDF..." />
      )}

      {/* Result */}
      {result && (
        <div className="result-box">

          <p className="result-text">
            ✅ Your compressed PDF is ready!
          </p>

          <DownloadButton
            fileUrl={result}
            fileName="compressed.pdf"
          />

          <button
            className="reset-btn"
            onClick={() => {
              if (result) URL.revokeObjectURL(result);
              setFile(null);
              setResult(null);
              setLevel('medium');
            }}
          >
            Compress Another PDF
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

export default CompressPDF;