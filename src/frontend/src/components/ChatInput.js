import React, { useRef } from 'react';

function ChatInput({ value, onChange, onSend, onAttachFile, attachedFiles = [], errorMessage }) {
  const fileInputRef = useRef();

  const handleFileButtonClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      onAttachFile(file);
    }
    e.target.value = '';
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid #eee', background: '#fafbfc' }}>
      {errorMessage && (
        <div style={{ color: 'red', background: '#fff0f0', padding: '8px 16px', borderBottom: '1px solid #e0b4b4', fontWeight: 'bold', fontSize: 15 }}>
          {errorMessage}
        </div>
      )}
      {attachedFiles.length > 0 && (
        <div style={{ padding: '8px 16px', background: '#f0f4fa', borderBottom: '1px solid #e0e0e0', fontSize: 14, color: '#333', display: 'flex', gap: 12 }}>
          {attachedFiles.map((file, idx) => (
            <span key={idx} style={{ display: 'inline-block', background: '#e6eaf0', borderRadius: 6, padding: '2px 10px' }}>
              📎 {file.name}
            </span>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-end', padding: 16 }}>
        <button
          onClick={handleFileButtonClick}
          style={{ marginRight: 8, background: '#eee', border: 'none', borderRadius: '50%', width: 36, height: 36, fontSize: 22, cursor: 'pointer' }}
          title="파일 첨부"
        >
          +
        </button>
        <input
          ref={fileInputRef}
          type="file"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 입력하세요..."
          rows={1}
          style={{ flex: 1, resize: 'none', borderRadius: 8, border: '1px solid #ddd', padding: 10, fontSize: 16, minHeight: 36, maxHeight: 120 }}
        />
        <button
          onClick={onSend}
          style={{ marginLeft: 8, background: '#2d8cff', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 'bold', fontSize: 16, cursor: 'pointer' }}
        >
          전송
        </button>
      </div>
    </div>
  );
}

export default ChatInput; 