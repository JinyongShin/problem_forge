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

// 📄 NEW: PDF에서 페이지별로 영어 문제 추출 (병렬 처리)
const extractEnglishProblemsFromPdf = async (file, appendLog, updateProgress) => {
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onload = async (event) => {
      try {
        const pdf = await pdfjsLib.getDocument({ data: event.target.result }).promise;
        const totalPages = pdf.numPages;
        let completedPages = 0;
        
        appendLog(`PDF 파싱 시작 - 파일명: ${file.name}, 총 페이지 수: ${totalPages}`);
        console.log(`[영어문제 추출] 총 페이지 수: ${totalPages}`);
        
        // 📊 진행률 업데이트 함수
        const updatePageProgress = () => {
          completedPages += 1;
          updateProgress(completedPages, totalPages);
          appendLog(`진행률: ${completedPages}/${totalPages} 페이지 완료`);
        };
        
        // 🚀 병렬 처리: 모든 페이지를 동시에 처리
        const pagePromises = [];
        for (let i = 1; i <= totalPages; i++) {
          const pagePromise = processPageParallel(pdf, i, appendLog, updatePageProgress);
          pagePromises.push(pagePromise);
        }
        
        // Promise.allSettled를 사용하여 모든 페이지 처리 완료 대기
        appendLog(`🚀 ${totalPages}개 페이지 병렬 처리 시작...`);
        const pageResults = await Promise.allSettled(pagePromises);
        
        // 결과 수집
        const allProblems = [];
        let successCount = 0;
        let failureCount = 0;
        
        pageResults.forEach((result, index) => {
          const pageNumber = index + 1;
          if (result.status === 'fulfilled') {
            successCount++;
            const pageResult = result.value;
            if (pageResult.problems && pageResult.problems.length > 0) {
              pageResult.problems.forEach(problem => {
                problem.source_page = pageNumber;
                allProblems.push(problem);
              });
              appendLog(`✅ 페이지 ${pageNumber}: ${pageResult.problems.length}개 영어문제 발견`);
            } else {
              appendLog(`⚪ 페이지 ${pageNumber}: 영어문제 없음`);
            }
          } else {
            failureCount++;
            appendLog(`❌ 페이지 ${pageNumber} 처리 실패: ${result.reason}`);
            console.error(`[영어문제 추출] 페이지 ${pageNumber} 실패:`, result.reason);
          }
        });
        
        appendLog(`🎉 PDF 파싱 완료! 성공: ${successCount}, 실패: ${failureCount}, 총 ${allProblems.length}개 영어문제 추출`);
        console.log(`[영어문제 추출 완료] 총 ${allProblems.length}개 영어 문제 발견`);
        
        // 페이지 순서대로 정렬 (source_page 기준)
        allProblems.sort((a, b) => a.source_page - b.source_page);
        
        resolve(allProblems);
      } catch (error) {
        appendLog(`❌ PDF 파싱 실패: ${error.message}`);
        console.error("[영어문제 추출] PDF 처리 오류:", error);
        reject("PDF 파일 처리 중 오류가 발생했습니다.");
      }
    };
    reader.onerror = () => {
      appendLog("❌ 파일 읽기 실패");
      reject("파일을 읽는 중 오류가 발생했습니다.");
    };
    reader.readAsArrayBuffer(file);
  });
};

// 🔄 개별 페이지 처리 함수 (병렬 처리용)
const processPageParallel = async (pdf, pageNumber, appendLog, updatePageProgress) => {
  try {
    appendLog(`📄 페이지 ${pageNumber} 텍스트 추출 시작...`);
    
    const page = await pdf.getPage(pageNumber);
    const text = await page.getTextContent();
    
    // 텍스트 아이템들을 위치 정보를 고려하여 줄바꿈 처리
    let lastY = null;
    let pageLines = [];
    let currentLine = [];
    
    text.items.forEach(item => {
      if (lastY !== null && Math.abs(lastY - item.transform[5]) > 2) {
        if (currentLine.length > 0) {
          pageLines.push(currentLine.join(' '));
          currentLine = [];
        }
      }
      currentLine.push(item.str);
      lastY = item.transform[5];
    });
    
    if (currentLine.length > 0) {
      pageLines.push(currentLine.join(' '));
    }
    
    const pageText = pageLines.join('\n');
    appendLog(`📄 페이지 ${pageNumber} 텍스트 추출 완료 (${pageText.length}자) - 에이전트 호출...`);
    
    // PDF 파싱 에이전트 호출
    const result = await callPdfParsingAgent(pageText, pageNumber, appendLog);
    
    // 진행률 업데이트
    updatePageProgress();
    
    return result;
  } catch (error) {
    // 진행률 업데이트 (실패해도 완료된 것으로 간주)
    updatePageProgress();
    throw new Error(`페이지 ${pageNumber} 처리 실패: ${error.message}`);
  }
};

// 📝 프론트엔드 문제 분리 함수 (백엔드 split_problems 이식)
const splitProblemsOnClient = (text) => {
  if (!text || !text.trim()) {
    return [];
  }

  // 문항 코드 패턴과 Exercises 패턴 사용
  const pattern = /(?=\d{5}-\d{4})|(?=Exercises\s*\n)/gm;
  const rawProblems = text.split(pattern);
  
  const problemDict = {};
  const problemOrder = [];
  let exerciseCounter = 0;
  
  for (let rawProblem of rawProblems) {
    rawProblem = rawProblem.trim();
    if (!rawProblem) continue;
      
    // 문항 코드 추출
    const codeMatch = rawProblem.match(/^(\d{5}-\d{4})/);
    const exercisesMatch = rawProblem.match(/^Exercises/);
    
    if (codeMatch) {
      const code = codeMatch[1];
      if (!problemDict[code] || rawProblem.length > problemDict[code].length) {
        problemDict[code] = rawProblem;
        if (!problemOrder.includes(code)) {
          problemOrder.push(code);
        }
      }
    } else if (exercisesMatch) {
      exerciseCounter += 1;
      const code = `EXERCISE_${exerciseCounter.toString().padStart(3, '0')}`;
      problemDict[code] = rawProblem;
      problemOrder.push(code);
    }
  }
  
  // 실제 문제만 필터링 (충분한 내용이 있는 것)
  const cleanedProblems = [];
  const problemKeywords = ['다음', '아래', 'Dear', '밑줄', '빈칸', '글의', '주어진'];
  
  for (let code of problemOrder) {
    const problem = problemDict[code];
    
    // 최소 200자 이상이고 문제 키워드가 포함된 경우만 실제 문제로 간주
    if (problem.length > 200 && 
        problemKeywords.some(keyword => problem.substring(0, 300).includes(keyword))) {
      cleanedProblems.push(problem);
    }
  }
  
  return cleanedProblems;
};

// 📡 PDF 파싱 에이전트 호출 (별도 앱으로 마운트된 pdf_agent 호출)
const callPdfParsingAgent = async (pageText, pageNumber, appendLog) => {
  const appName = "pdf_agent";
  const sessionId = `pdf-parsing-${pageNumber}-${Date.now()}`; // 페이지별 고유 세션
  
  try {
    appendLog(`페이지 ${pageNumber}: PDF 파싱 에이전트 세션 생성 시작`);
    
    // 1단계: PDF 앱에서 세션 생성 (/pdf 경로 사용)
    try {
      await api.post(`/pdf/apps/${appName}/users/pdf_parser/sessions/${sessionId}`, {
        state: { pageNumber: pageNumber }
      });
      appendLog(`페이지 ${pageNumber}: PDF 파싱 세션 생성 완료 [${sessionId}]`);
    } catch (sessionError) {
      if (sessionError.response?.status !== 409) {
        appendLog(`페이지 ${pageNumber}: PDF 파싱 세션 생성 실패 - ${sessionError.message}`);
      } else {
        appendLog(`페이지 ${pageNumber}: 기존 PDF 파싱 세션 재사용 [${sessionId}]`);
      }
    }
    
    // 2단계: PDF 파싱 에이전트 실행 (/pdf/run_sse 사용)
    const requestBody = {
      appName: appName,
      userId: "pdf_parser", 
      sessionId: sessionId,
      streaming: true,
      newMessage: {
        role: "user",
        parts: [{ text: pageText }]
      }
    };
    
    // 전송되는 텍스트 내용을 콘솔과 로그에 출력
    console.log(`[PDF 텍스트 전송] 페이지 ${pageNumber}:`, {
      길이: `${pageText.length}자`,
      내용: pageText.substring(0, 200) + (pageText.length > 200 ? '...' : ''),
      전체내용: pageText  // 디버깅용으로 전체 내용도 콘솔에 출력
    });
    
    appendLog(`페이지 ${pageNumber}: PDF 파싱 에이전트에 텍스트 전송 (${pageText.length}자)`);
    appendLog(`📝 전송 텍스트 전체 내용:`);
    appendLog("-".repeat(50));
    appendLog(pageText);
    appendLog("-".repeat(50));
    
    return new Promise((resolve, reject) => {
      // 🚀 PDF 앱의 run_sse 엔드포인트 사용
      fetch(`${API_BASE_URL}/pdf/run_sse`, {
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
              appendLog(`페이지 ${pageNumber} PDF 파싱 에이전트 스트리밍 완료`);
              
              // 최종 결과가 없으면 기본 응답 반환
              if (!finalResult) {
                resolve({
                  has_english_problem: false,
                  reason: "에이전트 응답 없음",
                  problems: [],
                  page_number: pageNumber
                });
              } else {
                try {
                  let parsedResult;
                  
                  // 더 안전한 JSON 파싱
                  if (typeof finalResult === 'string') {
                    // JSON 문자열을 정리하고 파싱
                    const cleanedResult = finalResult.trim();
                    if (cleanedResult.startsWith('{') && cleanedResult.endsWith('}')) {
                      parsedResult = JSON.parse(cleanedResult);
                    } else {
                      throw new Error('응답이 유효한 JSON 형식이 아닙니다');
                    }
                  } else if (typeof finalResult === 'object' && finalResult !== null) {
                    parsedResult = finalResult;
                  } else {
                    throw new Error('응답이 객체 형태가 아닙니다');
                  }
                  
                  // 필수 필드 검증
                  if (typeof parsedResult.has_english_problem === 'undefined') {
                    throw new Error('has_english_problem 필드가 없습니다');
                  }
                  
                  parsedResult.page_number = pageNumber;
                  appendLog(`페이지 ${pageNumber} JSON 파싱 성공: ${parsedResult.has_english_problem ? '영어문제 발견' : '영어문제 없음'}`);
                  resolve(parsedResult);
                } catch (parseError) {
                  appendLog(`페이지 ${pageNumber} JSON 파싱 실패: ${parseError.message}`);
                  appendLog(`페이지 ${pageNumber} 원본 응답: ${JSON.stringify(finalResult).substring(0, 200)}...`);
                  resolve({
                    has_english_problem: false,
                    reason: "응답 파싱 실패",
                    problems: [],
                    page_number: pageNumber,
                    raw_response: finalResult
                  });
                }
              }
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
                  
                  // ★ 기존과 동일하게 모든 원본 데이터를 [RAW] 로그로 표시
                  appendLog(`[RAW] ${data}`);
                  
                  // 최종 결과 처리 (기존 로직과 동일)
                  if (parsed.content?.role === "user") {
                    const functionResponse = parsed.content?.parts?.[0]?.functionResponse;
                    if (functionResponse?.response?.result) {
                      finalResult = functionResponse.response.result;
                      appendLog(`페이지 ${pageNumber} PDF 파싱 에이전트 결과 수신: ${JSON.stringify(functionResponse.response.result).substring(0, 200)}...`);
                    }
                  }
                  
                  if (parsed.content?.role === "model") {
                    const resultText = parsed.content?.parts?.[0]?.text;
                    if (resultText) {
                      if (!finalResult || resultText.length > (finalResult?.length || 0)) {
                        finalResult = resultText;
                        appendLog(`페이지 ${pageNumber} PDF 파싱 에이전트 응답: ${resultText.substring(0, 200)}...`);
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
            appendLog(`페이지 ${pageNumber} PDF 파싱 스트리밍 읽기 오류: ${error.message}`);
            reject(error);
          });
        };
        
        readStream();
      }).catch(error => {
        appendLog(`페이지 ${pageNumber} PDF 파싱 에이전트 호출 실패: ${error.message}`);
        reject(error);
      });
    });
    
  } catch (err) {
    console.error("PDF parsing agent call failed:", err);
    appendLog(`페이지 ${pageNumber} PDF 파싱 에이전트 호출 실패: ${err.response?.status || 'Unknown'} - ${err.message}`);
    throw err;
  }
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
  const [pdfProgressMessage, setPdfProgressMessage] = useState(null);

  // 로그 추가 함수 (useEffect에서 사용되므로 먼저 정의)
  const appendLog = (msg) => setLogs(logs => [...logs, `[${new Date().toLocaleString()}] ${msg}`]);
  
  // PDF 진행률 업데이트 함수 (채팅 메시지로 표시)
  const updateProgress = (current, total) => {
    const progressPercentage = Math.round((current / total) * 100);
    const progressMessage = {
      role: 'assistant',
      content: `📄 PDF 파싱 진행 중... ${current}/${total} 페이지 (${progressPercentage}% 완료)`,
      timestamp: new Date().toISOString(),
      isProgress: true
    };
    
    setPdfProgressMessage(progressMessage);
    
    // 완료 시 진행률 메시지 제거
    if (current >= total) {
      setTimeout(() => setPdfProgressMessage(null), 1000);
    }
  };

  useEffect(() => {
    if (isLoggedIn && chats.length === 0) {
      const newSessionId = uuidv4();
      const newChat = { id: 1, title: '새 대화', messages: [], sessionId: newSessionId };
      setChats([newChat]);
      setSelectedChatId(1);
    }
  }, [chats.length, isLoggedIn]);

  // 서버 로그 스트림 연결 (root 계정만)
  useEffect(() => {
    let eventSource = null;
    
    // selectedChat를 useEffect 내에서 직접 계산
    const currentSelectedChat = chats.find(c => c.id === selectedChatId);
    
    if (isLoggedIn && userId === "root" && currentSelectedChat?.sessionId) {
      appendLog("📡 서버 로그 스트림에 연결 중...");
      
      // EventSource를 사용해 서버 로그 스트림에 연결
      eventSource = new EventSource(`${API_BASE_URL}/api/logs/${currentSelectedChat.sessionId}`);
      
      eventSource.onopen = () => {
        appendLog("✅ 서버 로그 스트림 연결 완료");
      };
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'server_log') {
            // 서버 로그를 클라이언트 로그에 추가 (중복 타임스탬프 방지)
            setLogs(logs => [...logs, `[서버] ${data.message}`]);
          } else if (data.type === 'connection') {
            appendLog(`📡 ${data.message}`);
          } else if (data.type === 'disconnect') {
            appendLog(`📡 ${data.message}`);
          }
        } catch (e) {
          // JSON 파싱 실패 시 원본 데이터 표시
          console.warn('Server log parsing failed:', e);
        }
      };
      
      eventSource.onerror = (error) => {
        appendLog("❌ 서버 로그 스트림 연결 오류");
        console.error('Server log stream error:', error);
      };
    }
    
    // 컴포넌트 언마운트나 세션 변경 시 연결 해제
    return () => {
      if (eventSource) {
        eventSource.close();
        appendLog("📡 서버 로그 스트림 연결 해제");
      }
    };
  }, [isLoggedIn, userId, selectedChatId, chats]);

  // 브라우저 종료 시 세션 정리
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (isLoggedIn && chats.length > 0) {
        // sendBeacon을 사용한 안전한 세션 정리
        chats
          .filter(chat => chat.sessionId)
          .forEach(chat => {
            const sessionUrl = `${API_BASE_URL}/apps/agent/users/${userId}/sessions/${chat.sessionId}`;
            
            // sendBeacon으로 DELETE 요청 (브라우저 종료 시에도 전송 보장)
            if (navigator.sendBeacon) {
              // sendBeacon은 POST만 지원하므로 서버에서 처리할 특별한 엔드포인트가 필요
              // 대신 동기적 fetch 사용
              try {
                fetch(sessionUrl, {
                  method: 'DELETE',
                  keepalive: true, // 브라우저 종료 시에도 요청 유지
                  headers: {
                    'Content-Type': 'application/json'
                  }
                });
              } catch (err) {
                console.warn(`세션 삭제 실패 (${chat.sessionId}):`, err);
              }
            } else {
              // sendBeacon 미지원 시 동기적 XMLHttpRequest 사용
              try {
                const xhr = new XMLHttpRequest();
                xhr.open('DELETE', sessionUrl, false); // 동기적 요청
                xhr.setRequestHeader('Content-Type', 'application/json');
                xhr.send();
              } catch (err) {
                console.warn(`세션 삭제 실패 (${chat.sessionId}):`, err);
              }
            }
          });
      }
    };

    // 페이지 가시성 변경 시에도 세션 정리 (모바일 브라우저 대응)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isLoggedIn && chats.length > 0) {
        // 백그라운드로 전환 시 세션 정리
        chats
          .filter(chat => chat.sessionId)
          .forEach(chat => {
            const sessionUrl = `${API_BASE_URL}/apps/agent/users/${userId}/sessions/${chat.sessionId}`;
            
            if (navigator.sendBeacon) {
              fetch(sessionUrl, {
                method: 'DELETE',
                keepalive: true,
                headers: {
                  'Content-Type': 'application/json'
                }
              }).catch(err => 
                console.warn(`세션 삭제 실패 (${chat.sessionId}):`, err)
              );
            }
          });
      }
    };

    if (isLoggedIn) {
      window.addEventListener('beforeunload', handleBeforeUnload);
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isLoggedIn, chats, userId]);

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
        // 📄 NEW: PDF 파일을 페이지별로 처리
        const extractedProblems = await extractEnglishProblemsFromPdf(filesToProcess[0], appendLog, updateProgress);
        if (extractedProblems.length > 0) {
          // 영어 문제가 발견된 경우 - 채팅창에 결과 메시지 추가
          const problemTexts = extractedProblems.map(problem => problem.full_text || problem.question || "문제 텍스트가 없습니다");
          
          // 채팅창에 PDF 파싱 결과 메시지 추가
          const resultMessage = {
            role: 'assistant',
            content: `🎉 PDF에서 총 ${extractedProblems.length}개의 영어 문제를 찾았습니다!\n\n${extractedProblems.map((problem, idx) => `**문제 ${idx + 1} (페이지 ${problem.source_page})**\n${problem.problem_id || 'ID 없음'} - ${problem.problem_type || '타입 미정'}`).join('\n\n')}\n\n아래에서 변환할 문제를 선택해주세요.`,
            timestamp: new Date().toISOString()
          };
          
          const updatedChat = {
            ...selectedChat,
            messages: [...(selectedChat?.messages || []), resultMessage]
          };
          
          setChats(chats.map(c => c.id === selectedChatId ? updatedChat : c));
          
          if (problemTexts.length > 1) {
            setSelectableProblems(problemTexts);
            setSelectedProblems(new Set());
            return;
          } else {
            await processSingleProblem(problemTexts[0]);
            return;
          }
        } else {
          // 영어 문제가 없는 경우 기존 방식으로 처리
          const extractedText = await extractTextFromPdf(filesToProcess[0]);
          fullTextToProcess += `\n\n${extractedText}`;
        }
      } catch (error) {
        setErrorMessage(error);
        setInputValue(textToProcess);
        setAttachedFiles(filesToProcess);
        return;
      }
    }

    // 텍스트 처리: 클라이언트에서 문제 분리 후 선택 UI 제공
    try {
      // 클라이언트에서 문제 분리 시도
      const problems = splitProblemsOnClient(fullTextToProcess);
      
      if (problems.length > 1) {
        // 여러 문제가 있는 경우 선택 UI 표시
        setSelectableProblems(problems);
        setSelectedProblems(new Set());
        appendLog(`📝 텍스트에서 ${problems.length}개 문제를 발견했습니다. 변환할 문제를 선택해주세요.`);
      } else {
        // 단일 문제이거나 분리되지 않은 경우 바로 처리
        await processSingleProblem(fullTextToProcess);
      }
    } catch (err) {
      setErrorMessage("텍스트 처리 중 오류가 발생했습니다.");
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

  const handleLogout = async () => {
    try {
      // 로그아웃 전 모든 활성 세션 정리
      const cleanupPromises = chats
        .filter(chat => chat.sessionId)
        .map(chat => 
          api.delete(`/apps/agent/users/${userId}/sessions/${chat.sessionId}`)
            .catch(err => console.warn(`세션 삭제 실패 (${chat.sessionId}):`, err))
        );
      
      // 모든 세션 정리 완료 대기
      await Promise.allSettled(cleanupPromises);
      
      // 상태 초기화
      setIsLoggedIn(false);
      setUserId("");
      setChats([]);
      setSelectedChatId(null);
      resetInputs();
      setLogs([]);
      
    } catch (err) {
      console.error("로그아웃 중 오류:", err);
      // 오류가 있어도 로그아웃은 진행
      setIsLoggedIn(false);
      setUserId("");
      setChats([]);
      setSelectedChatId(null);
      resetInputs();
      setLogs([]);
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
        onLogout={handleLogout}
        userId={userId}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100vh', position: 'relative' }}>
        <ChatWindow
          chat={selectedChat}
          logs={userId === "root" ? logs : undefined}
          onSaveLogs={userId === "root" ? handleSaveLogs : undefined}
          pdfProgressMessage={pdfProgressMessage}
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
