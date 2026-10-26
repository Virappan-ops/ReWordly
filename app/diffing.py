from dataclasses import dataclass
from difflib import SequenceMatcher
from typing import Literal

_QUOTE_MAP = str.maketrans({"\u2018": "'", "\u2019": "'", "\u201c": '"', "\u201d": '"'})


def _match_key(token: str) -> str:
    return token.translate(_QUOTE_MAP)


@dataclass(frozen=True)
class RawToken:
    text: str
    is_whitespace: bool


@dataclass(frozen=True)
class DiffSpan:
    text: str
    type: Literal["equal", "removed", "added"]


def _is_word_char(ch: str) -> bool:
    """True for Unicode letters and numbers (excluding underscore)."""
    return ch.isalnum() and ch != "_"


def tokenize_with_whitespace(text: str) -> list[RawToken]:
    """
    Tokenize Unicode letter/number runs as words, keeping internal apostrophes
    and decimal points when surrounded by word characters.
    Represent punctuation as separate tokens and preserve whitespace tokens.
    """
    tokens: list[RawToken] = []
    n = len(text)
    i = 0

    while i < n:
        ch = text[i]

        if ch.isspace():
            start = i
            while i < n and text[i].isspace():
                i += 1
            tokens.append(RawToken(text=text[start:i], is_whitespace=True))
            continue

        if _is_word_char(ch):
            start = i
            i += 1
            while i < n:
                curr = text[i]
                if _is_word_char(curr):
                    i += 1
                elif curr in {"'", "\u2019", "."} and (i + 1 < n) and _is_word_char(text[i + 1]):
                    # Keep internal apostrophes and decimal points surrounded by word chars
                    i += 2
                else:
                    break
            tokens.append(RawToken(text=text[start:i], is_whitespace=False))
            continue

        # Any other punctuation or symbol is a separate single-character token
        tokens.append(RawToken(text=ch, is_whitespace=False))
        i += 1

    return tokens


def _merge_spans(spans: list[DiffSpan]) -> list[DiffSpan]:
    if not spans:
        return []
    merged: list[DiffSpan] = [spans[0]]
    for span in spans[1:]:
        if span.type == merged[-1].type:
            merged[-1] = DiffSpan(text=merged[-1].text + span.text, type=span.type)
        else:
            merged.append(span)
    return merged


def compute_word_diff(source: str, target: str) -> dict[str, list[dict[str, str]]]:
    """
    Compute word-level diff using difflib.SequenceMatcher on non-whitespace tokens
    while preserving original whitespace when rendering input and output panes independently.
    """
    src_raw = tokenize_with_whitespace(source)
    tgt_raw = tokenize_with_whitespace(target)

    src_word_indices = [idx for idx, tok in enumerate(src_raw) if not tok.is_whitespace]
    tgt_word_indices = [idx for idx, tok in enumerate(tgt_raw) if not tok.is_whitespace]

    src_words = [_match_key(src_raw[idx].text) for idx in src_word_indices]
    tgt_words = [_match_key(tgt_raw[idx].text) for idx in tgt_word_indices]

    matcher = SequenceMatcher(None, src_words, tgt_words, autojunk=False)

    src_status = ["equal"] * len(src_raw)
    tgt_status = ["equal"] * len(tgt_raw)

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag in ("delete", "replace"):
            for k in range(i1, i2):
                src_status[src_word_indices[k]] = "removed"
        if tag in ("insert", "replace"):
            for k in range(j1, j2):
                tgt_status[tgt_word_indices[k]] = "added"

    # Combine consecutive removed/added tokens across intervening whitespace for clean visual rendering,
    # while keeping whitespace outside changes as "equal".
    for idx, tok in enumerate(src_raw):
        if tok.is_whitespace:
            prev_removed = idx > 0 and src_status[idx - 1] == "removed"
            next_removed = idx + 1 < len(src_raw) and src_status[idx + 1] == "removed"
            src_status[idx] = "removed" if (prev_removed and next_removed) else "equal"

    for idx, tok in enumerate(tgt_raw):
        if tok.is_whitespace:
            prev_added = idx > 0 and tgt_status[idx - 1] == "added"
            next_added = idx + 1 < len(tgt_raw) and tgt_status[idx + 1] == "added"
            tgt_status[idx] = "added" if (prev_added and next_added) else "equal"

    input_spans = _merge_spans(
        [DiffSpan(text=tok.text, type=src_status[i]) for i, tok in enumerate(src_raw)]  # type: ignore[arg-type]
    )
    output_spans = _merge_spans(
        [DiffSpan(text=tok.text, type=tgt_status[i]) for i, tok in enumerate(tgt_raw)]  # type: ignore[arg-type]
    )

    return {
        "input_tokens": [{"text": s.text, "type": s.type} for s in input_spans],
        "output_tokens": [{"text": s.text, "type": s.type} for s in output_spans],
    }