from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Literal

Mode = Literal["paraphraser", "humanizer"]
Tone = Literal["neutral", "formal", "casual"]
Length = Literal["shorter", "same", "longer"]

VALID_MODES: frozenset[str] = frozenset({"paraphraser", "humanizer"})
VALID_TONES: frozenset[str] = frozenset({"neutral", "formal", "casual"})
VALID_LENGTHS: frozenset[str] = frozenset({"shorter", "same", "longer"})


@dataclass(frozen=True)
class RewriteOptions:
    strength: int = 3
    tone: Tone = "neutral"
    length: Length = "same"


class Provider(ABC):
    """Contract for all Rewordly text generation providers."""

    @abstractmethod
    def generate(self, text: str, mode: Mode, options: RewriteOptions) -> str:
        """
        Generate a rewrite for `text` using `mode` and `options`.
        Must return non-empty generated text that is not silently identical to `text`,
        or raise a typed ProviderError.
        """
        raise NotImplementedError

    @abstractmethod
    def suggest_synonyms(self, selection: str, context: str) -> list[str]:
        """Return candidate synonym replacements for `selection` within `context`."""
        raise NotImplementedError