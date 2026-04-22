import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

function WordTreeGraph({ data, firstCompletion }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const zoomRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 1600, height: 1000 });
  const [mostProbableCompletion, setMostProbableCompletion] = useState(null);
  const [displayText, setDisplayText] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedNodePath, setSelectedNodePath] = useState(null);
  const [currentPathIndex, setCurrentPathIndex] = useState(0);
  const [showNavButtons, setShowNavButtons] = useState(false);
  const [focusedNodeId, setFocusedNodeId] = useState(null);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, data: null });
  const [isCompletionBoxClick, setIsCompletionBoxClick] = useState(false); // Track if click was from completion box

  // Update dimensions on window resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Animate text changes with dissolve effect
  useEffect(() => {
    if (!mostProbableCompletion) {
      setDisplayText('');
      return;
    }

    if (mostProbableCompletion === displayText) return;

    setIsAnimating(true);

    const oldText = displayText;
    const newText = mostProbableCompletion;

    if (oldText && oldText.trim()) {
      const indices = oldText.split('').map((_, i) => i);
      const shuffled = indices.sort(() => Math.random() - 0.5);

      shuffled.forEach((index, i) => {
        setTimeout(() => {
          setDisplayText(prev => {
            const chars = prev.split('');
            chars[index] = ' ';
            return chars.join('');
          });
        }, i * 12);
      });

      setTimeout(() => {
        setDisplayText(newText.split('').map(() => ' ').join(''));

        const newIndices = newText.split('').map((_, i) => i);
        const newShuffled = newIndices.sort(() => Math.random() - 0.5);

        newShuffled.forEach((index, i) => {
          setTimeout(() => {
            setDisplayText(prev => {
              const chars = prev.split('');
              chars[index] = newText[index];
              return chars.join('');
            });

            if (i === newShuffled.length - 1) {
              setIsAnimating(false);
            }
          }, i * 15);
        });
      }, shuffled.length * 12 + 150);
    } else {
      setDisplayText(newText.split('').map(() => ' ').join(''));

      const indices = newText.split('').map((_, i) => i);
      const shuffled = indices.sort(() => Math.random() - 0.5);

      shuffled.forEach((index, i) => {
        setTimeout(() => {
          setDisplayText(prev => {
            const chars = prev.split('');
            chars[index] = newText[index];
            return chars.join('');
          });

          if (i === shuffled.length - 1) {
            setIsAnimating(false);
          }
        }, i * 15);
      });
    }
  }, [mostProbableCompletion]);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    // Clear previous visualization
    d3.select(svgRef.current).selectAll('*').remove();

    // Create hierarchy from tree data
    const root = d3.hierarchy(data, d => d.children);

    // Wattenberg-style tree layout: left to right, vertical spacing based on frequency
    const treeLayout = d3.tree()
      .nodeSize([40, 200]) // [vertical spacing, horizontal spacing]
      .separation((a, b) => {
        // More spacing for nodes with different parents
        return (a.parent === b.parent ? 1 : 1.5);
      });

    // Apply tree layout
    treeLayout(root);

    // Calculate max gen_count for font size scaling
    let maxGenCount = 1;
    const nodes = root.descendants();

    // Find the focused node by ID (AFTER nodes is created)
    let focusedNode = null;
    if (focusedNodeId) {
      focusedNode = nodes.find(n => n.data.node_id === focusedNodeId);
    }

    // Helper function to check if node should be visible based on focused node
    const isNodeVisible = (node, focused) => {
      if (!focused) return true; // Show all if nothing focused

      // Check if node is the focused node
      if (node.data.node_id === focused.data.node_id) return true;

      // Check if node is an ancestor of focused node
      let current = focused;
      while (current) {
        if (current.data.node_id === node.data.node_id) return true;
        current = current.parent;
      }

      // Check if node is a descendant of focused node
      const isDescendant = (ancestor, node) => {
        if (ancestor.data.node_id === node.data.node_id) return true;
        if (!ancestor.children) return false;
        return ancestor.children.some(child => isDescendant(child, node));
      };

      return isDescendant(focused, node);
    };
    nodes.forEach(node => {
      if (node.data.gen_count > maxGenCount) {
        maxGenCount = node.data.gen_count;
      }
    });

    // Helper function to build completion text from root to node
    const getCompletionText = (node) => {
      const tokens = [];
      let current = node;
      while (current.parent) {
        if (current.data.token !== '<ROOT>') {
          tokens.unshift(current.data.token);
        }
        current = current.parent;
      }
      return tokens.join('');
    };

    // Find tracked path nodes
    const trackedPathNodeIds = new Set();
    let mostProbableLeaf = null;
    nodes.forEach(node => {
      if (node.data.is_tracked_path) {
        trackedPathNodeIds.add(node.data.node_id);
        if (!node.children || node.children.length === 0) {
          mostProbableLeaf = node;
        }
      }
    });

    // Set the most probable completion
    if (firstCompletion) {
      setMostProbableCompletion(firstCompletion);
    } else if (mostProbableLeaf) {
      const path = [];
      let current = mostProbableLeaf;
      while (current.parent) {
        if (current.data.token !== '<ROOT>') {
          path.unshift(current.data.token);
        }
        current = current.parent;
      }
      setMostProbableCompletion(path.join(''));
    }

    // Font size calculation (Wattenberg style: size ∝ √frequency)
    const minFontSize = 11;
    const maxFontSize = 32;
    const getFontSize = (nodeData) => {
      if (nodeData.token === '<ROOT>') return 12;
      if (nodeData.gen_count === 0) return minFontSize; // Fixed size for alternatives

      const normalized = Math.sqrt(nodeData.gen_count) / Math.sqrt(maxGenCount);
      return minFontSize + normalized * (maxFontSize - minFontSize);
    };

    // Color: black for selected, gray for alternatives, blue for tracked path only
    const getTextColor = (nodeData) => {
      if (nodeData.token === '<ROOT>') return '#000000';
      if (trackedPathNodeIds.has(nodeData.node_id)) return '#0080FF'; // Blue for tracked path
      if (nodeData.gen_count === 0) return '#999999'; // Gray for never selected
      return '#000000'; // Black for selected
    };

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', dimensions.width)
      .attr('height', dimensions.height);

    // Create container for zoom and pan
    const g = svg.append('g')
      .attr('transform', `translate(80, ${dimensions.height / 2})`);

    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    svg.call(zoom);
    zoomRef.current = zoom;

    // Click on background to hide navigation buttons and unfocus
    svg.on('click', function(event) {
      if (event.target === this) {
        setShowNavButtons(false);
        setFocusedNodeId(null);
        setIsCompletionBoxClick(false);
      }
    });

    // Helper function to find path from root through node to leaf
    const findPathToLeaf = (targetNode) => {
      const pathToNode = [];
      let current = targetNode;
      while (current) {
        pathToNode.unshift(current);
        current = current.parent;
      }

      current = targetNode;
      const pathToLeaf = [current];
      while (current.children && current.children.length > 0) {
        const selectedChild = current.children.find(child => child.data.was_selected);
        if (selectedChild) {
          pathToLeaf.push(selectedChild);
          current = selectedChild;
        } else {
          break;
        }
      }

      return [...pathToNode.slice(0, -1), ...pathToLeaf];
    };

    // Helper function to zoom to node
    const zoomToNode = (nodeData, nodeDatum, updateNavState = true) => {
      const scale = 1.5;
      const x = -nodeDatum.y * scale + dimensions.width / 2;
      const y = -nodeDatum.x * scale + dimensions.height / 2;

      svg.transition()
        .duration(750)
        .call(zoom.transform, d3.zoomIdentity.translate(x, y).scale(scale));

      if (updateNavState && nodeDatum.data.was_selected) {
        const path = findPathToLeaf(nodeDatum);
        const index = path.findIndex(n => n === nodeDatum);
        setSelectedNodePath(path);
        setCurrentPathIndex(index);
        setShowNavButtons(true);
      } else if (updateNavState && !nodeDatum.data.was_selected) {
        setShowNavButtons(false);
      }
    };

    // Helper function to zoom to fit (optionally only visible nodes)
    const zoomToFit = (animate = true, onlyVisible = false) => {
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;

      // Filter to only visible nodes if requested
      const nodesToConsider = onlyVisible
        ? nodes.filter(d => isNodeVisible(d, focusedNode))
        : nodes;

      if (nodesToConsider.length === 0) return;

      nodesToConsider.forEach(d => {
        const fontSize = getFontSize(d.data);
        minX = Math.min(minX, d.x - fontSize);
        maxX = Math.max(maxX, d.x + fontSize);
        minY = Math.min(minY, d.y - 50);
        maxY = Math.max(maxY, d.y + d.textWidth + 50);
      });

      const graphWidth = maxY - minY;
      const graphHeight = maxX - minX;
      const centerY = (minY + maxY) / 2;
      const centerX = (minX + maxX) / 2;

      const padding = onlyVisible ? 50 : 100; // Less padding when focused = larger text
      const scale = Math.min(
        (dimensions.width - padding * 2) / graphWidth,
        (dimensions.height - padding * 2) / graphHeight,
        3 // Allow zooming in more than 1x for focused views
      );

      const x = -centerY * scale + dimensions.width / 2;
      const y = -centerX * scale + dimensions.height / 2;

      if (animate) {
        svg.transition()
          .duration(750)
          .ease(d3.easeCubicInOut)
          .call(zoom.transform, d3.zoomIdentity.translate(x, y).scale(scale));
      } else {
        svg.call(zoom.transform, d3.zoomIdentity.translate(x, y).scale(scale));
      }
    };

    if (svgRef.current) {
      svgRef.current.zoomToFit = zoomToFit;
    }

    // Calculate text widths for curve avoidance
    nodes.forEach(d => {
      const fontSize = getFontSize(d.data);
      const token = d.data.token === '<ROOT>' ? 'START' : d.data.token;
      // Rough estimate: monospace width
      d.textWidth = token.length * fontSize * 0.6;
      d.textHeight = fontSize;
    });

    // Create curved link path generator that avoids text overlap
    const createCurvedPath = (d) => {
      const sourceX = d.source.y;
      const sourceY = d.source.x;
      const targetX = d.target.y;
      const targetY = d.target.x;

      // Calculate source text end point (right edge of source text)
      const sourceTextEnd = sourceX + (d.source.textWidth || 0);

      // Start curve after source text ends
      const startX = sourceTextEnd + 10;

      // End curve before target text begins
      const endX = targetX - 10;

      // Create smooth Bezier curve
      const midX = (startX + endX) / 2;

      return `M ${sourceX},${sourceY}
              L ${startX},${sourceY}
              C ${midX},${sourceY} ${midX},${targetY} ${endX},${targetY}
              L ${targetX},${targetY}`;
    };

    // Create links (curved lines that avoid text - Wattenberg style)
    const links = root.links();

    // Helper to check if link should be visible
    const isLinkVisible = (link) => {
      return isNodeVisible(link.source, focusedNode) && isNodeVisible(link.target, focusedNode);
    };

    const linkPaths = g.append('g')
      .attr('class', 'links')
      .selectAll('path')
      .data(links)
      .join('path')
      .attr('d', createCurvedPath)
      .attr('fill', 'none')
      .attr('stroke', '#000000')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0);

    // Animate links
    linkPaths.each(function(d, i) {
      const path = d3.select(this);
      const length = path.node().getTotalLength();

      const targetOpacity = isLinkVisible(d) ? 0.3 : 0;

      path
        .attr('stroke-dasharray', length + ' ' + length)
        .attr('stroke-dashoffset', length)
        .transition()
        .duration(600)
        .delay(focusedNode ? 0 : i * 10)
        .ease(d3.easeCubicOut)
        .attr('stroke-dashoffset', 0)
        .attr('stroke-opacity', targetOpacity);
    });

    // Create node groups
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.y},${d.x})`)
      .style('cursor', 'pointer')
      .on('click', function(event, d) {
        event.stopPropagation();
        // Token click: zoom to fit whole sequence
        setIsCompletionBoxClick(false);
        setFocusedNodeId(d.data.node_id);
      })
      .on('mouseenter', function(event, d) {
        if (d.data.token === '<ROOT>') return; // No tooltip for root

        // Change text color to hover color
        d3.select(this).select('.token-text').attr('fill', '#6EB7FF');

        // Get the bounding box of this node group in screen coordinates
        const bbox = this.getBoundingClientRect();

        // Calculate probability
        const probValue = Math.exp(d.data.log_prob) * 100;
        const probDisplay = (probValue > 0 && probValue < 0.1) ? '<0.1' : probValue.toFixed(1);

        // Position tooltip below the node
        setTooltip({
          visible: true,
          x: bbox.left,
          y: bbox.bottom + 5, // 5px below
          data: {
            token: d.data.token,
            status: trackedPathNodeIds.has(d.data.node_id) ? 'Selected' :
                    (d.data.gen_count > 0 ? 'Alternative' : 'Considered'),
            probability: probDisplay,
            genCount: d.data.gen_count
          }
        });
      })
      .on('mouseleave', function(event, d) {
        // Restore original text color
        d3.select(this).select('.token-text').attr('fill', getTextColor(d.data));

        setTooltip({ visible: false, x: 0, y: 0, data: null });
      });

    // Apply visibility based on focused node (Wattenberg-style focus)
    const getNodeOpacity = (d) => {
      return isNodeVisible(d, focusedNode) ? 1 : 0;
    };

    // Add white background rectangles behind text for legibility
    // This is the clickable hit area
    const textPadding = 4;
    node.append('rect')
      .attr('class', 'text-background')
      .attr('x', -textPadding)
      .attr('y', d => {
        const fontSize = getFontSize(d.data);
        return -fontSize / 2 - textPadding;
      })
      .attr('width', d => d.textWidth + textPadding * 2)
      .attr('height', d => {
        const fontSize = getFontSize(d.data);
        return fontSize + textPadding * 2;
      })
      .attr('fill', '#FFFFFF')
      .attr('opacity', 0)
      .transition()
      .duration(400)
      .delay((d, i) => focusedNode ? 0 : i * 15 + 250)
      .ease(d3.easeCubicOut)
      .attr('opacity', d => getNodeOpacity(d));

    // Add text labels with Wattenberg styling
    const textLabels = node.append('text')
      .attr('class', 'token-text')
      .text(d => {
        if (d.data.token === '<ROOT>') return 'START';
        return d.data.token.length > 30 ? d.data.token.substring(0, 30) + '...' : d.data.token;
      })
      .attr('x', 0)
      .attr('y', 0)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'start')
      .attr('font-family', '"IBM Plex Mono", monospace')
      .attr('font-size', d => getFontSize(d.data) + 'px')
      .attr('font-weight', '400')
      .attr('fill', d => getTextColor(d.data))
      .attr('opacity', 0)
      .style('pointer-events', 'none')
      .style('user-select', 'none')
      .transition()
      .duration(400)
      .delay((d, i) => focusedNode ? 0 : i * 15 + 300)
      .ease(d3.easeCubicOut)
      .attr('opacity', d => getNodeOpacity(d));

    // Add completion text boxes for leaf nodes
    const leafNodes = nodes.filter(d =>
      (!d.children || d.children.length === 0) && // Is a leaf
      d.data.gen_count > 0 && // Was actually selected at least once
      d.data.token !== '<ROOT>' // Not the root
    );

    leafNodes.forEach((leafNode, leafIndex) => {
      const completionText = getCompletionText(leafNode);
      const nodeGroup = node.filter(d => d.data.node_id === leafNode.data.node_id);

      // Add white background box
      const boxPadding = 6;
      const boxWidth = 200;
      const lineHeight = 12;
      const fontSize = 9;

      // Calculate height based on actual content
      // Estimate characters per line (monospace: ~0.6em per char)
      const charsPerLine = Math.floor((boxWidth - boxPadding * 2) / (fontSize * 0.6));
      const numLines = Math.ceil(completionText.length / charsPerLine);
      const boxHeight = numLines * lineHeight + boxPadding * 2;

      const completionBoxBg = nodeGroup.append('rect')
        .attr('class', 'completion-box-bg')
        .attr('x', leafNode.textWidth + 20)
        .attr('y', -boxPadding)
        .attr('width', boxWidth)
        .attr('height', boxHeight)
        .attr('fill', '#FFFFFF')
        .attr('stroke', '#D0D0D0')
        .attr('stroke-width', 1)
        .attr('opacity', 0)
        .style('cursor', 'pointer')
        .on('click', function(event) {
          event.stopPropagation();

          // Completion box click: zoom to just this node
          setIsCompletionBoxClick(true);
          setFocusedNodeId(leafNode.data.node_id);
        })
        .transition()
        .duration(400)
        .delay(focusedNode ? 0 : nodes.length * 15 + 400 + leafIndex * 50) // After all nodes finish
        .ease(d3.easeCubicOut)
        .attr('opacity', isNodeVisible(leafNode, focusedNode) ? 1 : 0); // Respect visibility

      // Add text with wrapping using foreignObject
      const foreignObj = nodeGroup.append('foreignObject')
        .attr('class', 'completion-box-text')
        .attr('x', leafNode.textWidth + 20 + boxPadding)
        .attr('y', 0)
        .attr('width', boxWidth - boxPadding * 2)
        .attr('height', boxHeight - boxPadding * 2)
        .style('pointer-events', 'none')
        .attr('opacity', 0);

      foreignObj.append('xhtml:div')
        .style('font-family', '"IBM Plex Mono", monospace')
        .style('font-size', `${fontSize}px`)
        .style('line-height', `${lineHeight}px`)
        .style('color', '#000000')
        .style('word-wrap', 'break-word')
        .style('overflow-wrap', 'break-word')
        .style('white-space', 'normal')
        .text(completionText);

      foreignObj.transition()
        .duration(400)
        .delay(focusedNode ? 0 : nodes.length * 15 + 400 + leafIndex * 50) // After all nodes finish
        .ease(d3.easeCubicOut)
        .attr('opacity', isNodeVisible(leafNode, focusedNode) ? 1 : 0); // Respect visibility
    });

    // Set zoom based on focus state
    if (focusedNode) {
      if (isCompletionBoxClick) {
        // Completion box click: zoom to center on JUST that node with comfortable padding
        const scale = 1.2;
        const x = -focusedNode.y * scale + dimensions.width / 2;
        const y = -focusedNode.x * scale + dimensions.height / 2;

        svg.transition()
          .duration(750)
          .ease(d3.easeCubicInOut)
          .call(zoom.transform, d3.zoomIdentity.translate(x, y).scale(scale));
      } else {
        // Token click: zoom to fit whole sequence
        zoomToFit(true, true);
      }
    } else {
      // Initial load or unfocus: show full tree without animation
      zoomToFit(false, false);
    }
  }, [data, dimensions, firstCompletion, focusedNodeId, isCompletionBoxClick]);

  const handleZoomToFit = () => {
    if (svgRef.current && svgRef.current.zoomToFit) {
      svgRef.current.zoomToFit();
    }
  };

  const handleNavigateBack = () => {
    if (!selectedNodePath || currentPathIndex <= 0 || !zoomRef.current) return;

    const newIndex = currentPathIndex - 1;
    const targetNode = selectedNodePath[newIndex];

    const svg = d3.select(svgRef.current);
    const scale = 1.5;
    const x = -targetNode.y * scale + dimensions.width / 2;
    const y = -targetNode.x * scale + dimensions.height / 2;

    svg.transition()
      .duration(750)
      .call(zoomRef.current.transform, d3.zoomIdentity.translate(x, y).scale(scale));

    setCurrentPathIndex(newIndex);
  };

  const handleNavigateNext = () => {
    if (!selectedNodePath || currentPathIndex >= selectedNodePath.length - 1 || !zoomRef.current) return;

    const newIndex = currentPathIndex + 1;
    const targetNode = selectedNodePath[newIndex];

    const svg = d3.select(svgRef.current);
    const scale = 1.5;
    const x = -targetNode.y * scale + dimensions.width / 2;
    const y = -targetNode.x * scale + dimensions.height / 2;

    svg.transition()
      .duration(750)
      .call(zoomRef.current.transform, d3.zoomIdentity.translate(x, y).scale(scale));

    setCurrentPathIndex(newIndex);
  };

  return (
    <div className="graph-container" ref={containerRef}>
      <svg ref={svgRef} className="graph-svg"></svg>

      {mostProbableCompletion && (
        <div className="most-probable-display">
          <div className="most-probable-icon"></div>
          <div className="most-probable-text">{displayText || mostProbableCompletion}</div>
        </div>
      )}

      {showNavButtons && (
        <>
          <button
            className={`nav-button nav-back-button ${currentPathIndex === 0 ? 'disabled' : ''}`}
            onClick={handleNavigateBack}
            disabled={currentPathIndex === 0}
            style={{
              opacity: showNavButtons ? 1 : 0,
              transition: 'opacity 300ms ease-in-out'
            }}
          >
            <img src="/caret-back.svg" alt="Previous" />
          </button>
          <button
            className={`nav-button nav-next-button ${currentPathIndex >= selectedNodePath?.length - 1 ? 'disabled' : ''}`}
            onClick={handleNavigateNext}
            disabled={currentPathIndex >= selectedNodePath?.length - 1}
            style={{
              opacity: showNavButtons ? 1 : 0,
              transition: 'opacity 300ms ease-in-out'
            }}
          >
            <img src="/caret-next.svg" alt="Next" />
          </button>
        </>
      )}

      <button className="zoom-to-fit-button" onClick={handleZoomToFit}>
        <img src="/corners-out.svg" alt="Zoom to fit" />
      </button>

      <div className="credit-text">
        <div>OM GOKHALE</div>
        <div>LAST UPDATED 2.26.26</div>
      </div>

      {/* Floating tooltip */}
      {tooltip.visible && tooltip.data && (
        <div
          style={{
            position: 'fixed',
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            backgroundColor: '#FFFFFF',
            border: '1px solid #CCCCCC',
            padding: '8px 10px',
            borderRadius: '4px',
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: '10px',
            pointerEvents: 'none',
            zIndex: 1000
          }}
        >
          <div style={{ color: '#000000', marginBottom: '4px' }}>{tooltip.data.status}</div>
          <div style={{ color: '#666666', marginBottom: '2px' }}>{tooltip.data.probability}% probability</div>
          <div style={{ color: '#666666' }}>Selected {tooltip.data.genCount}/30 times</div>
        </div>
      )}
    </div>
  );
}

export default WordTreeGraph;
