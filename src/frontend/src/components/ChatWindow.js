import React from 'react';

function ChatWindow({ chat }) {
  if (!chat) {
    return <div style={{ flex: 1, padding: 32, color: '#888' }}>대화를 선택하세요.</div>;
  }
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', background: '#f7f7f7' }}>
      <div style={{ padding: 24, borderBottom: '1px solid #eee', fontWeight: 'bold', fontSize: 20 }}>{chat.title || `대화 ${chat.id}`}</div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
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
              {msg.text}
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