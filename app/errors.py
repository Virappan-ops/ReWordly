from fastapi import Request
from fastapi.responses import JSONResponse


class RewordlyError(Exception):
    """Base error for Rewordly with stable error code, user message, and HTTP status."""

    code: str = "internal_error"
    message: str = "An unexpected error occurred."
    status_code: int = 500

    def __init__(self, message: str | None = None):
        if message is not None:
            self.message = message
        super().__init__(self.message)


class ProviderError(RewordlyError):
    """Base class for provider-related errors."""


class ProviderUnavailable(ProviderError):
    code = "provider_unavailable"
    message = "The selected provider is unavailable. Check that it is running and try again."
    status_code = 503


class ProviderRateLimited(ProviderError):
    code = "provider_rate_limited"
    message = "The provider is rate-limiting requests. Please wait and try again."
    status_code = 429


class ProviderTimeout(ProviderError):
    code = "provider_timeout"
    message = "The provider took too long to respond. Please try again."
    status_code = 504


class ProviderConfigurationError(ProviderError):
    code = "provider_configuration_error"
    message = "Gemini is not configured. Set GEMINI_API_KEY and restart Rewordly."
    status_code = 503


class ProviderResponseError(ProviderError):
    code = "provider_response_error"
    message = "The provider returned no usable text. Please try again."
    status_code = 502


class InputEmptyError(RewordlyError):
    code = "empty_input"
    message = "Enter text before running a rewrite."
    status_code = 400


class InputTooLongError(RewordlyError):
    code = "input_too_long"
    message = "Your input is too long. The maximum is 20,000 characters."
    status_code = 413


class InvalidInputError(RewordlyError):
    code = "invalid_options"
    message = "One or more request options are invalid."
    status_code = 400


async def rewordly_error_handler(_request: Request, exc: RewordlyError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
            }
        },
    )