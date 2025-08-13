import React, { useState, useRef, useEffect } from 'react';

function ChatSidebar({ chats, selectedChatId, onSelectChat, onNewChat, onEditChatTitle, onDeleteChat, onLogout, userId }) {
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [menuOpenId, setMenuOpenId] = useState(null);
  const menuRef = useRef();

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpenId(null);
      }
    };
    if (menuOpenId !== null) {
      document.addEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpenId]);

  const handleTitleClick = (chat) => {
    setEditingId(chat.id);
    setEditValue(chat.title);
    setMenuOpenId(null);
  };

  const handleEditChange = (e) => setEditValue(e.target.value);

  const handleEditBlur = (chat) => {
    if (editValue.trim() && editValue !== chat.title) {
      onEditChatTitle(chat.id, editValue.trim());
    }
    setEditingId(null);
  };

  const handleEditKeyDown = (e, chat) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEditBlur(chat);
    } else if (e.key === 'Escape') {
      setEditingId(null);
    }
  };

  return (
    <div style={{ width: 220, background: '#222', color: '#fff', height: '100vh', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <div style={{ padding: 16, borderBottom: '1px solid #333', fontWeight: 'bold', fontSize: 18 }}>대화 목록</div>
      <button style={{ margin: 16, padding: 8, background: '#444', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }} onClick={onNewChat}>+ 새 대화</button>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {chats.length === 0 && <div style={{ padding: 16, color: '#aaa' }}>대화가 없습니다.</div>}
        {chats.map(chat => (
          <div
            key={chat.id}
            style={{
              padding: '12px 8px 12px 16px',
              background: chat.id === selectedChatId ? '#444' : 'transparent',
              cursor: 'pointer',
              borderBottom: '1px solid #333',
              fontWeight: chat.id === selectedChatId ? 'bold' : 'normal',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              position: 'relative',
            }}
            onClick={() => onSelectChat(chat.id)}
          >
            {editingId === chat.id ? (
              <input
                value={editValue}
                autoFocus
                onChange={handleEditChange}
                onBlur={() => handleEditBlur(chat)}
                onKeyDown={e => handleEditKeyDown(e, chat)}
                style={{ flex: 1, fontSize: 15, borderRadius: 4, border: '1px solid #888', padding: '2px 6px' }}
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <span
                style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                title="대화 이름"
              >
                {chat.title || `대화 ${chat.id}`}
              </span>
            )}
            {/* 더보기 아이콘 */}
            <span
              style={{ marginLeft: 2, fontSize: 18, cursor: 'pointer', color: '#aaa', padding: 2, borderRadius: 4, transition: 'background 0.2s' }}
              onClick={e => { e.stopPropagation(); setMenuOpenId(menuOpenId === chat.id ? null : chat.id); }}
              title="더보기"
            >
              &#8942;
            </span>
            {/* 드롭다운 메뉴 */}
            {menuOpenId === chat.id && (
              <div
                ref={menuRef}
                style={{
                  position: 'absolute',
                  top: 36,
                  right: 8,
                  background: '#222',
                  border: '1px solid #444',
                  borderRadius: 8,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                  zIndex: 10,
                  minWidth: 120,
                  padding: '6px 0',
                }}
                onClick={e => e.stopPropagation()}
              >
                <div
                  style={{ padding: '8px 18px', cursor: 'pointer', color: '#fff', fontSize: 15, whiteSpace: 'nowrap', transition: 'background 0.2s' }}
                  onClick={() => handleTitleClick(chat)}
                >
                  이름 변경
                </div>
                <div
                  style={{ padding: '8px 18px', cursor: 'pointer', color: '#ff5a5a', fontSize: 15, whiteSpace: 'nowrap', transition: 'background 0.2s' }}
                  onClick={() => { setMenuOpenId(null); onDeleteChat(chat.id); }}
                >
                  삭제
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {/* 로그아웃 영역 */}
      <div style={{ borderTop: '1px solid #333', padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 14, color: '#aaa' }}>로그인: {userId}</span>
        </div>
        <button
          onClick={onLogout}
          style={{
            width: '100%',
            padding: 8,
            background: '#666',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontSize: 14,
            transition: 'background 0.2s'
          }}
          onMouseEnter={e => e.target.style.background = '#777'}
          onMouseLeave={e => e.target.style.background = '#666'}
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}

export default ChatSidebar; 