import React, { useState } from 'react';

function TextInput({ onSubmit }) {
  const [value, setValue] = useState('');

  const handleChange = (e) => setValue(e.target.value);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (value.trim() === '') return;
    // 간단한 XSS 방지
    const sanitized = value.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    onSubmit(sanitized);
    setValue('');
  };

  return (
    <form onSubmit={handleSubmit}>
      <textarea
        value={value}
        onChange={handleChange}
        placeholder="문제를 입력하세요"
        rows={6}
        style={{ width: '100%' }}
      />
      <button type="submit">입력</button>
    </form>
  );
}

export default TextInput; 