import React, { useState } from 'react';

function Login({ onLogin, errorMessage }) {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(id, pw);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
      <form onSubmit={handleSubmit} style={{ background: '#fff', padding: 32, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', minWidth: 320 }}>
        <h2 style={{ marginBottom: 24 }}>로그인</h2>
        <div style={{ marginBottom: 16 }}>
          <input
            type="text"
            placeholder="아이디"
            value={id}
            onChange={e => setId(e.target.value)}
            style={{ width: '100%', padding: 8, fontSize: 16 }}
            autoFocus
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <input
            type="password"
            placeholder="비밀번호"
            value={pw}
            onChange={e => setPw(e.target.value)}
            style={{ width: '100%', padding: 8, fontSize: 16 }}
          />
        </div>
        {errorMessage && <div style={{ color: 'red', marginBottom: 16 }}>{errorMessage}</div>}
        <button type="submit" style={{ width: '100%', padding: 10, fontSize: 16, background: '#222', color: '#fff', border: 'none', borderRadius: 4 }}>로그인</button>
      </form>
    </div>
  );
}

export default Login; 