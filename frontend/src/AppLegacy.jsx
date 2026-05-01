import React, { useState } from 'react';
import InputForm from './components/InputForm';
import TokenTreeGraphLegacy from './components/TokenTreeGraphLegacy';
import AsciiAnimation from './components/AsciiAnimation';
import { generateTree } from './services/api';
import './styles/AppLegacy.css';

function AppLegacy() {
  const [treeData, setTreeData] = useState(null);
  const [firstCompletion, setFirstCompletion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (prompt) => {
    setLoading(true);
    setError(null);

    try {
      const result = await generateTree({
        prompt,
        num_runs: 30,
        top_logprobs: 3
      });
      setTreeData(result.tree);
      setFirstCompletion(result.first_completion);
    } catch (err) {
      setError(err.message || 'Failed to generate tree');
      console.error('Error generating tree:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-fullscreen">
      <InputForm
        onSubmit={handleSubmit}
        loading={loading}
        error={error}
      />
      <div className="visualization-container">
        {treeData ? (
          <TokenTreeGraphLegacy data={treeData} firstCompletion={firstCompletion} />
        ) : (
          <div className="empty-state">
            <AsciiAnimation />
          </div>
        )}
      </div>
    </div>
  );
}

export default AppLegacy;
