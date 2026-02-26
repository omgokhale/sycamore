import React, { useState } from 'react';

function InputForm({ onSubmit, loading, error }) {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (prompt.trim()) {
      onSubmit(prompt);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="floating-input-container">
      <form className="floating-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="floating-input"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything"
          autoFocus
        />

        {loading && (
          <div className="inline-spinner">
            <div className="spinner-small"></div>
          </div>
        )}

        <button
          type="submit"
          className="floating-submit-button"
          disabled={loading || !prompt.trim()}
        >
          <img src="/arrow--right.svg" alt="Submit" />
        </button>
      </form>

      {error && <div className="floating-error">{error}</div>}
    </div>
  );
}

export default InputForm;
