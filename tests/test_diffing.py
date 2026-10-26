from app.diffing import compute_word_diff, tokenize_with_whitespace


def test_tokenization_apostrophes_and_decimals():
    text = "Don't pay 3.14, friend!"
    tokens = [t.text for t in tokenize_with_whitespace(text) if not t.is_whitespace]
    assert tokens == ["Don't", "pay", "3.14", ",", "friend", "!"]


def test_unchanged_text_diff():
    text = "The quick brown fox."
    diff = compute_word_diff(text, text)
    assert diff["input_tokens"] == [{"text": text, "type": "equal"}]
    assert diff["output_tokens"] == [{"text": text, "type": "equal"}]


def test_replacement_and_whitespace_preservation():
    src = "I like red apples."
    tgt = "I love green apples."
    diff = compute_word_diff(src, tgt)

    reconstructed_src = "".join(t["text"] for t in diff["input_tokens"])
    reconstructed_tgt = "".join(t["text"] for t in diff["output_tokens"])
    assert reconstructed_src == src
    assert reconstructed_tgt == tgt

    removed = [t["text"] for t in diff["input_tokens"] if t["type"] == "removed"]
    added = [t["text"] for t in diff["output_tokens"] if t["type"] == "added"]
    assert "like red" in removed
    assert "love green" in added


def test_curly_and_straight_quotes_are_not_flagged():
    diff = compute_word_diff("The user’s “risk” score.", 'The user\'s "risk" score.')
    assert all(t["type"] == "equal" for t in diff["input_tokens"])
    assert all(t["type"] == "equal" for t in diff["output_tokens"])