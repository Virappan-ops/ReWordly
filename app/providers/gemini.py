from google import genai
from app.config import Config
from app.errors import (
    ProviderConfigurationError,
    ProviderRateLimited,
    ProviderResponseError,
    ProviderTimeout,
    ProviderUnavailable,
)
from app.prompts import build_rewrite_prompt, build_synonym_prompt
from app.providers.base import Mode, Provider, RewriteOptions
from app.providers.ollama import _parse_synonym_candidates


def _classify_gemini_error(exc: Exception) -> Exception:
    code = getattr(exc, "code", None)
    name = type(exc).__name__.lower()
    text = str(exc).lower()

    if code == 429 or "resource_exhausted" in text or "quota" in text:
        return ProviderRateLimited()
    if code in (400, 401, 403) and ("api key" in text or "api_key" in text):
        return ProviderConfigurationError(
            "Gemini rejected the API key. Check GEMINI_API_KEY and restart Rewordly."
        )
    if code in (500, 502, 503) or "unavailable" in text:
        return ProviderUnavailable()
    if code == 504 or "timeout" in name or "timed out" in text or "deadline" in text:
        return ProviderTimeout()
    if "connect" in name or "network" in text:
        return ProviderUnavailable()
    return ProviderResponseError()


class GeminiProvider(Provider):
    """Google Gemini provider using google-genai SDK."""

    def _call_gemini(self, prompt: str) -> str:
        api_key = Config.get_gemini_api_key()
        if not api_key:
            raise ProviderConfigurationError()

        model = Config.get_gemini_model()

        try:
            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model=model,
                contents=prompt,
            )
        except ProviderConfigurationError:
            raise
        except Exception as exc:
            raise _classify_gemini_error(exc) from None

        text = getattr(response, "text", None)
        if not text or not str(text).strip():
            raise ProviderResponseError()

        return str(text).strip()

    def generate(self, text: str, mode: Mode, options: RewriteOptions) -> str:
        prompt = build_rewrite_prompt(text=text, mode=mode, options=options)
        result = self._call_gemini(prompt)
        if not result or result.strip() == text.strip():
            raise ProviderResponseError()
        return result

    def suggest_synonyms(self, selection: str, context: str) -> list[str]:
        prompt = build_synonym_prompt(selection=selection, context=context)
        raw = self._call_gemini(prompt)
        return _parse_synonym_candidates(raw, selection)