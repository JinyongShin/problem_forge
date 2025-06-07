import React, { useState } from 'react';

function ImageUpload({ onUpload }) {
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);

  const handleChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setError('JPG, PNG 파일만 업로드할 수 있습니다.');
      setPreview(null);
      return;
    }
    setError('');
    setPreview(URL.createObjectURL(file));
    onUpload(file);
  };

  return (
    <div>
      <input
        type="file"
        accept="image/jpeg,image/png,image/jpg"
        onChange={handleChange}
      />
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {preview && (
        <div style={{ marginTop: 8 }}>
          <img src={preview} alt="미리보기" style={{ maxWidth: 200, maxHeight: 200 }} />
        </div>
      )}
    </div>
  );
}

export default ImageUpload; 