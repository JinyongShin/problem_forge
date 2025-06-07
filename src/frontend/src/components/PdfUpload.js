import React, { useState } from 'react';

function PdfUpload({ onUpload }) {
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      setError('PDF 파일만 업로드할 수 있습니다.');
      setFileName('');
      return;
    }
    setError('');
    setFileName(file.name);
    onUpload(file);
  };

  return (
    <div>
      <input
        type="file"
        accept="application/pdf"
        onChange={handleChange}
      />
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {fileName && <div style={{ marginTop: 8 }}>{fileName}</div>}
    </div>
  );
}

export default PdfUpload; 