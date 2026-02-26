"""
Flask API server for token tree visualization.

Provides endpoints for generating token probability trees using OpenAI API.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from token_tree_builder import TokenTreeBuilder
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})  # Enable CORS for React frontend


@app.route('/api/generate-tree', methods=['POST'])
def generate_tree():
    """
    Main API endpoint to generate token tree.

    Expected JSON body:
    {
        "prompt": "What is the meaning of life",
        "num_runs": 50,
        "max_tokens": 15,
        "top_logprobs": 3
    }

    Returns:
    {
        "tree": {...},  # Token tree as nested dict
        "status": "success"
    }
    """
    try:
        data = request.json

        # Validate input
        prompt = data.get('prompt')
        if not prompt:
            return jsonify({'error': 'Prompt is required'}), 400

        # Get parameters with defaults
        num_runs = data.get('num_runs', 50)
        top_logprobs = data.get('top_logprobs', 3)

        # max_tokens reduced to 15 for shorter responses
        max_tokens = 15

        # Validate parameter ranges
        if num_runs < 1 or num_runs > 200:
            return jsonify({'error': 'num_runs must be between 1 and 200'}), 400
        if top_logprobs < 1 or top_logprobs > 5:
            return jsonify({'error': 'top_logprobs must be between 1 and 5'}), 400
        if len(prompt) > 1000:
            return jsonify({'error': 'Prompt must be less than 1000 characters'}), 400

        # Get API key
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            return jsonify({'error': 'OpenAI API key not configured'}), 500

        # Build tree
        builder = TokenTreeBuilder(api_key)
        root, first_completion = builder.build_tree(prompt, num_runs, max_tokens, top_logprobs)

        # Convert to JSON
        tree_data = root.to_dict()

        return jsonify({
            'tree': tree_data,
            'first_completion': first_completion,  # Guaranteed grammatical completion
            'status': 'success',
            'params': {
                'prompt': prompt,
                'num_runs': num_runs,
                'top_logprobs': top_logprobs,
                'max_tokens': max_tokens  # Include for transparency
            }
        })

    except Exception as e:
        print(f"Error generating tree: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint."""
    api_key_configured = bool(os.getenv('OPENAI_API_KEY'))
    return jsonify({
        'status': 'healthy',
        'api_key_configured': api_key_configured
    })


if __name__ == '__main__':
    app.run(debug=True, port=5001, host='localhost')
