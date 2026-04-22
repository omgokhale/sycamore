# Hecate Progress - Word Tree Visualization

## What We Built
Transformed the token tree visualization from force-directed graph to **Wattenberg-style word tree** with focus/zoom interactions.

## Current State (Fully Functional)

### Core Features
1. **Wattenberg-style layout**: Left-to-right tree, font size = √gen_count
2. **Color scheme**: Green (tracked path), black (selected), gray (considered/never chosen)
3. **Click to focus**: Hides siblings, shows only clicked node + ancestors + descendants
4. **Auto-zoom**: Smoothly zooms/frames visible nodes when focused (50px padding)
5. **Curved links**: Bezier curves that avoid text overlap with white backgrounds
6. **Hover metadata**: White box with gray border showing:
   - Status: Selected/Alternative/Considered
   - X.X% probability (1 decimal place)
   - Selected X/30 times
7. **Auto-load**: Generates "Hello, world." tree on startup

### Files Modified
- `frontend/src/components/WordTreeGraph.jsx` - New Wattenberg implementation
- `frontend/src/App.jsx` - Auto-generate on mount

### Key Implementation Details
- Uses `display: none/block` for metadata (no transitions)
- `this.parentNode.appendChild(this)` brings hovered node to front
- Visibility function: `isNodeVisible(node, focusedNode)` checks ancestors/descendants
- Zoom function: `zoomToFit(animate, onlyVisible)` with dynamic padding
- Font sizing: `minFontSize + √(gen_count/maxGenCount) * (maxFontSize - minFontSize)`

## Tech Stack
- Frontend: React + D3.js + Vite (port 3002)
- Backend: Flask + OpenAI API (port 5003)
- Data: GPT-4o-mini, 30 runs, top_logprobs=3

## Next Steps (If Needed)
- Deployment to Vercel (DEPLOYMENT.md exists)
- Performance optimization for larger trees
- Additional interaction modes
- Export/share functionality

## How to Run
```bash
# Backend
cd backend && source venv/bin/activate && python app.py

# Frontend
cd frontend && npm run dev
```

Browse: http://localhost:3002/
