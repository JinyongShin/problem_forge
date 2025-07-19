import React, { useState, useEffect } from 'react';
import ChatSidebar from './components/ChatSidebar';
import ChatWindow from './components/ChatWindow';
import ChatInput from './components/ChatInput';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { saveAs } from "file-saver";
import Login from './components/Login';
import * as pdfjsLib from 'pdfjs-dist';

// pdfjs-dist의 워커 설정 - 로컬 파일 사용 (더 안정적이고 빠름)
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

const API_BASE_URL = process.env.REACT_APP_API_URL;
const api = axios.create({ baseURL: API_BASE_URL });

// PDF 파일에서 텍스트를 추출하는 헬퍼 함수
const extractTextFromPdf = async (file) => {
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onload = async (event) => {
      try {
        const pdf = await pdfjsLib.getDocument({ data: event.target.result }).promise;
        let textContent = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const text = await page.getTextContent();
          textContent += text.items.map(item => item.str).join(' ') + '\n';
        }
        resolve(textContent);
      } catch (error) {
        console.error("PDF 파싱 오류:", error);
        reject("PDF 파일 처리 중 오류가 발생했습니다.");
      }
    };
    reader.onerror = (error) => {
      console.error("파일 읽기 오류:", error);
      reject("파일을 읽는 중 오류가 발생했습니다.");
    };
    reader.readAsArrayBuffer(file);
  });
};

function App() {
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
    if (isLoggedIn && chats.length === 0) {
      const newSessionId = uuidv4();
      const newChat = { id: 1, title: '새 대화', messages: [], sessionId: newSessionId };
      setChats([newChat]);
      setSelectedChatId(1);
    }
  }, [chats.length, isLoggedIn]);

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
    if (!isPdf) {
      setErrorMessage("PDF 파일만 지원합니다.");
      return;
    }
    // 현재는 단일 파일만 지원
    setAttachedFiles([file]);
    setErrorMessage("");
  };

  // 입력 통합 핸들러 (클라이언트 사이드 PDF 처리)
  const handleUnifiedInput = async ({ text, files }) => {
    if (!text.trim() && (!files || files.length === 0)) return;

    const userMessage = {
      type: files.length > 0 ? 'file' : 'text',
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
                text: '답변 생성 중...',
                role: 'assistant',
                timestamp: new Date(),
                isLoading: true
              }
            ],
          }
        : chat
    ));
    setInputValue('');
    setAttachedFiles([]);

    let finalText = text;

    // PDF 파일 처리
    if (files && files.length > 0) {
      const pdfFile = files.find(f => f.type === "application/pdf" || f.name.endsWith(".pdf"));
      if (pdfFile) {
        try {
          console.log("PDF 파일 처리 시작:", pdfFile.name);
          const extractedText = await extractTextFromPdf(pdfFile);
          console.log("추출된 PDF 텍스트 길이:", extractedText.length);
          console.log("추출된 PDF 텍스트 일부:", extractedText.substring(0, 200));
          finalText = `${text}\n\n--- 첨부된 PDF 내용 ---\n${extractedText}`;
        } catch (error) {
          setErrorMessage(error);
          // 로딩 메시지 제거
          setChats(chats => chats.map(chat =>
            chat.id === selectedChatId ? { ...chat, messages: chat.messages.filter(m => !m.isLoading) } : chat
          ));
          return;
        }
      }
    }

    const appName = "agent";
    const sessionId = selectedChat?.sessionId || "test-session";
    const requestBody = {
      app_name: appName,
      user_id: userId,
      session_id: sessionId,
      new_message: {
        role: "user",
        parts: [{ text: finalText }]
      },
      streaming: false
    };
    appendLog(`요청: ${JSON.stringify(requestBody)}`);

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

      const lastModelEvent = [...res.data].reverse().find(
        ev =>
          ev.content &&
          ev.content.role === "model" &&
          Array.isArray(ev.content.parts) &&
          ev.content.parts[0] &&
          ev.content.parts[0].text
      );
      const assistantText = lastModelEvent?.content?.parts?.[0]?.text || "답변을 가져오지 못했습니다. (assistant 메시지 없음)";

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
      appendLog(`에러: ${err?.message || err}`);
      if (err.response) {
        console.error("[POST /run] error response:", err.response);
        if (err.response.data) {
          console.error("[POST /run] error response data:", err.response.data);
        }
      }
      if (err.response && err.response.data && err.response.data.detail) {
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

  const handleEditChatTitle = (id, newTitle) => {
    setChats(chats => chats.map(chat =>
      chat.id === id ? { ...chat, title: newTitle } : chat
    ));
  };

  const handleDeleteChat = async (id) => {
    const chatToDelete = chats.find(chat => chat.id === id);
    if (chatToDelete && chatToDelete.sessionId) {
      try {
        await api.delete(`/apps/agent/users/${userId}/sessions/${chatToDelete.sessionId}`);
      } catch (err) {
        console.error("세션 삭제 실패:", err);
      }
    }
    setChats(chats => {
      const filtered = chats.filter(chat => chat.id !== id);
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