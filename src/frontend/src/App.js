import React, { useState, useEffect } from 'react';
import ChatSidebar from './components/ChatSidebar';
import ChatWindow from './components/ChatWindow';
import ChatInput from './components/ChatInput';
import axios from 'axios';
// uuid 패키지가 필요합니다. (npm install uuid)
import { v4 as uuidv4 } from 'uuid';
import { saveAs } from "file-saver";
import Login from './components/Login';

const API_BASE_URL = process.env.REACT_APP_API_URL;
const api = axios.create({ baseURL: API_BASE_URL });

function App() {
  // 빈 대화로 시작
  const [chats, setChats] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [logs, setLogs] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [userId, setUserId] = useState("");

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
    // 사용자 메시지 + 임시 로딩 메시지 추가
    setChats(chats => chats.map(chat =>
      chat.id === selectedChatId
        ? {
            ...chat,
            messages: [
              ...chat.messages,
              userMessage,
              {
                type: 'loading',
                text: '답변 생성 중...'
                , role: 'assistant',
                timestamp: new Date(),
                isLoading: true
              }
            ],
          }
        : chat
    ));
    setInputValue('');
    setAttachedFiles([]);

    // 실제 환경에 맞게 app_name, user_id, session_id를 관리해야 함
    const appName = "agent"; // agents 폴더명과 일치해야 함
    const sessionId = selectedChat?.sessionId || "test-session";
    const requestBody = {
      app_name: appName,
      user_id: userId,
      session_id: sessionId,
      new_message: {
        role: "user",
        parts: [{ text }]
      },
      streaming: false
    };
    // [로그 표시/저장 기능] 요청 로그
    appendLog(`요청: ${JSON.stringify(requestBody)}`);

    // /run 호출을 함수로 분리
    const callRun = async () => {
      const res = await api.post('/run', requestBody);
      appendLog(`응답: ${JSON.stringify(res.data)}`);
      if (!Array.isArray(res.data)) {
        setErrorMessage("서버에서 올바른 응답을 받지 못했습니다. (Event 배열 아님)");
        return;
      }
      if (res.data.length === 0) {
        setErrorMessage("서버에서 이벤트가 반환되지 않았습니다. 세션 또는 agent 구성을 확인하세요.");
        return;
      }

      // master_agent functionResponse.result 추출
      let functionResultText = null;
      for (const ev of res.data) {
        if (ev.content && Array.isArray(ev.content.parts)) {
          for (const part of ev.content.parts) {
            if (
              part.functionResponse &&
              part.functionResponse.name === "master_agent" &&
              part.functionResponse.response &&
              part.functionResponse.response.result
            ) {
              functionResultText = part.functionResponse.response.result;
              break;
            }
          }
        }
        if (functionResultText) break;
      }

      // 일반 assistant 답변 추출
      const lastModelEvent = [...res.data].reverse().find(
        ev =>
          ev.content &&
          ev.content.role === "model" &&
          Array.isArray(ev.content.parts) &&
          ev.content.parts[0] &&
          ev.content.parts[0].text
      );
      const assistantText = lastModelEvent?.content?.parts?.[0]?.text || "답변을 가져오지 못했습니다. (assistant 메시지 없음)";

      // 임시 로딩 메시지 제거 후 실제 답변 추가
      setChats(chats => chats.map(chat => {
        if (chat.id !== selectedChatId) return chat;
        let newMessages = chat.messages.filter(m => !m.isLoading);
        newMessages.push({
          type: 'text',
          text: functionResultText || assistantText,
          files: [],
          timestamp: new Date(),
          role: 'assistant',
        });
        return { ...chat, messages: newMessages };
      }));
      setErrorMessage("");
    };

    try {
      await callRun();
    } catch (err) {
      // [로그 표시/저장 기능] 에러 로그
      appendLog(`에러: ${err?.message || err}`);
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
            await api.post(`/apps/${appName}/users/${userId}/sessions/${sessionId}`, {});
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
        await api.delete(`/apps/agent/users/test_user/sessions/${chatToDelete.sessionId}`);
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

  const appendLog = (msg) => setLogs(logs => [...logs, `[${new Date().toLocaleString()}] ${msg}`]);

  const handleSaveLogs = () => {
    const blob = new Blob([logs.join('\n')], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `chat_logs_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`);
  };

  const handleLogin = async (id, pw) => {
    try {
      setLoginError("");
      const res = await api.post('/api/login', { id, pw });
      if (res.data.success) {
        setIsLoggedIn(true);
        setUserId(id);
      } else {
        setLoginError(res.data.error || "로그인 실패");
      }
    } catch (err) {
      setLoginError(err.response?.data?.error || "서버 오류: 로그인 실패");
    }
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} errorMessage={loginError} />;
  }

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
          <ChatWindow
            chat={selectedChat}
            logs={userId === "root" ? logs : undefined}
            onSaveLogs={userId === "root" ? handleSaveLogs : undefined}
          />
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
        </div>
      </div>
    </div>
  );
}

export default App;
