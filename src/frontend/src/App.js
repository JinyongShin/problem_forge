import React, { useState, useEffect } from 'react';
import ChatSidebar from './components/ChatSidebar';
import ChatWindow from './components/ChatWindow';
import ChatInput from './components/ChatInput';

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
      const newChat = { id: 1, title: '새 대화', messages: [] };
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
    const newChat = { id: newId, title: '새 대화', messages: [] };
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
  const handleUnifiedInput = ({ text, files }) => {
    if (!text.trim() && (!files || files.length === 0)) return;
    let type = 'text';
    if (files && files.length > 0) {
      const fileTypes = files.map(f => f.type);
      if (fileTypes.every(t => t === 'application/pdf')) type = 'pdf';
      else if (fileTypes.every(t => t.startsWith('image/'))) type = 'image';
      else type = 'mixed';
    }
    const message = {
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
              message,
            ],
          }
        : chat
    ));
    setInputValue('');
    setAttachedFiles([]);
  };

  // 대화 이름(타이틀) 수정 핸들러
  const handleEditChatTitle = (id, newTitle) => {
    setChats(chats => chats.map(chat =>
      chat.id === id ? { ...chat, title: newTitle } : chat
    ));
  };

  // 대화 삭제 핸들러
  const handleDeleteChat = (id) => {
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
      <ChatSidebar
        chats={chats}
        selectedChatId={selectedChatId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onEditChatTitle={handleEditChatTitle}
        onDeleteChat={handleDeleteChat}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <ChatWindow chat={selectedChat} />
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
  );
}

export default App;
