import React, { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';

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
    // 브라우저의 인쇄 기능을 기본으로 사용 (한글 지원)
    const printWindow = window.open('', '_blank');
    
    // 마크다운 제거 및 텍스트 정리
    const processKoreanText = (text) => {
      return text
        .replace(/#{1,6}\s/g, '') // 헤더 제거
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // bold를 HTML로 변환
        .replace(/\*(.*?)\*/g, '<em>$1</em>') // italic을 HTML로 변환
        .replace(/`(.*?)`/g, '<code>$1</code>') // code를 HTML로 변환
        .replace(/\n{3,}/g, '\n\n') // 과도한 줄바꿈 정리
        .replace(/\n\n/g, '</p><p>') // 단락 구분
        .replace(/\n/g, '<br>') // 줄바꿈을 HTML로 변환
        .trim();
    };
    
    const cleanContent = processKoreanText(content);
    const currentDate = new Date().toLocaleDateString('ko-KR');
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Problem Forge - Generated Questions</title>
          <meta charset="UTF-8">
          <style>
            @page {
              margin: 2cm;
              size: A4;
            }
            body { 
              font-family: 'Malgun Gothic', '맑은 고딕', 'Nanum Gothic', '나눔고딕', Arial, sans-serif; 
              padding: 0;
              margin: 0;
              line-height: 1.6; 
              color: #333;
              font-size: 12pt;
            }
            .header {
              border-bottom: 2px solid #ddd; 
              padding-bottom: 15px; 
              margin-bottom: 25px;
            }
            h1 { 
              color: #2c3e50; 
              font-size: 18pt;
              margin: 0 0 10px 0;
              font-weight: bold;
            }
            .date {
              font-size: 10pt;
              color: #666;
              margin: 5px 0;
            }
            .content { 
              white-space: pre-wrap;
              font-size: 12pt;
              line-height: 1.7;
            }
            .content p {
              margin: 10px 0;
            }
            .content strong {
              font-weight: bold;
              color: #2c3e50;
            }
            .content em {
              font-style: italic;
              color: #34495e;
            }
            .content code {
              background-color: #f8f9fa;
              padding: 2px 4px;
              border-radius: 3px;
              font-family: 'Consolas', 'Monaco', monospace;
              font-size: 11pt;
            }
            @media print {
              body { print-color-adjust: exact; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Problem Forge - AI Generated Questions</h1>
            <div class="date"><strong>Generated on:</strong> ${currentDate}</div>
          </div>
          <div class="content">
            <p>${cleanContent}</p>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
                  border: '1px solid #4CAF50',
                  background: '#4CAF50',
                  color: 'white',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
                title="PDF로 다운로드 (한글 완벽 지원)"
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
 