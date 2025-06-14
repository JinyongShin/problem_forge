import React, { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

function ChatWindow({ chat, logs = [], onSaveLogs }) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, [chat?.messages?.length]);

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
      {/* 로그 뷰어 */}
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
          <div key={idx} style={{ marginBottom: 18, display: 'flex', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
            <div style={{
              background: msg.role === 'user' ? '#d1eaff' : '#fff',
              color: '#222',
              borderRadius: 12,
              padding: '10px 16px',
              maxWidth: 360,
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              wordBreak: 'break-all',
            }}>
              {msg.role === 'assistant' ? (
                <ReactMarkdown>{msg.text}</ReactMarkdown>
              ) : (
                msg.text
              )}
              {msg.files && msg.files.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  {msg.files.map((file, fidx) => (
                    <div key={fidx} style={{ fontSize: 13, color: '#555' }}>📎 {file.name}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ChatWindow; 