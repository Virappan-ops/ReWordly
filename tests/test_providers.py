import httpx
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)
_real_client_post = httpx.Client.post


def _patch_ollama_post(monkeypatch, handler):
    """Patch httpx.Client.post to intercept Ollama API calls and let internal TestClient traffic pass."""
    def _wrapped(self, url, *args, **kwargs):
        url_str = str(url)
        if url_str.startswith("http://localhost:11434") or url_str.startswith("http://127.0.0.1:11434"):
            return handler(self, url, *args, **kwargs)
        return _real_client_post(self, url, *args, **kwargs)

    monkeypatch.setattr(httpx.Client, "post", _wrapped)


def test_missing_gemini_key_returns_503(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    resp = client.post(
        "/api/rewrite",
        json={"text": "Test sentence.", "provider": "gemini", "mode": "paraphraser"},
    )
    assert resp.status_code == 503
    assert resp.json()["error"] == {
        "code": "provider_configuration_error",
        "message": "Gemini is not configured. Set GEMINI_API_KEY and restart Rewordly.",
    }


def test_ollama_unavailable_returns_503(monkeypatch):
    def mock_post(*args, **kwargs):
        raise httpx.ConnectError("Connection refused")

    _patch_ollama_post(monkeypatch, mock_post)
    resp = client.post(
        "/api/rewrite",
        json={"text": "Test sentence.", "provider": "ollama", "mode": "paraphraser"},
    )
    assert resp.status_code == 503
    assert resp.json()["error"]["message"] == (
        "The selected provider is unavailable. Check that it is running and try again."
    )


def test_ollama_timeout_returns_504(monkeypatch):
    def mock_post(*args, **kwargs):
        raise httpx.ReadTimeout("Timed out")

    _patch_ollama_post(monkeypatch, mock_post)
    resp = client.post(
        "/api/rewrite",
        json={"text": "Test sentence.", "provider": "ollama", "mode": "paraphraser"},
    )
    assert resp.status_code == 504
    assert resp.json()["error"]["message"] == (
        "The provider took too long to respond. Please try again."
    )


def test_ollama_rate_limit_returns_429(monkeypatch):
    def mock_post(*args, **kwargs):
        return httpx.Response(429, json={"error": "rate limited"})

    _patch_ollama_post(monkeypatch, mock_post)
    resp = client.post(
        "/api/rewrite",
        json={"text": "Test sentence.", "provider": "ollama", "mode": "paraphraser"},
    )
    assert resp.status_code == 429
    assert resp.json()["error"]["message"] == (
        "The provider is rate-limiting requests. Please wait and try again."
    )


def test_empty_provider_response_returns_502(monkeypatch):
    def mock_post(*args, **kwargs):
        return httpx.Response(200, json={"response": "   "})

    _patch_ollama_post(monkeypatch, mock_post)
    resp = client.post(
        "/api/rewrite",
        json={"text": "Test sentence.", "provider": "ollama", "mode": "paraphraser"},
    )
    assert resp.status_code == 502
    assert resp.json()["error"]["message"] == (
        "The provider returned no usable text. Please try again."
    )


def test_gemini_never_leaks_api_key_in_error(monkeypatch):
    secret = "AIzaSy_SUPER_SECRET_TEST_KEY_99999"
    monkeypatch.setenv("GEMINI_API_KEY", secret)

    from google import genai

    class BrokenModels:
        def generate_content(self, **kwargs):
            raise RuntimeError(f"Upstream failure with key={secret}")

    class BrokenClient:
        def __init__(self, api_key):
            self.models = BrokenModels()

    monkeypatch.setattr(genai, "Client", BrokenClient)

    resp = client.post(
        "/api/rewrite",
        json={"text": "Hello there.", "provider": "gemini", "mode": "humanizer"},
    )
    assert resp.status_code == 502
    body_text = resp.text
    assert secret not in body_text