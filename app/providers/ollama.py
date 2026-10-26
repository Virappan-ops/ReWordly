import json
import re
import httpx
from app.config import Config
from app.errors import (
    ProviderRateLimited,
    ProviderResponseError,
    ProviderTimeout,
    ProviderUnavailable,
)
from app.prompts import (
    build_hf_humanizer_prompt,
    build_rewrite_prompt,
    build_synonym_prompt,
)
from app.providers.base import Mode, Provider, RewriteOptions


def _parse_synonym_candidates(raw: str, original: str) -> list[str]:
    cleaned = raw.strip()
    match = re.search(r"\[.*\]", cleaned, re.DOTALL)
    candidates: list[str] = []
    if match:
        try:
            parsed = json.loads(match.group(0))
            if isinstance(parsed, list):
                candidates = [str(item).strip() for item in parsed if isinstance(item, (str, int, float))]
        except json.JSONDecodeError:
            pass

    if not candidates:
        for line in cleaned.splitlines():
            line = re.sub(r"^[\s\-\*\d\.\)\"']+|[\"'\s]+$", "", line)
            if line and len(line) <= 80:
                candidates.append(line)

    seen: set[str] = set()
    result: list[str] = []
    orig_lower = original.strip().lower()
    for c in candidates:
        c_low = c.lower()
        if c and c_low != orig_lower and c_low not in seen:
            seen.add(c_low)
            result.append(c)
        if len(result) >= 5:
            break
    return result


class OllamaProvider(Provider):
    """Local Ollama provider communicating with http://localhost:11434."""

    def _request_ollama(
        self,
        prompt: str,
        model_override: str | None = None,
        raw_mode: bool = False,
    ) -> str:
        base_url = Config.get_ollama_url()
        model = model_override or Config.get_ollama_model()
        read_timeout = Config.get_ollama_timeout()

        timeout = httpx.Timeout(read_timeout, connect=5.0)
        url = f"{base_url}/api/generate"

        payload: dict = {
            "model": model,
            "prompt": prompt,
            "stream": False,
            "options": {"num_ctx": 8192},
        }

        if raw_mode:
            payload["raw"] = True
            payload["options"] = {
                "temperature": 1.0,
                "top_p": 0.95,
                "top_k": 64,
                "min_p": 0.0,
                "repeat_penalty": 1.0,
                "num_ctx": 8192,
                "num_predict": 2048,
                "stop": ["### ", "### Rewritten:"],
            }

        try:
            with httpx.Client(timeout=timeout) as client:
                response = client.post(url, json=payload)
        except httpx.TimeoutException as exc:
            raise ProviderTimeout() from exc
        except (httpx.ConnectError, httpx.NetworkError, httpx.RequestError) as exc:
            raise ProviderUnavailable() from exc

        if response.status_code == 429:
            raise ProviderRateLimited()
        if response.status_code == 404:
            raise ProviderUnavailable(
                f"Ollama could not find the model '{model}'. Run: ollama pull {model}"
            )
        if response.status_code >= 500:
            raise ProviderUnavailable()
        if response.status_code >= 400:
            raise ProviderResponseError()

        try:
            data = response.json()
        except ValueError as exc:
            raise ProviderResponseError() from exc

        if not isinstance(data, dict):
            raise ProviderResponseError()

        generated = str(data.get("response", "")).strip()
        if not generated:
            raise ProviderResponseError()

        return generated

    def generate(self, text: str, mode: Mode, options: RewriteOptions) -> str:
        if mode == "humanizer":
            humanizer_model = Config.get_ollama_humanizer_model()
            if "humanizer" in humanizer_model.lower():
                prompt = build_hf_humanizer_prompt(text)
                result = self._request_ollama(
                    prompt=prompt,
                    model_override=humanizer_model,
                    raw_mode=True,
                )
            else:
                prompt = build_rewrite_prompt(text=text, mode=mode, options=options)
                result = self._request_ollama(prompt=prompt, model_override=humanizer_model)
        else:
            prompt = build_rewrite_prompt(text=text, mode=mode, options=options)
            result = self._request_ollama(prompt=prompt)

        if not result or result.strip() == text.strip():
            raise ProviderResponseError()
        return result

    def suggest_synonyms(self, selection: str, context: str) -> list[str]:
        prompt = build_synonym_prompt(selection=selection, context=context)
        raw = self._request_ollama(prompt=prompt)
        return _parse_synonym_candidates(raw, selection)