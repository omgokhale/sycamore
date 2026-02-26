"""
TokenTree class for representing nodes in the token probability tree.

Each node contains a token, its log probability, children, and generation count.
The tree structure is built by merging multiple completions from the LLM.
"""


class TokenTree:
    """
    Represents a node in the token probability tree.
    Each node contains a token, its logprob, children, and generation count.
    """

    _node_counter = 0

    def __init__(self, token_id, token_bytes, log_prob, was_selected=False, is_tracked_path=False):
        """
        Initialize a TokenTree node.

        Args:
            token_id: Token identifier (string or int)
            token_bytes: Decoded token string
            log_prob: Log probability from LLM API
            was_selected: Whether this token was actually selected (vs just an alternative)
            is_tracked_path: Whether this token is on THE tracked path (for camera following)
        """
        self.token_id = token_id
        self.token_bytes = token_bytes
        self.log_prob = log_prob
        self.children = {}  # Dict[token_id -> TokenTree]
        self.gen_count = 1  # How many completions selected this token
        self.was_selected = was_selected  # Track if token was on generation path
        self.is_tracked_path = is_tracked_path  # Track if this is THE path to follow
        self.node_id = TokenTree._get_next_id()

    @classmethod
    def _get_next_id(cls):
        """Generate unique node ID."""
        cls._node_counter += 1
        return cls._node_counter

    @classmethod
    def reset_counter(cls):
        """Reset node counter (useful for testing)."""
        cls._node_counter = 0

    def merge_children(self, other_trees):
        """
        Merge multiple token trees as children of this node.

        If a child with the same token_id exists, merge recursively
        and increment generation count. Otherwise, add as new child.

        Args:
            other_trees: List of TokenTree nodes to merge as children
        """
        for tree in other_trees:
            if tree.token_id in self.children:
                # Increment generation count for existing token
                self.children[tree.token_id].gen_count += 1
                # If this token was selected in any path, mark it
                if tree.was_selected:
                    self.children[tree.token_id].was_selected = True
                # If this is part of the tracked path, mark it
                if tree.is_tracked_path:
                    self.children[tree.token_id].is_tracked_path = True
                # Recursively merge their children
                self.children[tree.token_id].merge_children(
                    list(tree.children.values())
                )
            else:
                # Add as new child
                self.children[tree.token_id] = tree

    def to_dict(self):
        """
        Convert tree to JSON-serializable dictionary for frontend.

        Returns:
            dict: Tree structure with node_id, token, log_prob, gen_count, was_selected, is_tracked_path, children
        """
        return {
            'node_id': self.node_id,
            'token_id': self.token_id,
            'token': self.token_bytes,
            'log_prob': self.log_prob,
            'gen_count': self.gen_count,
            'was_selected': self.was_selected,
            'is_tracked_path': self.is_tracked_path,
            'children': [child.to_dict() for child in self.children.values()]
        }

    def __repr__(self):
        """String representation for debugging."""
        return f"TokenTree(token='{self.token_bytes}', logprob={self.log_prob:.3f}, gen_count={self.gen_count}, children={len(self.children)})"
