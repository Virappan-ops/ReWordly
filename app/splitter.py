from dataclasses import dataclass
from typing import Iterable
from app.config import Config
from app.errors import InputEmptyError, InputTooLongError

DEFAULT_ABBREVIATIONS: frozenset[str] = frozenset(
    {
        "mr.",
        "mrs.",
        "ms.",
        "dr.",
        "prof.",
        "sr.",
        "jr.",
        "st.",
        "mt.",
        "capt.",
        "col.",
        "gen.",
        "lt.",
        "sgt.",
        "corp.",
        "inc.",
        "ltd.",
        "co.",
        "vs.",
        "etc.",
        "e.g.",
        "i.e.",
        "cf.",
        "al.",
        "fig.",
        "no.",
        "vol.",
        "rev.",
        "est.",
        "dept.",
        "univ.",
        "assn.",
        "bros.",
        "ph.d.",
        "m.d.",
        "b.a.",
        "m.a.",
        "u.s.",
        "u.k.",
        "jan.",
        "feb.",
        "mar.",
        "apr.",
        "jun.",
        "jul.",
        "aug.",
        "sep.",
        "sept.",
        "oct.",
        "nov.",
        "dec.",
    }
)

CLOSING_QUOTES_AND_BRACKETS = frozenset({'"', "'", "\u201d", "\u2019", ")", "]", "}", "\u00bb"})
OPENING_QUOTES_AND_BRACKETS = frozenset({'"', "'", "\u201c", "\u2018", "(", "[", "{", "\u00ab"})


@dataclass(frozen=True)
class SentenceSegment:
    text: str
    trailing_whitespace: str


def _extract_last_token(text: str, dot_index: int) -> str:
    """Return the token ending at dot_index (inclusive), stripped of leading quotes/brackets."""
    i = dot_index
    while i > 0 and not text[i - 1].isspace():
        i -= 1
    token = text[i : dot_index + 1]
    while token and token[0] in OPENING_QUOTES_AND_BRACKETS:
        token = token[1:]
    return token


def _is_initial(token: str) -> bool:
    """Return True if token is a single uppercase initial like 'A.' or 'J.'."""
    return len(token) == 2 and token[0].isupper() and token[1] == "."


def _next_non_space_char(text: str, pos: int) -> str | None:
    while pos < len(text) and text[pos].isspace():
        pos += 1
    return text[pos] if pos < len(text) else None


def split_sentences(
    text: str,
    abbreviations: Iterable[str] | None = None,
) -> list[SentenceSegment]:
    """
    Deterministic state-machine sentence splitter using Python's standard library.
    Preserves exact original text and trailing whitespace for lossless reassembly.
    """
    if not text or not text.strip():
        raise InputEmptyError()
    if len(text) > Config.MAX_INPUT_LENGTH:
        raise InputTooLongError()

    abbr_set = (
        frozenset(a.lower() for a in abbreviations)
        if abbreviations is not None
        else DEFAULT_ABBREVIATIONS
    )

    segments: list[SentenceSegment] = []
    n = len(text)
    start = 0

    # Skip leading whitespace if any by attaching it to the first sentence
    i = 0
    while i < n:
        # Paragraph break (two or more newlines, or newline boundary between paragraphs)
        if text[i] == "\n":
            # Check if there is a blank line (paragraph break)
            j = i
            newline_count = 0
            while j < n and text[j].isspace():
                if text[j] == "\n":
                    newline_count += 1
                j += 1
            if newline_count >= 2 and text[start:i].strip():
                segments.append(
                    SentenceSegment(
                        text=text[start:i],
                        trailing_whitespace=text[i:j],
                    )
                )
                start = j
                i = j
                continue

        ch = text[i]
        if ch in {".", "!", "?"}:
            # Rule: Do not split the period in a decimal number, such as 3.14
            if (
                ch == "."
                and i > 0
                and i + 1 < n
                and text[i - 1].isdigit()
                and text[i + 1].isdigit()
            ):
                i += 1
                continue

            # Consume consecutive terminal punctuation (e.g., "...", "?!")
            end_punct = i
            while end_punct + 1 < n and text[end_punct + 1] in {".", "!", "?"}:
                end_punct += 1

            # Consume any immediately following closing quotation marks or brackets
            after_closers = end_punct + 1
            while (
                after_closers < n
                and text[after_closers] in CLOSING_QUOTES_AND_BRACKETS
            ):
                after_closers += 1

            # Must be followed by whitespace or end of input
            if after_closers < n and not text[after_closers].isspace():
                i = after_closers
                continue

            # If at the very end of the input, even abbreviations end the sentence
            if after_closers == n:
                segments.append(
                    SentenceSegment(
                        text=text[start:after_closers],
                        trailing_whitespace="",
                    )
                )
                start = n
                break

            # Determine if this is an abbreviation or initial that continues the sentence
            if ch == "." and end_punct == i:
                token = _extract_last_token(text, i)
                lower_token = token.lower()

                # Check if whitespace after closer contains a paragraph break
                ws_end = after_closers
                nl_count = 0
                while ws_end < n and text[ws_end].isspace():
                    if text[ws_end] == "\n":
                        nl_count += 1
                    ws_end += 1

                if nl_count < 2:
                    # Listed abbreviation continuing the sentence
                    if lower_token in abbr_set:
                        i = after_closers
                        continue

                    # Initial pattern such as "A. B." or "A. Smith"
                    if _is_initial(token):
                        next_ch = _next_non_space_char(text, after_closers)
                        if next_ch is not None and next_ch.isupper():
                            i = after_closers
                            continue

            # Valid sentence boundary found
            ws_end = after_closers
            while ws_end < n and text[ws_end].isspace():
                ws_end += 1

            segments.append(
                SentenceSegment(
                    text=text[start:after_closers],
                    trailing_whitespace=text[after_closers:ws_end],
                )
            )
            start = ws_end
            i = ws_end
            continue

        i += 1

    if start < n:
        # Handle any remaining text without terminal punctuation
        end_idx = n
        while end_idx > start and text[end_idx - 1].isspace():
            end_idx -= 1
        segments.append(
            SentenceSegment(
                text=text[start:end_idx],
                trailing_whitespace=text[end_idx:n],
            )
        )

    return segments


def reassemble_sentences(segments: Iterable[SentenceSegment]) -> str:
    """Reassemble sentence segments preserving exact trailing whitespace."""
    return "".join(seg.text + seg.trailing_whitespace for seg in segments)