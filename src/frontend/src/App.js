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
        console.log(`[PDF 추출] 총 페이지 수: ${pdf.numPages}`);
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const text = await page.getTextContent();
          
          // 텍스트 아이템들을 위치 정보를 고려하여 줄바꿈 처리
          let lastY = null;
          let pageLines = [];
          let currentLine = [];
          
          text.items.forEach(item => {
            // Y 좌표가 변경되면 새로운 줄로 인식
            if (lastY !== null && Math.abs(lastY - item.transform[5]) > 2) {
              if (currentLine.length > 0) {
                pageLines.push(currentLine.join(' '));
                currentLine = [];
              }
            }
            currentLine.push(item.str);
            lastY = item.transform[5];
          });
          
          // 마지막 줄 추가
          if (currentLine.length > 0) {
            pageLines.push(currentLine.join(' '));
          }
          
          const pageText = pageLines.join('\n') + '\n';
          textContent += pageText;
          
          // 각 페이지의 처음 200자 로깅
          console.log(`[PDF 추출] 페이지 ${i} 미리보기:`, pageText.substring(0, 200));
          if (i === 1) {
            console.log(`[PDF 추출] 페이지 1의 줄바꿈 개수:`, pageText.split('\n').length - 1);
          }
        }
        
        // 전체 추출된 텍스트 정보
        console.log(`[PDF 추출 완료] 전체 텍스트 길이: ${textContent.length}자`);
        console.log(`[PDF 추출] "Part Ⅲ 테스트편" 포함 여부:`, textContent.includes("Part Ⅲ 테스트편"));
        console.log(`[PDF 추출] "정답과 해설" 포함 여부:`, textContent.includes("정답과 해설"));
        
        // 문항 코드 패턴 찾기
        const codePattern = /\d{5}-\d{4}/g;
        const codes = textContent.match(codePattern);
        if (codes) {
          console.log(`[PDF 추출] 발견된 문항 코드:`, codes.slice(0, 10)); // 처음 10개만
        } else {
          console.log(`[PDF 추출] 문항 코드를 찾을 수 없음`);
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
    
    // 사용자 경험 개선: 전송 버튼 클릭 즉시 입력 필드 클리어
    const textToProcess = inputValue;
    const filesToProcess = [...attachedFiles];
    setInputValue(''); // 즉시 입력창 클리어
    setAttachedFiles([]); // 즉시 첨부파일 클리어
    setErrorMessage(""); // 기존 에러 메시지 클리어
    
    let fullTextToProcess = textToProcess;
    if (filesToProcess.length > 0) {
      try {
        const extractedText = await extractTextFromPdf(filesToProcess[0]);
        fullTextToProcess += `\n\n${extractedText}`;
      } catch (error) {
        setErrorMessage(error);
        return;
      }
    }

    try {
      const res = await api.post('/api/split-problems', { text: fullTextToProcess });
      const problems = res.data.problems || [];
      if (problems.length > 1) {
        setSelectableProblems(problems);
        setSelectedProblems(new Set());
        // 입력 필드는 이미 위에서 클리어됨
      } else {
        await processSingleProblem(fullTextToProcess);
      }
    } catch (err) {
      setErrorMessage("문제 분할 중 오류가 발생했습니다.");
      // 에러 발생 시 입력 내용 복원 (사용자 편의)
      setInputValue(textToProcess);
      setAttachedFiles(filesToProcess);
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
      
      // 서버 로그 스트림 제거 (이전 커밋 방식으로 복원)
      
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
      
      // 2단계: 에이전트 실행 (ADK SSE 스트리밍 방식)
      const requestBody = {
        appName: appName,
        userId: userId,
        sessionId: sessionId,
        streaming: true, // 스트리밍 활성화
        newMessage: {
          role: "user",
          parts: [{ text }]
        }
      };
      
      return new Promise((resolve, reject) => {
        // POST 요청을 위해 fetch 사용 (EventSource는 GET만 지원)
        fetch(`${API_BASE_URL}/run_sse`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream'
          },
          body: JSON.stringify(requestBody)
        }).then(response => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let finalResult = null;
          
          const readStream = () => {
            reader.read().then(({ done, value }) => {
              if (done) {
                appendLog(`스트리밍 완료`);
                resolve(finalResult || "결과를 받지 못했습니다.");
                return;
              }
              
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop(); // 마지막 불완전한 줄 보관
              
              lines.forEach(line => {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6); // 'data: ' 제거
                  if (data.trim() === '[DONE]') {
                    return;
                  }
                  
                  try {
                    const parsed = JSON.parse(data);
                    
                    // ★ 모든 원본 데이터를 로깅 (이전 커밋 방식 복원)
                    appendLog(`[RAW] ${data}`);
                    
                    // 최종 결과 처리
                    // functionResponse 처리를 먼저 확인 (에이전트가 생성한 실제 내용)
                    if (parsed.content?.role === "user") {
                      const functionResponse = parsed.content?.parts?.[0]?.functionResponse;
                      if (functionResponse?.response?.result) {
                        finalResult = functionResponse.response.result;
                        appendLog(`에이전트 변형 문제 수신: ${functionResponse.response.result.substring(0, 100)}...`);
                      }
                    }
                    
                    // text 응답 처리 (functionResponse가 없거나 더 긴 경우에만 사용)
                    if (parsed.content?.role === "model") {
                      const resultText = parsed.content?.parts?.[0]?.text;
                      if (resultText) {
                        // functionResponse가 이미 있고 text가 더 짧으면 덮어쓰지 않음
                        if (!finalResult || resultText.length > finalResult.length) {
                          finalResult = resultText;
                          appendLog(`에이전트 응답 수신: ${resultText.substring(0, 100)}...`);
                        } else {
                          appendLog(`추가 메시지 수신: ${resultText.substring(0, 100)}...`);
                        }
                      }
                    }
                  } catch (parseError) {
                    // JSON 파싱 실패 시 원본 데이터를 로그로 표시
                    if (data.trim() && data !== '[DONE]') {
                      appendLog(`[서버] ${data}`);
                    }
                  }
                }
              });
              
              readStream();
            }).catch(error => {
              appendLog(`스트리밍 읽기 오류: ${error.message}`);
              reject(error);
            });
          };
          
          readStream();
        }).catch(error => {
          appendLog(`에이전트 호출 실패: ${error.message}`);
          reject(error);
        });
      });
      
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

  // 서버 로그 스트림 함수 제거 (이전 커밋 방식으로 복원)

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
