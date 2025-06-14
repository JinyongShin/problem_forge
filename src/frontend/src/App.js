import React, { useState, useEffect } from 'react';
import ChatSidebar from './components/ChatSidebar';
import ChatWindow from './components/ChatWindow';
import ChatInput from './components/ChatInput';
import axios from 'axios';
// uuid 패키지가 필요합니다. (npm install uuid)
import { v4 as uuidv4 } from 'uuid';

// 로그 버퍼 및 저장 함수 추가
let logBuffer = [];

function saveLogToFile() {
  const blob = new Blob([logBuffer.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'frontend_log.txt';
  a.click();
  URL.revokeObjectURL(url);
}

const origConsoleLog = console.log;
console.log = function(...args) {
  logBuffer.push(
    args.map(arg =>
      typeof arg === 'object' && arg !== null
        ? JSON.stringify(arg, null, 2)
        : String(arg)
    ).join(' ')
  );
  origConsoleLog.apply(console, args);
};

function App() {
  // 빈 대화로 시작
  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  // 앱 최초 렌더링 시 새 대화 자동 생성 및 선택
  useEffect(() => {
    if (chats.length === 0) {
      const newSessionId = uuidv4();
      const newChat = { id: 1, title: '새 대화', messages: [], sessionId: newSessionId };
      setChats([newChat]);
      setSelectedChatId(1);
    }
  }, [chats.length]);

  const selectedChat = chats.find(c => c.id === selectedChatId);

  const handleSelectChat = (id) => {
    setSelectedChatId(id);
    setInputValue('');
    setAttachedFiles([]);
  };

  const handleNewChat = () => {
    const newId = chats.length > 0 ? Math.max(...chats.map(c => c.id)) + 1 : 1;
    const newSessionId = uuidv4();
    const newChat = { id: newId, title: '새 대화', messages: [], sessionId: newSessionId };
    setChats([newChat, ...chats]);
    setSelectedChatId(newId);
    setInputValue('');
    setAttachedFiles([]);
  };

  const handleInputChange = (val) => setInputValue(val);

  const handleAttachFile = (file) => {
    const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");
    const isImage = file.type.startsWith("image/");
    if (!isPdf && !isImage) {
      setErrorMessage("PDF 또는 이미지 파일만 지원합니다.");
      return;
    }
    setAttachedFiles(files => [...files, file]);
    setErrorMessage("");
  };

  // 입력 통합 핸들러
  const handleUnifiedInput = async ({ text, files }) => {
    if (!text.trim() && (!files || files.length === 0)) return;
    let type = 'text';
    if (files && files.length > 0) {
      const fileTypes = files.map(f => f.type);
      if (fileTypes.every(t => t === 'application/pdf')) type = 'pdf';
      else if (fileTypes.every(t => t.startsWith('image/'))) type = 'image';
      else type = 'mixed';
    }
    const userMessage = {
      type,
      text,
      files,
      timestamp: new Date(),
      role: 'user',
    };
    setChats(chats => chats.map(chat =>
      chat.id === selectedChatId
        ? {
            ...chat,
            messages: [
              ...chat.messages,
              userMessage,
            ],
          }
        : chat
    ));
    setInputValue('');
    setAttachedFiles([]);

    // 실제 환경에 맞게 app_name, user_id, session_id를 관리해야 함
    const appName = "agent"; // agents 폴더명과 일치해야 함
    const userId = "test_user";
    const sessionId = selectedChat?.sessionId || "test-session";
    const requestBody = {
      appName: appName,
      userId: userId,
      sessionId: sessionId,
      newMessage: {
        role: "user",
        parts: [{ text }]
      },
      streaming: false
    };
    console.log("[POST /run] request body:", requestBody);

    // /run 호출을 함수로 분리
    const callRun = async () => {
      const res = await axios.post('/run', requestBody);
      console.log("[서버 응답]:", res.data);
      if (!Array.isArray(res.data)) {
        setErrorMessage("서버에서 올바른 응답을 받지 못했습니다. (Event 배열 아님)");
        console.log("서버 응답:", res.data);
        return;
      }
      if (res.data.length === 0) {
        setErrorMessage("서버에서 이벤트가 반환되지 않았습니다. 세션 또는 agent 구성을 확인하세요.");
        return;
      }
      // role이 'model'인 마지막 메시지 추출 (content 내부)
      const lastModelEvent = [...res.data].reverse().find(
        ev =>
          ev.content &&
          ev.content.role === "model" &&
          Array.isArray(ev.content.parts) &&
          ev.content.parts[0] &&
          ev.content.parts[0].text
      );
      const assistantText = lastModelEvent?.content?.parts?.[0]?.text || "답변을 가져오지 못했습니다. (assistant 메시지 없음)";
      const assistantMessage = {
        type: 'text',
        text: assistantText,
        files: [],
        timestamp: new Date(),
        role: 'assistant',
      };
      // functionResponse.result가 있으면 추가로 메시지로 출력
      let functionResultText = null;
      for (const ev of res.data) {
        if (ev.content && Array.isArray(ev.content.parts)) {
          for (const part of ev.content.parts) {
            if (part.functionResponse && part.functionResponse.response && part.functionResponse.response.result) {
              functionResultText = part.functionResponse.response.result;
              break;
            }
          }
        }
        if (functionResultText) break;
      }
      setChats(chats => chats.map(chat => {
        if (chat.id !== selectedChatId) return chat;
        let newMessages = [...chat.messages, assistantMessage];
        if (functionResultText) {
          newMessages.push({
            type: 'text',
            text: functionResultText,
            files: [],
            timestamp: new Date(),
            role: 'assistant',
          });
        }
        return { ...chat, messages: newMessages };
      }));
      setErrorMessage("");
    };

    try {
      await callRun();
    } catch (err) {
      if (err.response) {
        console.error("[POST /run] error response:", err.response);
        if (err.response.data) {
          console.error("[POST /run] error response data:", err.response.data);
        }
      }
      if (err.response && err.response.data && err.response.data.detail) {
        // 세션이 없을 때 자동 생성 후 재시도
        if (err.response.data.detail === "Session not found") {
          try {
            console.log("[POST] 세션이 없어 자동 생성 시도");
            await axios.post(`/apps/${appName}/users/${userId}/sessions/${sessionId}`, {});
            await callRun();
            return;
          } catch (sessionErr) {
            setErrorMessage("세션 자동 생성에 실패했습니다. 서버 환경을 확인하세요.");
            console.error("[POST] 세션 생성 실패:", sessionErr);
            return;
          }
        }
        setErrorMessage(`서버 오류: ${err.response.data.detail}`);
      } else if (err.response && err.response.status === 404) {
        setErrorMessage("세션 또는 agent가 존재하지 않습니다. 서버 환경을 확인하세요.");
      } else if (err.response && err.response.status === 422) {
        setErrorMessage("서버가 요청을 처리할 수 없습니다 (422). 콘솔의 에러 응답을 확인하세요.");
      } else {
        setErrorMessage("문제 생성 중 알 수 없는 오류가 발생했습니다.");
      }
    }
  };

  // 대화 이름(타이틀) 수정 핸들러
  const handleEditChatTitle = (id, newTitle) => {
    setChats(chats => chats.map(chat =>
      chat.id === id ? { ...chat, title: newTitle } : chat
    ));
  };

  // 대화 삭제 핸들러
  const handleDeleteChat = async (id) => {
    const chatToDelete = chats.find(chat => chat.id === id);
    if (chatToDelete && chatToDelete.sessionId) {
      try {
        await axios.delete(`/apps/agent/users/test_user/sessions/${chatToDelete.sessionId}`);
      } catch (err) {
        console.error("세션 삭제 실패:", err);
      }
    }
    setChats(chats => {
      const filtered = chats.filter(chat => chat.id !== id);
      // 삭제된 대화가 선택된 상태였다면, 다른 대화로 자동 선택
      if (selectedChatId === id) {
        setSelectedChatId(filtered[0]?.id || null);
      }
      return filtered;
    });
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#eee' }}>
      <div style={{
        width: 220,
        minWidth: 200,
        background: '#222',
        borderRight: '1px solid #333',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        left: 0,
        top: 0,
        zIndex: 2,
      }}>
        <ChatSidebar
          chats={chats}
          selectedChatId={selectedChatId}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
          onEditChatTitle={handleEditChatTitle}
          onDeleteChat={handleDeleteChat}
        />
      </div>
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        height: '100vh',
        position: 'relative',
      }}>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          <ChatWindow chat={selectedChat} />
        </div>
        <div style={{
          position: 'sticky',
          bottom: 0,
          background: '#fafbfc',
          zIndex: 2,
          borderTop: '1px solid #eee',
        }}>
          <ChatInput
            value={inputValue}
            onChange={handleInputChange}
            onSend={() => handleUnifiedInput({ text: inputValue, files: attachedFiles })}
            onAttachFile={handleAttachFile}
            attachedFiles={attachedFiles}
            errorMessage={errorMessage}
          />
          <button onClick={saveLogToFile} style={{ margin: '8px', alignSelf: 'flex-end' }}>로그 저장</button>
        </div>
      </div>
    </div>
  );
}

export default App;
