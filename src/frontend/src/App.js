import React, { useState, useEffect } from 'react';
import ChatSidebar from './components/ChatSidebar';
import ChatWindow from './components/ChatWindow';
import ChatInput from './components/ChatInput';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { saveAs } from "file-saver";
import Login from './components/Login';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

const API_BASE_URL = process.env.REACT_APP_API_URL;
const api = axios.create({ baseURL: API_BASE_URL });

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
        reject("PDF 파일 처리 중 오류가 발생했습니다.");
      }
    };
    reader.onerror = () => reject("파일을 읽는 중 오류가 발생했습니다.");
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
  const [selectableProblems, setSelectableProblems] = useState([]);
  const [selectedProblems, setSelectedProblems] = useState(new Set());

  useEffect(() => {
    if (isLoggedIn && chats.length === 0) {
      const newSessionId = uuidv4();
      const newChat = { id: 1, title: '새 대화', messages: [], sessionId: newSessionId };
      setChats([newChat]);
      setSelectedChatId(1);
    }
  }, [chats.length, isLoggedIn]);

  const selectedChat = chats.find(c => c.id === selectedChatId);

  const resetInputs = () => {
    setInputValue('');
    setAttachedFiles([]);
    setSelectableProblems([]);
    setSelectedProblems(new Set());
    setErrorMessage("");
  };

  const handleSelectChat = (id) => {
    setSelectedChatId(id);
    resetInputs();
  };

  const handleNewChat = () => {
    const newId = chats.length > 0 ? Math.max(...chats.map(c => c.id)) + 1 : 1;
    const newSessionId = uuidv4();
    const newChat = { id: newId, title: '새 대화', messages: [], sessionId: newSessionId };
    setChats([newChat, ...chats]);
    setSelectedChatId(newId);
    resetInputs();
  };

  const handleProblemSelection = (index) => {
    const newSelection = new Set(selectedProblems);
    if (newSelection.has(index)) newSelection.delete(index);
    else newSelection.add(index);
    setSelectedProblems(newSelection);
  };

  const handleSelectAll = () => {
    setSelectedProblems(new Set(selectableProblems.map((_, i) => i)));
  };

  const handleDeselectAll = () => {
    setSelectedProblems(new Set());
  };

  const analyzeInputAndShowSelection = async () => {
    if (!inputValue.trim() && attachedFiles.length === 0) return;
    
    let textToProcess = inputValue;
    if (attachedFiles.length > 0) {
      try {
        const extractedText = await extractTextFromPdf(attachedFiles[0]);
        textToProcess += `\n\n${extractedText}`;
      } catch (error) {
        setErrorMessage(error);
        return;
      }
    }

    try {
      const res = await api.post('/api/split-problems', { text: textToProcess });
      const problems = res.data.problems || [];
      if (problems.length > 1) {
        setSelectableProblems(problems);
        setSelectedProblems(new Set());
        setInputValue('');
        setAttachedFiles([]);
      } else {
        await processSingleProblem(textToProcess);
      }
    } catch (err) {
      setErrorMessage("문제 분할 중 오류가 발생했습니다.");
    }
  };

  const processProblems = async (isConvertAll = false) => {
    const problemsToRun = isConvertAll
      ? selectableProblems
      : selectableProblems.filter((_, index) => selectedProblems.has(index));

    if (problemsToRun.length === 0) {
      setErrorMessage("변환할 문제를 선택하세요.");
      return;
    }

    const userMessageText = `선택된 ${problemsToRun.length}개의 문제에 대한 변형을 요청했습니다.`;
    addMessage(userMessageText, 'user');
    addMessage('답변 생성 중...', 'assistant', true);

    const results = await Promise.all(
      problemsToRun.map(problem => runSingleAgentCall(problem))
    );

    const formattedResults = results.map((res, i) => 
      `--- 문제 ${i + 1} 변형 결과 ---\n\n${res || "결과를 생성하지 못했습니다."}`
    ).join('\n\n');
    
    updateLastMessage(formattedResults);
    resetInputs();
  };

  const processSingleProblem = async (text) => {
    addMessage(text, 'user');
    addMessage('답변 생성 중...', 'assistant', true);
    const resultText = await runSingleAgentCall(text);
    updateLastMessage(resultText || "결과를 생성하지 못했습니다.");
    resetInputs();
  };

  const runSingleAgentCall = async (text) => {
    const appName = "agent";
    const sessionId = selectedChat?.sessionId || uuidv4();
    
    try {
      appendLog(`에이전트 호출 시작 - 사용자: ${userId}, 세션: ${sessionId}`);
      appendLog(`요청 내용: ${text.substring(0, 100)}...`);
      
      // 1단계: 세션 생성 (ADK 문서에 따른 필수 단계)
      try {
        await api.post(`/apps/${appName}/users/${userId}/sessions/${sessionId}`, {
          state: {}
        });
        appendLog(`세션 생성 완료: ${sessionId}`);
      } catch (sessionError) {
        // 세션이 이미 존재하는 경우는 무시
        if (sessionError.response?.status !== 409) {
          appendLog(`세션 생성 실패: ${sessionError.message}`);
        } else {
          appendLog(`기존 세션 사용: ${sessionId}`);
        }
      }
      
      // 2단계: 에이전트 실행 (ADK 표준 방식)
      const requestBody = {
        appName: appName,  // ADK 문서에 따른 파라미터명
        userId: userId,
        sessionId: sessionId,
        newMessage: {
          role: "user",
          parts: [{ text }]
        }
      };
      
      const res = await api.post('/run', requestBody);
      appendLog(`에이전트 응답 수신 완료`);
      
      const lastModelEvent = [...res.data].reverse().find(ev => ev.content?.role === "model");
      const resultText = lastModelEvent?.content?.parts?.[0]?.text || null;
      
      if (resultText) {
        appendLog(`에이전트 응답 성공: ${resultText.substring(0, 100)}...`);
      } else {
        appendLog(`에이전트 응답이 비어있습니다.`);
      }
      
      return resultText;
    } catch (err) {
      console.error("Agent call failed:", err);
      appendLog(`에이전트 호출 실패: ${err.response?.status || 'Unknown'} - ${err.message}`);
      return "에이전트 호출 중 오류가 발생했습니다.";
    }
  };

  const addMessage = (text, role, isLoading = false) => {
    const newMessage = {
      type: isLoading ? 'loading' : 'text',
      text,
      role,
      timestamp: new Date(),
      isLoading,
    };
    setChats(chats => chats.map(chat =>
      chat.id === selectedChatId ? { ...chat, messages: [...chat.messages, newMessage] } : chat
    ));
  };

  const updateLastMessage = (text) => {
    setChats(chats => chats.map(chat => {
      if (chat.id !== selectedChatId) return chat;
      const updatedMessages = chat.messages.filter(m => !m.isLoading);
      updatedMessages.push({ type: 'text', text, role: 'assistant', timestamp: new Date() });
      return { ...chat, messages: updatedMessages };
    }));
  };
  
  const handleEditChatTitle = (id, newTitle) => {
    setChats(chats => chats.map(chat =>
      chat.id === id ? { ...chat, title: newTitle } : chat
    ));
  };

  // Other handlers (delete, login, etc.) remain the same...
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
      <ChatSidebar
        chats={chats}
        selectedChatId={selectedChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onEditChatTitle={handleEditChatTitle}
        onDeleteChat={handleDeleteChat}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh', position: 'relative' }}>
        <ChatWindow
          chat={selectedChat}
          logs={userId === "root" ? logs : undefined}
          onSaveLogs={userId === "root" ? handleSaveLogs : undefined}
        />
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={analyzeInputAndShowSelection}
          onAttachFile={(file) => setAttachedFiles([file])}
          attachedFiles={attachedFiles}
          errorMessage={errorMessage}
          selectableProblems={selectableProblems}
          selectedProblems={selectedProblems}
          onProblemSelection={handleProblemSelection}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onConvertSelected={processProblems}
          onCancelSelection={resetInputs}
        />
      </div>
    </div>
  );
}

export default App;
