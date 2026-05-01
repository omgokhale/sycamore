import React, { useState, useEffect } from 'react';
import InputForm from './components/InputForm';
import WordTreeGraph from './components/WordTreeGraph';
import TokenTreeGraphLegacy from './components/TokenTreeGraphLegacy';
import AsciiAnimation from './components/AsciiAnimation';
import { generateTree } from './services/api';
import './styles/App.css';

const isLegacy = window.location.pathname.startsWith('/legacy');
if (isLegacy) document.body.classList.add('legacy');

const GraphComponent = isLegacy ? TokenTreeGraphLegacy : WordTreeGraph;

function App() {
  const [treeData, setTreeData] = useState(null);
  const [firstCompletion, setFirstCompletion] = useState(null);
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
      setFirstCompletion(result.first_completion);
    } catch (err) {
      setError(err.message || 'Failed to generate tree');
      console.error('Error generating tree:', err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate tree for "Hello, world." on startup
  useEffect(() => {
    handleSubmit('Hello, world.');
  }, []); // Empty dependency array = runs once on mount

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
          <GraphComponent data={treeData} firstCompletion={firstCompletion} />
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
