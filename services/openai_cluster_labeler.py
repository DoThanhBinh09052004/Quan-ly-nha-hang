"""Tích hợp OpenAI để gắn nhãn tiếng Việt cho dữ liệu cụm đã được tổng hợp."""

import asyncio
import json
import os
import urllib.error
import urllib.request
from typing import Any


EMPTY_BEHAVIOR = {
    "behavior_label": "",
    "behavior_description": "",
    "behavior_traits": [],
}

SYSTEM_PROMPT = """
Bạn là chuyên gia CRM cho nhà hàng Việt Nam.

Chỉ phân tích dữ liệu tổng hợp của một cụm khách hàng. Không suy đoán, không yêu cầu
và không nhắc đến dữ liệu cá nhân như tên, số điện thoại, địa chỉ hoặc danh tính.

BẮT BUỘC: Toàn bộ giá trị văn bản trong JSON phải viết hoàn toàn bằng tiếng Việt tự nhiên.
Không dùng tiếng Anh, kể cả tiêu đề nhãn hay mô tả, trừ đơn vị tiền tệ "VND" và tên chỉ số
kỹ thuật khi thật sự cần thiết. Không dùng Markdown.

Trả đúng một JSON object có dạng:
{
  "behavior_label": "nhãn ngắn bằng tiếng Việt, tối đa 8 từ",
  "behavior_description": "mô tả bằng tiếng Việt, tối đa 2 câu",
  "behavior_traits": ["đặc điểm tiếng Việt 1", "đặc điểm tiếng Việt 2"]
}

behavior_traits có từ 2 đến 4 mục. Chỉ nêu nhận định được dữ liệu đầu vào hỗ trợ.
""".strip()


async def label_cluster_behavior(cluster_summary: dict[str, Any]) -> dict[str, Any]:
    """Gọi OpenAI một lần để gắn nhãn tiếng Việt cho một cluster summary an toàn."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return EMPTY_BEHAVIOR.copy()

    request_body = {
        "model": os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": json.dumps(cluster_summary, ensure_ascii=False)},
        ],
    }
    request = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=json.dumps(request_body, ensure_ascii=False).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        timeout_seconds = max(1, int(os.getenv("OPENAI_TIMEOUT_SECONDS", "45")))
        response = await asyncio.to_thread(urllib.request.urlopen, request, timeout=timeout_seconds)
        with response:
            completion = json.loads(response.read().decode("utf-8"))
        behavior = json.loads(completion["choices"][0]["message"]["content"])
        return {
            "behavior_label": str(behavior.get("behavior_label", "")).strip(),
            "behavior_description": str(behavior.get("behavior_description", "")).strip(),
            "behavior_traits": [str(item).strip() for item in behavior.get("behavior_traits", []) if str(item).strip()][:4],
        }
    except (urllib.error.URLError, urllib.error.HTTPError, KeyError, ValueError, json.JSONDecodeError):
        return EMPTY_BEHAVIOR.copy()
