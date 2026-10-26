from app.errors import InvalidInputError
from app.providers.base import Provider
from app.providers.gemini import GeminiProvider
from app.providers.ollama import OllamaProvider

_REGISTRY: dict[str, Provider] = {
    "ollama": OllamaProvider(),
    "gemini": GeminiProvider(),
}


def register_provider(name: str, provider: Provider) -> None:
    _REGISTRY[name.lower()] = provider


def get_provider(name: str) -> Provider:
    key = (name or "").strip().lower()
    if key not in _REGISTRY:
        raise InvalidInputError(f"Unknown provider '{name}'. Choose 'ollama' or 'gemini'.")
    return _REGISTRY[key]