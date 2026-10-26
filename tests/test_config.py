import pytest

from app.config import Config

ENV_NAMES = (
    "GEMINI_API_KEY",
    "REWORDLY_GEMINI_MODEL",
    "REWORDLY_OLLAMA_URL",
    "REWORDLY_OLLAMA_MODEL",
    "REWORDLY_OLLAMA_TIMEOUT",
)


@pytest.fixture(autouse=True)
def clean_env(monkeypatch):
    """Start every test with none of Rewordly's variables set."""
    for name in ENV_NAMES:
        monkeypatch.delenv(name, raising=False)


def test_max_input_length_is_20000():
    assert Config.MAX_INPUT_LENGTH == 20_000


# --- Gemini API key ---------------------------------------------------------

def test_gemini_key_missing_returns_empty_string():
    assert Config.get_gemini_api_key() == ""


@pytest.mark.parametrize("raw", ["", "   ", "\t"])
def test_gemini_key_blank_is_treated_as_missing(monkeypatch, raw):
    monkeypatch.setenv("GEMINI_API_KEY", raw)
    assert Config.get_gemini_api_key() == ""


def test_gemini_key_is_stripped(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "  test-key-123  ")
    assert Config.get_gemini_api_key() == "test-key-123"


def test_gemini_key_is_not_read_from_dotenv_file(monkeypatch, tmp_path):
    (tmp_path / ".env").write_text("GEMINI_API_KEY=from-file\n")
    monkeypatch.chdir(tmp_path)
    assert Config.get_gemini_api_key() == ""


# --- Gemini model -----------------------------------------------------------

def test_gemini_model_has_a_default():
    assert Config.get_gemini_model()


def test_gemini_model_can_be_overridden(monkeypatch):
    monkeypatch.setenv("REWORDLY_GEMINI_MODEL", "  my-test-model  ")
    assert Config.get_gemini_model() == "my-test-model"


def test_gemini_model_blank_falls_back_to_default(monkeypatch):
    default = Config.get_gemini_model()
    monkeypatch.setenv("REWORDLY_GEMINI_MODEL", "   ")
    assert Config.get_gemini_model() == default


# --- Ollama URL -------------------------------------------------------------

def test_ollama_url_default():
    assert Config.get_ollama_url() == "http://localhost:11434"


def test_ollama_url_override_strips_trailing_slash(monkeypatch):
    monkeypatch.setenv("REWORDLY_OLLAMA_URL", "http://127.0.0.1:11434/")
    assert Config.get_ollama_url() == "http://127.0.0.1:11434"


def test_ollama_url_blank_falls_back_to_default(monkeypatch):
    monkeypatch.setenv("REWORDLY_OLLAMA_URL", "   ")
    assert Config.get_ollama_url() == "http://localhost:11434"


# --- Ollama model -----------------------------------------------------------

def test_ollama_model_has_a_default():
    assert Config.get_ollama_model()


def test_ollama_model_can_be_overridden(monkeypatch):
    monkeypatch.setenv("REWORDLY_OLLAMA_MODEL", " my-local-model ")
    assert Config.get_ollama_model() == "my-local-model"


def test_ollama_model_blank_falls_back_to_default(monkeypatch):
    default = Config.get_ollama_model()
    monkeypatch.setenv("REWORDLY_OLLAMA_MODEL", "  ")
    assert Config.get_ollama_model() == default


# --- Ollama timeout ---------------------------------------------------------

def test_ollama_timeout_default_is_120_seconds():
    assert Config.get_ollama_timeout() == 120.0


@pytest.mark.parametrize(
    "raw, expected",
    [
        ("45", 45.0),
        ("2.5", 2.5),
        (" 30 ", 30.0),
        ("0", 120.0),
        ("-5", 120.0),
        ("abc", 120.0),
        ("", 120.0),
    ],
)
def test_ollama_timeout_parsing(monkeypatch, raw, expected):
    monkeypatch.setenv("REWORDLY_OLLAMA_TIMEOUT", raw)
    assert Config.get_ollama_timeout() == expected