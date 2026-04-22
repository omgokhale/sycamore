# Hecate - Token Tree Visualization

Visualize LLM token generation trees with Wattenberg-style word trees. Explore how language models consider different token possibilities, with interactive focus and zoom to reveal patterns and biases.

## Features

- **Wattenberg-style word tree** - Left-to-right layout with font size = frequency
- **Click to focus** - Hide siblings, zoom to selected branch
- **Hover metadata** - Status, probability, selection count
- **Bias detection** - See what models consider but never choose
- **Auto-zoom framing** - Smooth transitions and optimal text sizing
- **Three token states**: Selected (green), Alternative (black), Considered (gray)
- Real-time tree generation using OpenAI's GPT-4o-mini

## Architecture

- **Backend**: Python/Flask with OpenAI API integration
- **Frontend**: React with D3.js force simulation
- **Visualization**: Custom D3 force-directed graph with physics-based layout

## Setup

### Prerequisites

- Python 3.8+
- Node.js 16+
- OpenAI API key

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create environment file:
   ```bash
   cp .env.example .env
   ```

5. Add your OpenAI API key to `.env`:
   ```
   OPENAI_API_KEY=your_api_key_here
   ```

6. Start the Flask server:
   ```bash
   python app.py
   ```

   The backend will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

   The frontend will run on `http://localhost:3000`

## Usage

1. Open your browser to `http://localhost:3000`

2. Enter a prompt (e.g., "What is the meaning of life")

3. Configure parameters:
   - **Execution Count**: Number of completions to merge (default: 50)
   - **Max Tokens**: Length of each completion (default: 15)
   - **Top Logprobs**: Alternative tokens to show at each position (default: 3)

4. Click "Generate Tree"

5. Watch the tree animate in with blur and line-drawing effects

6. Interact with the graph:
   - Drag nodes to reposition
   - Scroll to zoom in/out
   - Hover over nodes to see detailed information

## How It Works

The app generates multiple completions from the OpenAI API with logprobs enabled, then merges them into a single tree structure:

1. For each completion, the API returns the selected token plus alternative tokens at each position
2. Each token has a log probability (logprob) representing how likely the model thought it was
3. Multiple completions are merged into one tree, with generation counts showing how often each token was selected
4. The D3 force simulation positions nodes using physics-based forces
5. Animations create a "blossoming" effect as the tree appears

### Tree Building Algorithm

```
1. Create root node
2. For each completion (num_runs times):
   - Get completion with logprobs from OpenAI
   - For each token position:
     - Get top_k alternatives from logprobs
     - Create nodes for each alternative
     - Merge into tree (incrementing gen_count for duplicates)
     - Move to selected alternative for next position
3. Result: Merged tree with all possible paths and probabilities
```

### Logprob to Probability Conversion

```javascript
probability = e^(logprob)
percentage = probability * 100
```

For example, a logprob of -1 equals approximately 10% probability.

## Project Structure

```
Hecate/
├── backend/
│   ├── app.py                 # Flask API server
│   ├── token_tree.py          # TokenTree node class
│   ├── token_tree_builder.py # OpenAI integration & tree building
│   ├── requirements.txt       # Python dependencies
│   └── .env.example           # Environment template
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.jsx            # Main component
│   │   ├── index.jsx          # React entry point
│   │   ├── components/
│   │   │   ├── InputForm.jsx
│   │   │   ├── TokenTreeGraph.jsx
│   │   │   └── LoadingSpinner.jsx
│   │   ├── services/
│   │   │   └── api.js         # Backend API calls
│   │   ├── utils/
│   │   │   └── treeTransform.js
│   │   └── styles/
│   │       └── App.css
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Customization

The visualization can be customized by adjusting parameters in `TokenTreeGraph.jsx`:

- **Force strengths**: Adjust repulsion, link distance, etc.
- **Node sizing**: Modify the formula for node radius based on gen_count
- **Colors**: Change the color scale for probability visualization
- **Animation timing**: Adjust duration and delay values
- **Layout**: Modify force simulation parameters for different layouts

## API Endpoints

### POST `/api/generate-tree`

Generate a token probability tree.

**Request body:**
```json
{
  "prompt": "What is the meaning of life",
  "num_runs": 50,
  "max_tokens": 15,
  "top_logprobs": 3
}
```

**Response:**
```json
{
  "tree": { ... },
  "status": "success",
  "params": { ... }
}
```

### GET `/api/health`

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "api_key_configured": true
}
```

## Credits

Inspired by [token-tree](https://github.com/awwaiid/token-tree) by Brock Wilcox.

## License

MIT
