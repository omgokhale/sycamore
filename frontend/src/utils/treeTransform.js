/**
 * Utility functions for transforming tree data structures.
 */

/**
 * Transform hierarchical tree structure into D3-compatible format.
 * Converts nested tree to flat arrays of nodes and links.
 *
 * @param {Object} root - Root node of the tree
 * @returns {Object} Object with nodes and links arrays
 */
export function transformTreeToD3Format(root) {
  const nodes = [];
  const links = [];

  /**
   * Recursively traverse the tree and build flat arrays.
   *
   * @param {Object} node - Current node
   * @param {string|number} parentId - ID of parent node
   */
  function traverse(node, parentId = null) {
    // Add current node
    const nodeData = {
      id: node.node_id,
      token: node.token,
      log_prob: node.log_prob,
      gen_count: node.gen_count,
      token_id: node.token_id
    };
    nodes.push(nodeData);

    // Add link from parent
    if (parentId !== null) {
      links.push({
        source: parentId,
        target: node.node_id
      });
    }

    // Recursively process children
    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        traverse(child, node.node_id);
      });
    }
  }

  traverse(root);

  return { nodes, links };
}

/**
 * Calculate tree depth for layout optimization.
 *
 * @param {Object} node - Current node
 * @param {number} depth - Current depth
 * @returns {number} Maximum depth of the tree
 */
export function getTreeDepth(node, depth = 0) {
  if (!node.children || node.children.length === 0) {
    return depth;
  }

  const childDepths = node.children.map(child =>
    getTreeDepth(child, depth + 1)
  );
  return Math.max(...childDepths);
}

/**
 * Calculate tree statistics for visualization adjustments.
 *
 * @param {Object} root - Root node of the tree
 * @returns {Object} Statistics about the tree
 */
export function getTreeStats(root) {
  let totalNodes = 0;
  let totalLinks = 0;
  let maxBranchingFactor = 0;

  function traverse(node) {
    totalNodes++;
    const numChildren = node.children ? node.children.length : 0;
    totalLinks += numChildren;
    maxBranchingFactor = Math.max(maxBranchingFactor, numChildren);

    if (node.children) {
      node.children.forEach(child => traverse(child));
    }
  }

  traverse(root);

  return {
    totalNodes,
    totalLinks,
    maxBranchingFactor,
    depth: getTreeDepth(root)
  };
}
