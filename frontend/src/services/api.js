/**
 * API service for communicating with the Flask backend.
 */

const API_BASE_URL = '/api';

/**
 * Call backend API to generate token tree.
 *
 * @param {Object} params - Parameters for tree generation
 * @param {string} params.prompt - User prompt
 * @param {number} params.num_runs - Number of completions to generate
 * @param {number} params.top_logprobs - Number of alternative tokens to track
 * @returns {Promise<Object>} Response with tree data
 */
export async function generateTree({ prompt, num_runs, top_logprobs }) {
  const response = await fetch(`${API_BASE_URL}/generate-tree`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      num_runs,
      top_logprobs
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to generate tree');
  }

  return await response.json();
}

/**
 * Health check for backend.
 *
 * @returns {Promise<Object>} Health status
 */
export async function checkHealth() {
  const response = await fetch(`${API_BASE_URL}/health`);
  return await response.json();
}
