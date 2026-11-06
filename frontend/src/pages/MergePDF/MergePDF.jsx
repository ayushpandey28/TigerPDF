import React, { useState, useEffect, useRef } from 'react';
import UploadBox from '../../components/UploadBox/UploadBox';
import Loading from '../../components/Loading/Loading';
import DownloadButton from '../../components/DownloadButton/DownloadButton';
import { HiDocumentDuplicate, HiX } from 'react-icons/hi';
import { mergePDFs, getErrorMessage, isRequestCancelled } from '../../services/api';
import './MergePDF.css';

function MergePDF() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const resultRef = useRef(null);
  const requestRef = useRef(null);
  const mountedRef = useRef(true);

  // Clean up object URL when component unmounts
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

  // Handle files selected
  function handleFiles(selected) {
    // Check individual file sizes
    const oversized = selected.find((f) => f.size > 20 * 1024 * 1024);
    if (oversized) {
      setError(`"${oversized.name}" exceeds the 20 MB limit per file.`);
      return;
    }

    const updated = [...files, ...selected];
    if (updated.length > 15) {
      setError('Maximum 15 PDF files allowed.');
      return;
    }
    setFiles(updated);
    clearResult();
    setError('');
  }

  // Remove a file from the list
  function removeFile(index) {
    const updated = files.filter((_, i) => i !== index);
    setFiles(updated);
  }

  // Merge PDFs
  async function handleMerge() {
    if (files.length < 2) {
      setError('Please select at least two PDF files.');
      return;
    }

    if (files.length > 15) {
      setError('Maximum 15 PDF files allowed.');
      return;
    }

    setLoading(true);
    setError('');
    const controller = new AbortController();
    requestRef.current = controller;

    try {
      const response = await mergePDFs(files, { signal: controller.signal });
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
        <div className="page-icon" style={{ background: '#1683a5' }}>
          <HiDocumentDuplicate size={28} />
        </div>
        <h1>Merge PDF</h1>
        <p>Combine multiple PDF files into one document.</p>
      </div>

      {/* Upload */}
      {!loading && !result && (
        <UploadBox
           accept=".pdf"
           multiple={true}
           onFilesSelected={handleFiles}
           onFilesRejected={setError}
           label="Drag & drop your PDF files here"
        />
      )}

      {/* File List */}
      {files.length > 0 && !loading && !result && (
        <div className="file-list">
          {files.map((file, index) => (
            <div className="file-item" key={`${file.name}-${file.size}-${index}`}>
              <span className="file-name">{file.name}</span>
              <button type="button" className="file-remove" aria-label={`Remove ${file.name}`} onClick={() => removeFile(index)}>
                <HiX />
              </button>
            </div>
          ))}

           <button type="button" className="action-btn" onClick={handleMerge}>
            Merge PDFs
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && <Loading message="Merging your PDFs..." />}

      {/* Result */}
      {result && (
        <div className="result-box">
          <p className="result-text">Your merged PDF is ready.</p>
          <DownloadButton fileUrl={result} fileName="merged.pdf" />
           <button
             type="button"
             className="reset-btn"
             onClick={() => {
               requestRef.current?.abort();
               clearResult();
               setFiles([]);
             }}
          >
            Merge More PDFs
          </button>
        </div>
      )}

      {/* Error */}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}

export default MergePDF;
