from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_empty_input_returns_400():
    resp = client.post("/api/rewrite", json={"text": "   ", "provider": "ollama", "mode": "paraphraser"})
    assert resp.status_code == 400
    data = resp.json()
    assert data["error"]["code"] == "empty_input"
    assert data["error"]["message"] == "Enter text before running a rewrite."


def test_over_limit_input_returns_413():
    resp = client.post(
        "/api/rewrite",
        json={"text": "x" * 20001, "provider": "ollama", "mode": "paraphraser"},
    )
    assert resp.status_code == 413
    data = resp.json()
    assert data["error"]["code"] == "input_too_long"
    assert data["error"]["message"] == "Your input is too long. The maximum is 20,000 characters."


def test_20000_char_boundary_passes_validation(monkeypatch):
    from app.providers.ollama import OllamaProvider

    monkeypatch.setattr(OllamaProvider, "generate", lambda self, text, mode, options: "Rewritten boundary text.")
    resp = client.post(
        "/api/rewrite",
        json={"text": "a" * 20000, "provider": "ollama", "mode": "paraphraser"},
    )
    assert resp.status_code == 200
    assert resp.json()["output_text"] == "Rewritten boundary text."


def test_invalid_options_rejected():
    # Strength out of 1-5 range
    resp = client.post(
        "/api/rewrite",
        json={
            "text": "Hello world.",
            "provider": "ollama",
            "mode": "paraphraser",
            "options": {"strength": 6, "tone": "neutral", "length": "same"},
        },
    )
    assert resp.status_code == 400
    assert resp.json()["error"]["code"] == "invalid_options"

    # Invalid tone
    resp2 = client.post(
        "/api/rewrite",
        json={
            "text": "Hello world.",
            "provider": "ollama",
            "mode": "paraphraser",
            "options": {"strength": 3, "tone": "pirate", "length": "same"},
        },
    )
    assert resp2.status_code == 400