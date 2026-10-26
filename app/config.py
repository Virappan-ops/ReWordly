import os
from dotenv import load_dotenv

# Load variables from .env file automatically
load_dotenv()

class Config:
    """Environment-variable configuration. Never logs or persists secrets."""

    MAX_INPUT_LENGTH: int = 20_000

    @staticmethod
    def get_gemini_api_key() -> str:
        return os.environ.get("GEMINI_API_KEY", "").strip()

    @staticmethod
    def get_gemini_model() -> str:
        model = os.environ.get("REWORDLY_GEMINI_MODEL", "").strip()
        return model if model else "gemini-2.5-flash"

    @staticmethod
    def get_ollama_url() -> str:
        url = os.environ.get("REWORDLY_OLLAMA_URL", "").strip()
        return url.rstrip("/") if url else "http://localhost:11434"

    @staticmethod
    def get_ollama_model() -> str:
        model = os.environ.get("REWORDLY_OLLAMA_MODEL", "").strip()
        return model if model else "gemma4:latest"

    @staticmethod
    def get_ollama_humanizer_model() -> str:
        model = os.environ.get("REWORDLY_OLLAMA_HUMANIZER_MODEL", "").strip()
        return model if model else Config.get_ollama_model()

    @staticmethod
    def get_ollama_timeout() -> float:
        raw = os.environ.get("REWORDLY_OLLAMA_TIMEOUT", "120").strip()
        try:
            val = float(raw)
            return val if val > 0 else 120.0
        except ValueError:
            return 120.0