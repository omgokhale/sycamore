import React from 'react';

function LoadingSpinner() {
  return (
    <div className="loading-container">
      <div className="spinner"></div>
      <p className="loading-text">Generating token tree...</p>
      <p className="loading-subtext">This may take a moment as we generate multiple completions</p>
    </div>
  );
}

export default LoadingSpinner;
