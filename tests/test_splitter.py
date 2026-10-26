import pytest
from app.errors import InputEmptyError, InputTooLongError
from app.splitter import reassemble_sentences, split_sentences


def test_abbreviations_and_decimals_not_split():
    text = "Dr. Smith paid $3.14 for apples, e.g. Granny Smith. It was good!"
    segments = split_sentences(text)
    assert len(segments) == 2
    assert segments[0].text == "Dr. Smith paid $3.14 for apples, e.g. Granny Smith."
    assert segments[1].text == "It was good!"
    assert reassemble_sentences(segments) == text


def test_initials_not_split():
    text = "J. R. R. Tolkien wrote books. C. S. Lewis did too."
    segments = split_sentences(text)
    assert len(segments) == 2
    assert segments[0].text == "J. R. R. Tolkien wrote books."
    assert segments[1].text == "C. S. Lewis did too."


def test_final_abbreviation_ends_sentence():
    text = "We bought apples, oranges, etc."
    segments = split_sentences(text)
    assert len(segments) == 1
    assert segments[0].text == "We bought apples, oranges, etc."


def test_quotes_and_brackets_kept_with_sentence():
    text = 'She asked, "Are you sure?" (Really!) Yes.'
    segments = split_sentences(text)
    assert [s.text for s in segments] == [
        'She asked, "Are you sure?"',
        "(Really!)",
        "Yes.",
    ]
    assert reassemble_sentences(segments) == text


def test_paragraph_breaks_preserved():
    text = "First paragraph line.\n\nSecond paragraph line."
    segments = split_sentences(text)
    assert len(segments) == 2
    assert segments[0].trailing_whitespace == "\n\n"
    assert reassemble_sentences(segments) == text


def test_empty_or_whitespace_rejected():
    with pytest.raises(InputEmptyError):
        split_sentences("")
    with pytest.raises(InputEmptyError):
        split_sentences("   \n\t  ")


def test_max_length_boundary():
    exact_20k = "a" * 19999 + "."
    segments = split_sentences(exact_20k)
    assert len(segments) == 1
    assert len(reassemble_sentences(segments)) == 20000

    with pytest.raises(InputTooLongError):
        split_sentences("a" * 20001)