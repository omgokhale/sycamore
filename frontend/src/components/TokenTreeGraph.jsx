import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

function TokenTreeGraph({ data, firstCompletion }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 1600, height: 1000 });
  const [mostProbableCompletion, setMostProbableCompletion] = useState(null);
  const [displayText, setDisplayText] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);

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

    // Phase 1: Dissolve out old text
    const oldText = displayText;
    const newText = mostProbableCompletion;

    if (oldText && oldText.trim()) {
      // Create random order for dissolving out
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

      // Phase 2: Dissolve in new text after old text finishes
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
      // No old text, just dissolve in
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mostProbableCompletion]);

  useEffect(() => {
    if (!data || !svgRef.current) return;

    // Clear previous visualization
    d3.select(svgRef.current).selectAll('*').remove();

    // Create hierarchy from tree data
    const root = d3.hierarchy(data, d => d.children);

    // Create tree layout (horizontal: left to right)
    const treeLayout = d3.tree()
      .nodeSize([70, 220]) // [vertical spacing, horizontal spacing]
      .separation((a, b) => {
        // Increased spacing between nodes
        return (a.parent === b.parent ? 1.3 : 1.6);
      });

    // Apply tree layout
    treeLayout(root);

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', dimensions.width)
      .attr('height', dimensions.height)
      .attr('viewBox', [0, 0, dimensions.width, dimensions.height]);

    // Define arrow markers for links
    const defs = svg.append('defs');

    defs.append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '-0 -5 10 10')
      .attr('refX', 10)
      .attr('refY', 0)
      .attr('orient', 'auto')
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .append('svg:path')
      .attr('d', 'M 0,-5 L 10 ,0 L 0,5')
      .attr('fill', '#E9E9E9')
      .style('opacity', 1.0);

    // Create container for zoom and pan
    const g = svg.append('g')
      .attr('transform', `translate(50, ${dimensions.height / 2})`);

    // Add zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    svg.call(zoom);

    // Helper function to zoom to a specific node
    const zoomToNode = (nodeData, nodeDatum) => {
      const scale = 1.5; // Zoom level
      const x = -nodeDatum.y * scale + dimensions.width / 2;
      const y = -nodeDatum.x * scale + dimensions.height / 2;

      svg.transition()
        .duration(750)
        .call(
          zoom.transform,
          d3.zoomIdentity.translate(x, y).scale(scale)
        );
    };

    // Helper function to zoom to fit entire graph
    const zoomToFit = () => {
      // Calculate bounds of all nodes including completion nodes
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;

      nodes.forEach(d => {
        minX = Math.min(minX, d.x - d.rectHeight / 2);
        maxX = Math.max(maxX, d.x + d.rectHeight / 2);
        minY = Math.min(minY, d.y - d.rectWidth / 2);
        maxY = Math.max(maxY, d.y + d.rectWidth / 2);
      });

      leafNodes.forEach(d => {
        minX = Math.min(minX, d.completionY - d.completionHeight / 2);
        maxX = Math.max(maxX, d.completionY + d.completionHeight / 2);
        minY = Math.min(minY, d.completionX - d.completionWidth / 2);
        maxY = Math.max(maxY, d.completionX + d.completionWidth / 2);
      });

      const graphWidth = maxY - minY;
      const graphHeight = maxX - minX;
      const centerY = (minY + maxY) / 2;
      const centerX = (minX + maxX) / 2;

      // Calculate scale to fit with padding
      const padding = 100;
      const scale = Math.min(
        (dimensions.width - padding * 2) / graphWidth,
        (dimensions.height - padding * 2) / graphHeight,
        1 // Don't zoom in beyond 1x
      );

      const x = -centerY * scale + dimensions.width / 2;
      const y = -centerX * scale + dimensions.height / 2;

      svg.transition()
        .duration(750)
        .call(
          zoom.transform,
          d3.zoomIdentity.translate(x, y).scale(scale)
        );
    };

    // Store zoomToFit in a ref so it can be called from the button
    if (svgRef.current) {
      svgRef.current.zoomToFit = zoomToFit;
    }

    // Get all nodes and links
    const nodes = root.descendants();
    const links = root.links();

    // Calculate max_gen_count for color normalization
    let maxGenCount = 1;
    nodes.forEach(node => {
      if (node.data.gen_count > maxGenCount) {
        maxGenCount = node.data.gen_count;
      }
    });

    // Helper function to convert HSV to RGB
    const hsvToRgb = (h, s, v) => {
      const c = v * s;
      const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
      const m = v - c;

      let r, g, b;
      if (h >= 0 && h < 60) {
        [r, g, b] = [c, x, 0];
      } else if (h >= 60 && h < 120) {
        [r, g, b] = [x, c, 0];
      } else if (h >= 120 && h < 180) {
        [r, g, b] = [0, c, x];
      } else if (h >= 180 && h < 240) {
        [r, g, b] = [0, x, c];
      } else if (h >= 240 && h < 300) {
        [r, g, b] = [x, 0, c];
      } else {
        [r, g, b] = [c, 0, x];
      }

      return `rgb(${Math.round((r + m) * 255)}, ${Math.round((g + m) * 255)}, ${Math.round((b + m) * 255)})`;
    };

    // Helper function to get node color based on gen_count
    const getNodeColor = (nodeData) => {
      if (nodeData.token === '<ROOT>') {
        return '#7FD895'; // Green for root
      }

      // Green for most probable path
      if (mostProbableNodeIds.has(nodeData.node_id)) {
        return '#7FD895';
      }

      // White for never selected (gen_count = 0)
      if (nodeData.gen_count === 0) {
        return '#FFFFFF';
      }

      // Base cyan color for generated tokens
      return '#88D8F7';
    };

    // Helper function to get white overlay opacity (for gen_count > 0)
    const getOverlayOpacity = (nodeData) => {
      if (nodeData.token === '<ROOT>' || nodeData.gen_count === 0 || mostProbableNodeIds.has(nodeData.node_id)) {
        return 0; // No overlay for root, 0 gen_count, or selected path
      }

      // Inverse relationship: high gen_count = low opacity, low gen_count = high opacity
      const normalizedGenCount = nodeData.gen_count / maxGenCount;
      return (1 - normalizedGenCount) * 0.8; // 0% at max, 80% at min
    };

    // Helper function to get stroke for nodes
    const getNodeStroke = (nodeData) => {
      if (nodeData.gen_count === 0) {
        return '#E8E8E8'; // Gray outline for 0 gen_count
      }
      return 'none';
    };

    // Create straight link generator (horizontal)
    const linkGenerator = (d) => {
      return `M${d.source.y},${d.source.x} L${d.target.y},${d.target.x}`;
    };

    // Create links (edges) with drawing animation
    const linkPaths = g.append('g')
      .attr('class', 'links')
      .selectAll('path')
      .data(links)
      .join('path')
      .attr('class', 'link')
      .attr('d', linkGenerator)
      .attr('fill', 'none')
      .attr('stroke', '#E9E9E9')
      .attr('stroke-opacity', 1.0)
      .attr('stroke-width', 1.5)
      .attr('marker-end', 'url(#arrowhead)');

    // Animate edges drawing themselves
    linkPaths.each(function(d, i) {
      const path = d3.select(this);
      const length = path.node().getTotalLength();

      path
        .attr('stroke-dasharray', length + ' ' + length)
        .attr('stroke-dashoffset', length)
        .transition()
        .duration(800)
        .delay(i * 15) // Stagger by 15ms per edge
        .ease(d3.easeCubicOut)
        .attr('stroke-dashoffset', 0);
    });

    // Calculate rectangle dimensions based on text
    const padding = { x: 16, y: 12 };
    const lineHeight = 16;

    // Calculate widths for each node (using monospace width estimation)
    nodes.forEach(d => {
      if (d.data.token === '<ROOT>') {
        // Small square for root node
        d.rectWidth = 20;
        d.rectHeight = 20;
      } else {
        const token = d.data.token;
        const tokenWidth = token.length * 9; // Monospace character width
        const metaText = `100% · ${d.data.gen_count}/30`; // Example meta text
        const metaWidth = metaText.length * 7; // Smaller font width
        d.rectWidth = Math.max(tokenWidth, metaWidth) + padding.x * 2;
        // Height: top padding + token line + middle padding + metadata line + bottom padding
        d.rectHeight = padding.y * 3 + lineHeight * 2;
      }
    });

    // Helper function to get completion path from root to node
    const getCompletionPath = (node) => {
      const path = [];
      let current = node;
      while (current.parent) {
        if (current.data.token !== '<ROOT>') {
          path.unshift(current.data.token);
        }
        current = current.parent;
      }
      return path.join('');
    };

    // Helper function to check if entire path to node is selected
    const isSelectedPath = (node) => {
      let current = node;
      while (current.parent) {
        if (current.data.token !== '<ROOT>' && !current.data.was_selected) {
          return false;
        }
        current = current.parent;
      }
      return true;
    };

    // Helper function to calculate minimum gen_count along path to node
    // (bottleneck approach - path strength is limited by weakest link)
    const getPathGenCount = (node) => {
      let minCount = Infinity;
      let current = node;
      while (current.parent) {
        if (current.data.token !== '<ROOT>') {
          minCount = Math.min(minCount, current.data.gen_count);
        }
        current = current.parent;
      }
      return minCount;
    };

    // Find leaf nodes that are at the end of selected paths only
    const leafNodes = nodes.filter(d =>
      (!d.children || d.children.length === 0) && isSelectedPath(d)
    );

    // Use is_tracked_path field from backend to find the green path
    // This ensures the green path matches the first completion from the API exactly
    const mostProbableNodeIds = new Set();
    let mostProbableLeaf = null;

    // Find all nodes marked as part of the tracked path
    nodes.forEach(node => {
      if (node.data.is_tracked_path) {
        mostProbableNodeIds.add(node.data.node_id);
        // Find the leaf node on the tracked path
        if (!node.children || node.children.length === 0) {
          mostProbableLeaf = node;
        }
      }
    });

    // Always use firstCompletion from API if available (guaranteed grammatical)
    // This ensures the floating tile shows the actual model completion
    if (firstCompletion) {
      setMostProbableCompletion(firstCompletion);
    } else if (mostProbableLeaf) {
      // Fallback to tree path if no API completion available
      setMostProbableCompletion(getCompletionPath(mostProbableLeaf));
    }

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
        zoomToNode(d.data, d);
      });

    // Add base rectangles to nodes (sharp corners) with fade-in animation
    node.append('rect')
      .attr('class', 'base-rect')
      .attr('x', d => -d.rectWidth / 2)
      .attr('y', d => -d.rectHeight / 2)
      .attr('width', d => d.rectWidth)
      .attr('height', d => d.rectHeight)
      .attr('rx', 0)
      .attr('ry', 0)
      .attr('fill', d => getNodeColor(d.data))
      .attr('stroke', d => getNodeStroke(d.data))
      .attr('stroke-width', d => d.data.gen_count === 0 ? 1 : 0)
      .attr('opacity', 0)
      .transition()
      .duration(600)
      .delay((d, i) => i * 20) // Stagger by 20ms per node
      .ease(d3.easeCubicOut)
      .attr('opacity', 1);

    // Add white overlay rectangles for gradient effect (gen_count > 0, not selected path)
    node.append('rect')
      .attr('class', 'overlay-rect')
      .attr('x', d => -d.rectWidth / 2)
      .attr('y', d => -d.rectHeight / 2)
      .attr('width', d => d.rectWidth)
      .attr('height', d => d.rectHeight)
      .attr('rx', 0)
      .attr('ry', 0)
      .attr('fill', '#FFFFFF')
      .attr('opacity', 0)
      .style('pointer-events', 'none')
      .transition()
      .duration(600)
      .delay((d, i) => i * 20)
      .ease(d3.easeCubicOut)
      .attr('opacity', d => getOverlayOpacity(d.data));

    // Add token text with fade-in animation
    node.append('text')
      .text(d => {
        const token = d.data.token;
        if (token === '<ROOT>') return 'START';
        return token.length > 20 ? token.substring(0, 20) + '...' : token;
      })
      .attr('x', d => {
        if (d.data.token === '<ROOT>') return 0;
        return -d.rectWidth / 2 + padding.x;
      })
      .attr('y', d => {
        if (d.data.token === '<ROOT>') return d.rectHeight / 2 + 22;
        return -d.rectHeight / 2 + padding.y + 12;
      })
      .attr('text-anchor', d => d.data.token === '<ROOT>' ? 'middle' : 'start')
      .attr('font-family', '"IBM Plex Mono", monospace')
      .attr('font-size', d => d.data.token === '<ROOT>' ? 11 : 14)
      .attr('font-weight', '400')
      .attr('fill', '#000000')
      .attr('opacity', 0)
      .style('pointer-events', 'none')
      .style('user-select', 'none')
      .transition()
      .duration(400)
      .delay((d, i) => i * 20 + 400)
      .ease(d3.easeCubicOut)
      .attr('opacity', d => d.data.gen_count === 0 ? 0.5 : 1.0);

    // Add metadata text with fade-in animation
    node.filter(d => d.data.token !== '<ROOT>')
      .append('text')
      .text(d => {
        const nodeData = d.data;
        const prob = Math.exp(nodeData.log_prob) * 100;
        return `${prob.toFixed(0)}% · ${nodeData.gen_count}/30`;
      })
      .attr('x', d => -d.rectWidth / 2 + padding.x)
      .attr('y', d => -d.rectHeight / 2 + padding.y + lineHeight + padding.y + 8)
      .attr('text-anchor', 'start')
      .attr('font-family', '"IBM Plex Mono", monospace')
      .attr('font-size', 10)
      .attr('font-weight', '400')
      .attr('fill', '#000000')
      .attr('opacity', 0)
      .style('pointer-events', 'none')
      .style('user-select', 'none')
      .transition()
      .duration(400)
      .delay((d, i) => i * 20 + 600) // After token text starts appearing
      .ease(d3.easeCubicOut)
      .attr('opacity', d => d.data.gen_count === 0 ? 0.25 : 0.5);

    // Add title for tooltips
    node.append('title')
      .text(d => {
        const nodeData = d.data;
        if (nodeData.token === '<ROOT>') return 'Start node';
        return `Token: ${nodeData.token}\nLog Probability: ${nodeData.log_prob.toFixed(3)}\nProbability: ${(Math.exp(nodeData.log_prob) * 100).toFixed(2)}%\nGeneration Count: ${nodeData.gen_count}`;
      });

    // Add completion nodes at the end of each branch (leaf nodes)
    const completionSpacing = 280; // Increased spacing to prevent overlap
    const completionPadding = { x: 16, y: 12 };
    const completionTopPadding = 18; // Extra padding above icon
    const iconSize = 8;

    // Helper function to wrap text into lines of ~4 words
    const wrapText = (text, wordsPerLine = 4) => {
      const words = text.split(' ');
      const lines = [];
      for (let i = 0; i < words.length; i += wordsPerLine) {
        lines.push(words.slice(i, i + wordsPerLine).join(' '));
      }
      return lines;
    };

    // Calculate dimensions for completion nodes
    leafNodes.forEach(d => {
      // For the green path (mostProbableLeaf), use firstCompletion from API
      // For other paths, reconstruct from tokens
      const isGreenPath = mostProbableLeaf && d.data.node_id === mostProbableLeaf.data.node_id;
      const completionText = isGreenPath && firstCompletion ? firstCompletion : getCompletionPath(d);
      const wrappedLines = wrapText(completionText, 4);
      d.wrappedLines = wrappedLines;

      // Find the longest line for width calculation
      const maxLineLength = Math.max(...wrappedLines.map(line => line.length));
      const textWidth = maxLineLength * 9; // Monospace estimation
      const countText = `${getPathGenCount(d)}/30`;
      const countWidth = countText.length * 7;
      d.completionWidth = Math.max(textWidth, countWidth, iconSize) + completionPadding.x * 2;

      // Height: top padding + icon + padding + text lines + padding + count line + bottom padding
      const textLinesHeight = wrappedLines.length * lineHeight;
      d.completionHeight = completionTopPadding + iconSize + completionPadding.y * 3 + textLinesHeight + lineHeight;
      d.completionX = d.y + completionSpacing; // Position to the right of leaf node
      d.completionY = d.x;
    });

    // Create edges from leaf nodes to completion nodes with drawing animation
    const completionLinks = g.append('g')
      .attr('class', 'completion-links')
      .selectAll('path')
      .data(leafNodes)
      .join('path')
      .attr('d', d => `M${d.y + d.rectWidth / 2},${d.x} L${d.completionX - d.completionWidth / 2},${d.completionY}`)
      .attr('fill', 'none')
      .attr('stroke', '#E9E9E9')
      .attr('stroke-opacity', 1.0)
      .attr('stroke-width', 1.5);

    // Animate completion edges
    completionLinks.each(function(d, i) {
      const path = d3.select(this);
      const length = path.node().getTotalLength();

      path
        .attr('stroke-dasharray', length + ' ' + length)
        .attr('stroke-dashoffset', length)
        .transition()
        .duration(600)
        .delay(links.length * 15 + i * 30) // After regular edges finish
        .ease(d3.easeCubicOut)
        .attr('stroke-dashoffset', 0);
    });

    // Create completion node groups
    const completionNode = g.append('g')
      .attr('class', 'completion-nodes')
      .selectAll('g')
      .data(leafNodes)
      .join('g')
      .attr('class', 'completion-node')
      .attr('transform', d => `translate(${d.completionX},${d.completionY})`)
      .style('cursor', 'pointer')
      .on('click', function(event, d) {
        event.stopPropagation();
        const scale = 1.5;
        const x = -d.completionX * scale + dimensions.width / 2;
        const y = -d.completionY * scale + dimensions.height / 2;
        svg.transition()
          .duration(750)
          .call(zoom.transform, d3.zoomIdentity.translate(x, y).scale(scale));
      });

    // Add white rectangles with gray outline - fade in
    completionNode.append('rect')
      .attr('x', d => -d.completionWidth / 2)
      .attr('y', d => -d.completionHeight / 2)
      .attr('width', d => d.completionWidth)
      .attr('height', d => d.completionHeight)
      .attr('rx', 0)
      .attr('ry', 0)
      .attr('fill', '#FFFFFF')
      .attr('stroke', '#D0D0D0')
      .attr('stroke-width', 1)
      .attr('opacity', 0)
      .transition()
      .duration(500)
      .delay((d, i) => links.length * 15 + 400 + i * 40)
      .ease(d3.easeCubicOut)
      .attr('opacity', 1);

    // Level 1: Add colored square icon at the top (green for most common, cyan for others)
    completionNode.append('rect')
      .attr('x', d => -d.completionWidth / 2 + completionPadding.x)
      .attr('y', d => -d.completionHeight / 2 + completionTopPadding)
      .attr('width', iconSize)
      .attr('height', iconSize)
      .attr('rx', 0)
      .attr('ry', 0)
      .attr('fill', d => {
        // Check if this path is the most common one
        return mostProbableLeaf && d.data.node_id === mostProbableLeaf.data.node_id
          ? '#7FD895' // Green for most common
          : '#88D8F7'; // Cyan for others
      })
      .attr('opacity', 0)
      .transition()
      .duration(400)
      .delay((d, i) => links.length * 15 + 600 + i * 40)
      .ease(d3.easeCubicOut)
      .attr('opacity', 1);

    // Level 2: Add completion text with fade-in
    completionNode.each(function(d, nodeIndex) {
      const textElement = d3.select(this).append('text')
        .attr('x', -d.completionWidth / 2 + completionPadding.x)
        .attr('y', -d.completionHeight / 2 + completionTopPadding + iconSize + completionPadding.y + 12)
        .attr('text-anchor', 'start')
        .attr('font-family', '"IBM Plex Mono", monospace')
        .attr('font-size', 14)
        .attr('font-weight', '400')
        .attr('fill', '#000000')
        .attr('opacity', 0)
        .style('pointer-events', 'none')
        .style('user-select', 'none');

      // Add each line as a tspan
      d.wrappedLines.forEach((line, lineIndex) => {
        textElement.append('tspan')
          .attr('x', -d.completionWidth / 2 + completionPadding.x)
          .attr('dy', lineIndex === 0 ? 0 : lineHeight)
          .text(line);
      });

      // Fade in the entire text element
      textElement
        .transition()
        .duration(500)
        .delay(links.length * 15 + 800 + nodeIndex * 40)
        .ease(d3.easeCubicOut)
        .attr('opacity', 1);
    });

    // Level 3: Add generation count text with fade-in
    completionNode.append('text')
      .text(d => `${getPathGenCount(d)}/30`)
      .attr('x', d => -d.completionWidth / 2 + completionPadding.x)
      .attr('y', d => {
        const textLinesHeight = d.wrappedLines.length * lineHeight;
        return -d.completionHeight / 2 + completionTopPadding + iconSize + completionPadding.y + textLinesHeight + completionPadding.y + 8;
      })
      .attr('text-anchor', 'start')
      .attr('font-family', '"IBM Plex Mono", monospace')
      .attr('font-size', 10)
      .attr('font-weight', '400')
      .attr('fill', '#000000')
      .attr('opacity', 0)
      .style('pointer-events', 'none')
      .style('user-select', 'none')
      .transition()
      .duration(300)
      .delay((d, i) => links.length * 15 + 1100 + i * 40)
      .ease(d3.easeCubicOut)
      .attr('opacity', 0.5);
  }, [data, dimensions, firstCompletion]);

  const handleZoomToFit = () => {
    if (svgRef.current && svgRef.current.zoomToFit) {
      svgRef.current.zoomToFit();
    }
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

      <button className="zoom-to-fit-button" onClick={handleZoomToFit}>
        <img src="/corners-out.svg" alt="Zoom to fit" />
      </button>

      <div className="credit-text">
        <div>OM GOKHALE</div>
        <div>LAST UPDATED 2.26.26</div>
      </div>
    </div>
  );
}

export default TokenTreeGraph;
