"""
Vercel serverless function for token tree generation.
"""
import sys
import os
import json

# Add backend directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from http.server import BaseHTTPRequestHandler
from token_tree_builder import TokenTreeBuilder

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # Read request body
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))

            # Validate input
            prompt = data.get('prompt')
            if not prompt:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'Prompt is required'}).encode())
                return

            # Get parameters
            num_runs = data.get('num_runs', 30)
            top_logprobs = data.get('top_logprobs', 3)
            max_tokens = 15

            # Validate ranges
            if num_runs < 1 or num_runs > 200:
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'num_runs must be between 1 and 200'}).encode())
                return

            # Get API key
            api_key = os.environ.get('OPENAI_API_KEY')
            if not api_key:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({'error': 'OpenAI API key not configured'}).encode())
                return

            # Build tree
            builder = TokenTreeBuilder(api_key)
            root, first_completion = builder.build_tree(prompt, num_runs, max_tokens, top_logprobs)
            tree_data = root.to_dict()

            # Send response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({
                'tree': tree_data,
                'first_completion': first_completion,  # Guaranteed grammatical completion
                'status': 'success',
                'params': {
                    'prompt': prompt,
                    'num_runs': num_runs,
                    'top_logprobs': top_logprobs,
                    'max_tokens': max_tokens
                }
            }).encode())

        except Exception as e:
            import traceback
            print(f"Error: {e}")
            print(traceback.format_exc())
            self.send_response(500)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
