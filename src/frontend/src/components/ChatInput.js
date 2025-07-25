import React, { useRef, useState, useEffect } from 'react';

function ChatInput({
  value,
  onChange,
  onSend,
  onAttachFile,
  attachedFiles = [],
  errorMessage,
  selectableProblems = [],
  selectedProblems = new Set(),
  onProblemSelection,
  onSelectAll,
  onDeselectAll,
  onConvertSelected,
  onCancelSelection,
}) {
  const fileInputRef = useRef();
  const [expandedProblems, setExpandedProblems] = useState(new Set());

  // selectableProblems가 변경될 때 expandedProblems 초기화
  useEffect(() => {
    setExpandedProblems(new Set());
  }, [selectableProblems]);

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

  const handleToggleExpand = (index) => {
    const newExpanded = new Set(expandedProblems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedProblems(newExpanded);
  };

  if (selectableProblems.length > 0) {
    return (
      <div style={{ padding: 16, borderTop: '1px solid #eee', background: '#fafbfc' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ marginTop: 0 }}>변환할 문제를 선택하세요.</h4>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={onSelectAll} style={{ padding: '4px 12px', borderRadius: '6px', border: '1px solid #ccc', cursor: 'pointer', background: '#f0f0f0' }}>
              모두 선택
            </button>
            <button onClick={onDeselectAll} style={{ padding: '4px 12px', borderRadius: '6px', border: '1px solid #ccc', cursor: 'pointer', background: '#f0f0f0' }}>
              모두 선택 취소
            </button>
          </div>
        </div>
        <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '8px', padding: '10px', background: '#fff', marginTop: '10px' }}>
          {selectableProblems.map((problem, index) => {
            const isExpanded = expandedProblems.has(index);
            const isLongText = problem.length > 100;
            const displayText = isExpanded || !isLongText ? problem : problem.substring(0, 100) + '...';
            
            return (
              <div key={index} style={{ marginBottom: '8px', padding: '5px', borderBottom: '1px solid #eee' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <input
                    type="checkbox"
                    checked={selectedProblems.has(index)}
                    onChange={() => onProblemSelection(index)}
                    style={{ marginTop: '2px', flexShrink: 0 }}
                  />
                  <div style={{ 
                    flex: 1, 
                    fontSize: '14px', 
                    lineHeight: '1.4',
                    maxHeight: isExpanded ? '200px' : 'none',
                    overflowY: isExpanded && isLongText ? 'auto' : 'visible',
                    paddingRight: isExpanded ? '5px' : '0'
                  }}>
                    {displayText}
                  </div>
                  {isLongText && (
                    <button
                      onClick={() => handleToggleExpand(index)}
                      onMouseEnter={(e) => {
                        e.target.style.background = '#e9ecef';
                        e.target.style.borderColor = '#adb5bd';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = '#f8f9fa';
                        e.target.style.borderColor = '#ccc';
                      }}
                      style={{
                        padding: '2px 8px',
                        fontSize: '12px',
                        borderRadius: '4px',
                        border: '1px solid #ccc',
                        background: '#f8f9fa',
                        cursor: 'pointer',
                        flexShrink: 0,
                        color: '#666',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {isExpanded ? '접기' : '더보기'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={() => onConvertSelected(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', background: '#2d8cff', color: '#fff', fontWeight: 'bold' }}>
            선택 ({selectedProblems.size}) 문제 변형
          </button>
          <button onClick={onCancelSelection} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #ccc', background: '#eee', cursor: 'pointer' }}>
            취소
          </button>
        </div>
      </div>
    );
  }

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