import asyncio
import json
import os
import urllib.error
import urllib.request
from typing import Any, Dict

class OpenAiRequestError(RuntimeError):
    pass


class OpenAiClient:
    """Small dependency-free client; the API key stays only in the AI service environment."""

    def __init__(self) -> None:
        self._api_key = os.getenv("OPENAI_API_KEY", "").strip()
        self._model = os.getenv("OPENAI_MODEL", "gpt-4.1-mini")
        self._timeout_seconds = max(5, min(int(os.getenv("OPENAI_TIMEOUT_SECONDS", "45")), 120))

    @property
    def is_configured(self) -> bool:
        return bool(self._api_key)

    async def create_business_analysis(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        if not self.is_configured:
            raise OpenAiRequestError("OPENAI_API_KEY is not configured")

        body = {
            "model": self._model,
            "temperature": 0.2,
            # json_object supports the existing configurable model while Pydantic
            # validates the exact response shape immediately after this call.
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        }
        request = urllib.request.Request(
            "https://api.openai.com/v1/chat/completions",
            data=json.dumps(body, ensure_ascii=False).encode("utf-8"),
            headers={"Authorization": f"Bearer {self._api_key}", "Content-Type": "application/json"},
            method="POST",
        )
        try:
            payload = await asyncio.to_thread(self._post, request)
            content = payload["choices"][0]["message"]["content"]
            return json.loads(content)
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, KeyError, TypeError, ValueError) as error:
            raise OpenAiRequestError("OpenAI business-analysis request failed") from error

    def _post(self, request: urllib.request.Request) -> Dict[str, Any]:
        with urllib.request.urlopen(request, timeout=self._timeout_seconds) as response:
            return json.loads(response.read().decode("utf-8"))
