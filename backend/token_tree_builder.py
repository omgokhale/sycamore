"""
TokenTreeBuilder for building token probability trees using OpenAI API.

This module handles integration with OpenAI's API to generate multiple completions
with logprobs enabled, then merges them into a single tree structure showing
all possible token paths and their probabilities.
"""

from openai import OpenAI
from token_tree import TokenTree


class TokenTreeBuilder:
    """
    Builds a merged token probability tree by running multiple completions
    and combining their logprobs into a single tree structure.
    """

    def __init__(self, api_key):
        """
        Initialize the builder with OpenAI API key.

        Args:
            api_key: OpenAI API key
        """
        self.client = OpenAI(api_key=api_key)

    def build_tree(self, prompt, num_runs=50, max_tokens=15, top_logprobs=3):
        """
        Main method to build the token tree.

        Args:
            prompt: User input prompt
            num_runs: Number of completions to generate
            max_tokens: Maximum tokens per completion
            top_logprobs: Number of alternative tokens to track at each position

        Returns:
            TokenTree: Root node containing merged tree
        """
        # Reset node counter for consistent IDs
        TokenTree.reset_counter()

        # Create root node with placeholder token
        root = TokenTree(token_id="<ROOT>", token_bytes="<ROOT>", log_prob=0.0)

        # Modify prompt to encourage shorter responses
        modified_prompt = f"Answer very briefly in one short sentence (under 15 words): {prompt}"

        # Get all completions in a single API call using n parameter
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": modified_prompt}],
                max_tokens=max_tokens,
                logprobs=True,
                top_logprobs=top_logprobs,
                n=num_runs,  # Generate all completions in one call!
                temperature=1.0  # Use sampling for diverse completions
            )

            # Process all completions
            for i, choice in enumerate(response.choices):
                try:
                    # Mark first completion as the tracked path
                    is_tracked = (i == 0)
                    tree_from_completion = self._process_completion(choice, is_tracked_path=is_tracked)
                    if tree_from_completion:
                        root.merge_children([tree_from_completion])
                except Exception as e:
                    print(f"Warning: Failed to process completion: {e}")
                    continue

        except Exception as e:
            print(f"Error calling OpenAI API: {e}")
            raise

        return root

    def _process_completion(self, choice, is_tracked_path=False):
        """
        Process a single completion choice into a tree structure.

        Traverses token-by-token, creating nodes for each token
        and its alternatives from top_logprobs.

        Args:
            choice: OpenAI API choice object
            is_tracked_path: Whether this completion should be marked as the tracked path

        Returns:
            TokenTree: Root node of the tree for this completion
        """
        logprobs_data = choice.logprobs.content

        if not logprobs_data:
            return None

        # Start with first token
        first_token_logprobs = logprobs_data[0].top_logprobs
        if not first_token_logprobs:
            return None

        # Create node for the selected token (first in top_logprobs)
        current_node = self._create_node_from_logprob(
            first_token_logprobs[0],
            was_selected=True,
            is_tracked_path=is_tracked_path
        )
        root_node = current_node

        # Process each subsequent token position
        for position_data in logprobs_data[1:]:
            # Collect all alternative tokens at this position
            alternative_trees = []
            for i, logprob_obj in enumerate(position_data.top_logprobs):
                # First token (index 0) is the actually selected token
                is_selected = (i == 0)
                # Only mark as tracked path if this is the selected token AND we're on the tracked completion
                is_on_tracked_path = is_tracked_path and is_selected
                child_node = self._create_node_from_logprob(
                    logprob_obj,
                    was_selected=is_selected,
                    is_tracked_path=is_on_tracked_path
                )
                alternative_trees.append(child_node)

            if not alternative_trees:
                break

            # The first alternative is the selected token
            selected = alternative_trees[0]

            # Merge all alternatives (including selected) as children
            current_node.merge_children(alternative_trees)

            # Move to selected token for next iteration
            current_node = current_node.children[selected.token_id]

        return root_node

    def _create_node_from_logprob(self, logprob_obj, was_selected=False, is_tracked_path=False):
        """
        Create a TokenTree node from OpenAI logprob object.

        Args:
            logprob_obj: LogProb object from OpenAI API
            was_selected: Whether this token was actually selected (vs alternative)
            is_tracked_path: Whether this token is on the tracked path

        Returns:
            TokenTree: New node with token data
        """
        # Decode token bytes to string
        try:
            token_str = logprob_obj.token
        except Exception:
            token_str = str(logprob_obj.token)

        return TokenTree(
            token_id=logprob_obj.token,
            token_bytes=token_str,
            log_prob=logprob_obj.logprob,
            was_selected=was_selected,
            is_tracked_path=is_tracked_path
        )
