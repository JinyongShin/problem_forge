import React, { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { jsPDF } from 'jspdf';
import { nanumGothicBase64 } from '../assets/fonts/NanumGothic-base64';

function Accordion({ title, content }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: '8px', marginBottom: '10px', background: '#fff' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          background: '#f7f7f7',
          border: 'none',
          padding: '12px 18px',
          textAlign: 'left',
          cursor: 'pointer',
          fontSize: '16px',
          fontWeight: 'bold',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {title}
        <span>{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && (
        <div style={{ padding: '15px' }}>
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}


function ChatWindow({ chat, logs = [], onSaveLogs }) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, [chat?.messages?.length]);

  const handleDownloadPdf = (content) => {
    const doc = new jsPDF();

    // 폰트 추가
    doc.addFileToVFS('NanumGothic.ttf', nanumGothicBase64);
    doc.addFont('NanumGothic.ttf', 'NanumGothic', 'normal');
    doc.setFont('NanumGothic');

    // 텍스트 줄 바꿈 처리 및 추가
    const lines = doc.splitTextToSize(content, 180); // 180mm 너비로 자동 줄 바꿈
    doc.text(lines, 15, 20);

    doc.save('problem-forge-questions.pdf');
  };

  const parseMultiProblemResponse = (text) => {
    const separator = "--- 문제";
    if (!text.includes(separator)) {
      return null; // 단일 문제 응답으로 처리
    }
    const parts = text.split(separator);
    return parts.slice(1).map(part => {
      const [title, ...contentParts] = part.split('---');
      const content = contentParts.join('---').replace(/ 변형 결과 ---\n\n/, '');
      return { title: `문제 ${title.trim()}`, content: content.trim() };
    });
  };


  if (!chat) {
    return <div style={{ flex: 1, padding: 32, color: '#888' }}>대화를 선택하세요.</div>;
  }
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, background: '#f7f7f7' }}>
      <div style={{ padding: 24, borderBottom: '1px solid #eee', fontWeight: 'bold', fontSize: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
        <span>{chat.title || `대화 ${chat.id}`}</span>
        {onSaveLogs && (
          <button onClick={onSaveLogs} style={{ marginLeft: 'auto', padding: '6px 16px', fontSize: 14, borderRadius: 6, border: '1px solid #bbb', background: '#fff', cursor: 'pointer' }}>
            로그 저장
          </button>
        )}
      </div>
      {logs && logs.length > 0 && (
        <div style={{ background: '#222', color: '#fff', fontSize: 13, maxHeight: 120, overflowY: 'auto', padding: 10, margin: '8px 24px', borderRadius: 6 }}>
          {logs.slice(-10).map((log, idx) => (
            <div key={idx} style={{ whiteSpace: 'pre-wrap' }}>{log}</div>
          ))}
        </div>
      )}
      <div
        ref={messagesEndRef}
        style={{ flex: 1, overflowY: 'auto', padding: 24, minHeight: 0 }}
      >
        {chat.messages.length === 0 && <div style={{ color: '#aaa' }}>메시지가 없습니다.</div>}
        {chat.messages.map((msg, idx) => (
          <div key={idx} style={{ marginBottom: 18, display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-end', gap: 8 }}>
            <div style={{
              background: msg.role === 'user' ? '#d1eaff' : '#fff',
              color: '#222',
              borderRadius: 12,
              padding: '10px 16px',
              maxWidth: 'calc(100% - 120px)', // 버튼 공간 확보
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              wordBreak: 'break-word',
            }}>
              {msg.type === 'loading' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="custom-spinner" style={{ width: 24, height: 24 }} />
                  <span style={{ fontSize: 16, color: '#222', fontWeight: 500 }}>
                    {msg.text}
                  </span>
                </div>
              ) : msg.role === 'assistant' ? (
                (() => {
                  const problems = parseMultiProblemResponse(msg.text);
                  if (problems) {
                    return problems.map((p, i) => <Accordion key={i} title={p.title} content={p.content} />);
                  }
                  return <ReactMarkdown>{msg.text}</ReactMarkdown>;
                })()
              ) : (
                msg.text.split('\n').map((line, i) => (
                  <React.Fragment key={i}>
                    {line}
                    <br />
                  </React.Fragment>
                ))
              )}
              {msg.files && msg.files.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  {msg.files.map((file, fidx) => (
                    <div key={fidx} style={{ fontSize: 13, color: '#555' }}>📎 {file.name}</div>
                  ))}
                </div>
              )}
            </div>
            {msg.role === 'assistant' && msg.text && !msg.isLoading && (
              <button
                onClick={() => handleDownloadPdf(msg.text)}
                style={{
                  padding: '6px 12px',
                  fontSize: 12,
                  borderRadius: 6,
                  border: '1px solid #ccc',
                  background: '#fff',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
                title="PDF로 다운로드"
              >
                PDF 다운로드
              </button>
            )}
          </div>
        ))}
      </div>
      <style>{`
        .custom-spinner {
          border: 3px solid #e3e8ee;
          border-top: 3px solid #3498db;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          animation: spin 1s linear infinite;
          box-sizing: border-box;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default ChatWindow;
 