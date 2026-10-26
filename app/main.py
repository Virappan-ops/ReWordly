from pathlib import Path
from typing import Any
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from fastapi.middleware.cors import CORSMiddleware

from app.config import Config
from app.diffing import compute_word_diff
from app.errors import (
    InputEmptyError,
    InputTooLongError,
    InvalidInputError,
    RewordlyError,
    rewordly_error_handler,
)
from app.providers import get_provider
from app.providers.base import (
    VALID_LENGTHS,
    VALID_MODES,
    VALID_TONES,
    RewriteOptions,
)
from app.splitter import split_sentences

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"

app = FastAPI(title="Rewordly", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins (or you can specify your exact Vercel URL)
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, OPTIONS, etc.)
    allow_headers=["*"],  # Allows all headers
)

app.add_exception_handler(RewordlyError, rewordly_error_handler)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, _exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=400,
        content={
            "error": {
                "code": "invalid_options",
                "message": "One or more request options are invalid.",
            }
        },
    )


class OptionsPayload(BaseModel):
    strength: Any = 3
    tone: Any = "neutral"
    length: Any = "same"


class RewriteRequest(BaseModel):
    text: Any = ""
    provider: Any = "ollama"
    mode: Any = "paraphraser"
    options: OptionsPayload = OptionsPayload()


class DiffRequest(BaseModel):
    source: str
    target: str


class SynonymRequest(BaseModel):
    selection: Any = ""
    context: Any = ""
    provider: Any = "ollama"


LOCAL_SYNONYM_FALLBACK: dict[str, list[str]] = {
    "good": ["excellent", "effective", "favorable", "strong", "positive"],
    "bad": ["poor", "unfavorable", "substandard", "inadequate", "negative"],
    "important": ["crucial", "essential", "significant", "vital", "key"],
    "fast": ["quick", "rapid", "swift", "prompt", "speedy"],
    "slow": ["gradual", "unhurried", "measured", "deliberate", "sluggish"],
    "use": ["utilize", "employ", "apply", "leverage", "adopt"],
    "make": ["create", "produce", "build", "construct", "generate"],
    "show": ["demonstrate", "display", "illustrate", "reveal", "indicate"],
    "help": ["assist", "support", "aid", "facilitate", "guide"],
    "change": ["modify", "alter", "adjust", "transform", "revise"],
}


def _validate_rewrite_request(payload: RewriteRequest) -> tuple[str, str, str, RewriteOptions]:
    if not isinstance(payload.text, str) or not payload.text.strip():
        raise InputEmptyError()
    if len(payload.text) > Config.MAX_INPUT_LENGTH:
        raise InputTooLongError()

    if not isinstance(payload.provider, str):
        raise InvalidInputError("Invalid provider.")
    provider_name = payload.provider.strip().lower()
    if provider_name not in {"ollama", "gemini"}:
        raise InvalidInputError("Provider must be 'ollama' or 'gemini'.")

    if not isinstance(payload.mode, str) or payload.mode not in VALID_MODES:
        raise InvalidInputError("Mode must be 'paraphraser' or 'humanizer'.")

    strength = payload.options.strength
    if isinstance(strength, bool) or not isinstance(strength, int) or not (1 <= strength <= 5):
        raise InvalidInputError("Strength must be an integer between 1 and 5.")

    tone = payload.options.tone
    if not isinstance(tone, str) or tone not in VALID_TONES:
        raise InvalidInputError("Tone must be 'neutral', 'formal', or 'casual'.")

    length = payload.options.length
    if not isinstance(length, str) or length not in VALID_LENGTHS:
        raise InvalidInputError("Length must be 'shorter', 'same', or 'longer'.")

    return (
        payload.text,
        provider_name,
        payload.mode,
        RewriteOptions(strength=strength, tone=tone, length=length),  # type: ignore[arg-type]
    )


@app.post("/api/rewrite")
def rewrite_endpoint(payload: RewriteRequest) -> dict[str, Any]:
    text, provider_name, mode, options = _validate_rewrite_request(payload)

    # Split sentences deterministically to validate and preserve structure metadata
    segments = split_sentences(text)
    provider = get_provider(provider_name)

    rewritten_text = provider.generate(text=text, mode=mode, options=options)  # type: ignore[arg-type]
    diff = compute_word_diff(text, rewritten_text)

    # Determine exact model signature used for UI tracking/debugging
    active_model = provider_name
    if provider_name == "ollama":
        from app.config import Config
        if mode == "humanizer":
            active_model = Config.get_ollama_humanizer_model()
        else:
            active_model = Config.get_ollama_model()
    elif provider_name == "gemini":
        from app.config import Config
        active_model = Config.get_gemini_model()

    return {
        "input_text": text,
        "output_text": rewritten_text,
        "provider": provider_name,
        "model_used": active_model,
        "mode": mode,
        "sentence_count": len(segments),
        "diff": diff,
    }


@app.post("/api/diff")
async def diff_endpoint(payload: DiffRequest) -> dict[str, Any]:
    if len(payload.source) > Config.MAX_INPUT_LENGTH or len(payload.target) > Config.MAX_INPUT_LENGTH:
        raise InputTooLongError()
    return {"diff": compute_word_diff(payload.source, payload.target)}


@app.post("/api/synonyms")
def synonyms_endpoint(payload: SynonymRequest) -> dict[str, Any]:
    if not isinstance(payload.selection, str) or not payload.selection.strip():
        raise InvalidInputError("Select a word or short phrase first.")
    selection = payload.selection.strip()
    if len(selection) > 200:
        raise InvalidInputError("Selection is too long for synonym suggestions.")

    context = payload.context if isinstance(payload.context, str) else selection
    if len(context) > Config.MAX_INPUT_LENGTH:
        raise InputTooLongError()

    provider_name = payload.provider.strip().lower() if isinstance(payload.provider, str) else ""
    if provider_name not in {"ollama", "gemini"}:
        raise InvalidInputError("Provider must be 'ollama' or 'gemini'.")

    provider = get_provider(provider_name)

    try:
        candidates = provider.suggest_synonyms(selection=selection, context=context)
    except RewordlyError:
        # Fallback to local dictionary if provider cannot suggest candidates
        candidates = LOCAL_SYNONYM_FALLBACK.get(selection.lower(), [])

    if not candidates:
        candidates = LOCAL_SYNONYM_FALLBACK.get(selection.lower(), [])

    return {
        "selection": selection,
        "candidates": candidates,
        "message": "" if candidates else "No synonym suggestions are available for this selection.",
    }


@app.get("/")
async def serve_index() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "index.html")


app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")