import React, { useState, useEffect, useRef } from 'react';
import UploadBox from '../../components/UploadBox/UploadBox';
import Loading from '../../components/Loading/Loading';
import DownloadButton from '../../components/DownloadButton/DownloadButton';
import { HiCollection } from 'react-icons/hi';
import { compressPDF, getErrorMessage, isRequestCancelled } from '../../services/api';
import './CompressPDF.css';

function CompressPDF() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [level, setLevel] = useState('medium');
  const resultRef = useRef(null);
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
    };
  }, []);

  function clearResult() {
    if (resultRef.current) {
      URL.revokeObjectURL(resultRef.current);
      resultRef.current = null;
    }
    setResult(null);
  }

  function handleFiles(selected) {
    const pdfFile = selected[0];
    if (!pdfFile) return;

    if (pdfFile.size > 20 * 1024 * 1024) {
      setError('PDF file is larger than the 20 MB limit.');
      return;
    }

    setFile(pdfFile);
    clearResult();
    setError('');
  }

  async function handleCompress() {
    if (!file) {
      setError('Please select a PDF file.');
      return;
    }

    setLoading(true);
    setError('');
    const controller = new AbortController();
    requestRef.current = controller;

    try {
      const response = await compressPDF(file, level, { signal: controller.signal });
      if (controller.signal.aborted || !mountedRef.current) return;
      const blob = new Blob([response.data], { type: 'application/pdf' });
      clearResult();
      const url = URL.createObjectURL(blob);
      resultRef.current = url;
      setResult(url);
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
        <div className="page-icon" style={{ background: '#247a64' }}>
          <HiCollection />
        </div>
        <h1>Compress PDF</h1>
        <p>Reduce your PDF file size by recompressing supported embedded images.</p>
      </div>

      {!loading && !result && (
        <UploadBox
          accept=".pdf"
           multiple={false}
           onFilesSelected={handleFiles}
           onFilesRejected={setError}
          label="Drag & drop your PDF here"
        />
      )}

      {file && !loading && !result && (
        <div className="file-list">
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
            Compress PDF
          </button>
        </div>
      )}

      {loading && <Loading message="Compressing your PDF..." />}

      {result && (
        <div className="result-box">
          <p className="result-text">Your compressed PDF is ready.</p>
          <DownloadButton fileUrl={result} fileName="compressed.pdf" />
           <button
             type="button"
             className="reset-btn"
             onClick={() => {
               requestRef.current?.abort();
               clearResult();
               setFile(null);
               setLevel('medium');
            }}
          >
            Compress Another PDF
          </button>
        </div>
      )}

      {error && <p className="error-text">{error}</p>}
    </div>
  );
}

export default CompressPDF;
