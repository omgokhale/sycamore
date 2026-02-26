import React, { useState } from 'react';
import InputForm from './components/InputForm';
import TokenTreeGraph from './components/TokenTreeGraph';
import AsciiAnimation from './components/AsciiAnimation';
import { generateTree } from './services/api';
import './styles/App.css';

function App() {
  const [treeData, setTreeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (prompt) => {
    setLoading(true);
    setError(null);

    try {
      // Hardcoded values: num_runs=30, top_logprobs=3
      const result = await generateTree({
        prompt,
        num_runs: 30,
        top_logprobs: 3
      });
      setTreeData(result.tree);
    } catch (err) {
      setError(err.message || 'Failed to generate tree');
      console.error('Error generating tree:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-fullscreen">
      {/* Floating input at top center */}
      <InputForm
        onSubmit={handleSubmit}
        loading={loading}
        error={error}
      />

      {/* Full screen visualization */}
      <div className="visualization-container">
        {treeData ? (
          <TokenTreeGraph data={treeData} />
        ) : (
          <div className="empty-state">
            <AsciiAnimation />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
