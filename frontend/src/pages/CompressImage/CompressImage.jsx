import React, { useState, useEffect, useRef } from 'react';
import UploadBox from '../../components/UploadBox/UploadBox';
import Loading from '../../components/Loading/Loading';
import DownloadButton from '../../components/DownloadButton/DownloadButton';
import { HiColorSwatch } from 'react-icons/hi';
import { compressImage, getErrorMessage, isRequestCancelled } from '../../services/api';
import './CompressImage.css';

function CompressImage() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [level, setLevel] = useState('medium');
  const [resultName, setResultName] = useState('compressed-image');
  const resultRef = useRef(null);
  const previewRef = useRef(null);
  const requestRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestRef.current?.abort();
      if (resultRef.current) {
        URL.revokeObjectURL(resultRef.current);
        resultRef.current = null;
      }
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
        previewRef.current = null;
      }
    };
  }, []);

  function clearResult() {
    if (resultRef.current) {
      URL.revokeObjectURL(resultRef.current);
      resultRef.current = null;
    }
    setResult(null);
  }

  function clearPreview() {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }
    setPreview(null);
  }

  function handleFiles(selected) {
    const image = selected[0];
    if (!image) return;

    if (image.size > 20 * 1024 * 1024) {
      setError('Image is larger than the 20 MB limit.');
      return;
    }

    setFile(image);
    clearResult();
    clearPreview();
    setError('');

    const previewUrl = URL.createObjectURL(image);
    previewRef.current = previewUrl;
    setPreview(previewUrl);
  }

  async function handleCompress() {
    if (!file) {
      setError('Please select an image.');
      return;
    }

    setLoading(true);
    setError('');
    const controller = new AbortController();
    requestRef.current = controller;

    try {
      const response = await compressImage(file, level, { signal: controller.signal });
      if (controller.signal.aborted || !mountedRef.current) return;
      const outputType = response.headers['content-type'] || file.type;
      const blob = new Blob(
        [response.data],
        { type: outputType }
      );

      const extension = outputType === 'image/jpeg'
        ? 'jpg'
        : outputType.split('/')[1] || 'bin';
      const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
      clearResult();
      const url = URL.createObjectURL(blob);
      resultRef.current = url;
      setResult(url);
      setResultName(`compressed-${baseName}.${extension}`);
    } catch (err) {
      if (!isRequestCancelled(err) && mountedRef.current) {
        const msg = await getErrorMessage(err);
        if (mountedRef.current) setError(msg || 'Something went wrong. Please try again.');
      }
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        if (mountedRef.current) setLoading(false);
      }
    }
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
          accept=".jpg,.jpeg,.png,.webp"
           multiple={false}
           onFilesSelected={handleFiles}
           onFilesRejected={setError}
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
                  aria-pressed={level === 'high'}
                className={level === 'high' ? 'compression-option active' : 'compression-option'}
                onClick={() => setLevel('high')}
              >
                <strong>High Quality</strong>
                <span>Less compression</span>
              </button>

                <button
                  type="button"
                  aria-pressed={level === 'medium'}
                className={level === 'medium' ? 'compression-option active' : 'compression-option'}
                onClick={() => setLevel('medium')}
              >
                <strong>Medium</strong>
                <span>Balanced</span>
              </button>

                <button
                  type="button"
                  aria-pressed={level === 'low'}
                className={level === 'low' ? 'compression-option active' : 'compression-option'}
                onClick={() => setLevel('low')}
              >
                <strong>Small Size</strong>
                <span>Maximum compression</span>
              </button>
            </div>
          </div>

           <button type="button" className="action-btn" onClick={handleCompress}>
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
             fileName={resultName}
          />
           <button
             type="button"
             className="reset-btn"
             onClick={() => {
               requestRef.current?.abort();
               clearResult();
               clearPreview();
               setFile(null);
               setResultName('compressed-image');
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
