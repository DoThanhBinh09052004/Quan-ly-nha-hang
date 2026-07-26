from typing import Any

from schemas.business_chat import BusinessSnapshot


MAX_LIST_ITEMS = 20
MAX_OBJECT_FIELDS = 40
MAX_DEPTH = 6


def format_snapshot(snapshot: BusinessSnapshot) -> dict:
    """Keep only BE-provided, relevant data and bound its size before OpenAI receives it."""
    raw = _dump(snapshot)
    scopes = raw.get("dataScopes") or []
    result = {
        "dataScopes": scopes,
        "fromDate": _json_value(raw.get("fromDate")),
        "toDate": _json_value(raw.get("toDate")),
        "data": {},
    }
    for key, value in raw.items():
        if key in {"dataScopes", "fromDate", "toDate"} or value is None:
            continue
        result["data"][key] = _bound_value(value)
    return result


def _dump(snapshot: BusinessSnapshot) -> dict:
    if hasattr(snapshot, "model_dump"):
        return snapshot.model_dump(exclude_none=True)
    return snapshot.dict(exclude_none=True)


def _json_value(value: Any) -> Any:
    return value.isoformat() if hasattr(value, "isoformat") else value


def _bound_value(value: Any, depth: int = 0) -> Any:
    if depth >= MAX_DEPTH:
        return "[truncated]"
    if isinstance(value, dict):
        return {
            str(key): _bound_value(item, depth + 1)
            for key, item in list(value.items())[:MAX_OBJECT_FIELDS]
        }
    if isinstance(value, list):
        return [_bound_value(item, depth + 1) for item in value[:MAX_LIST_ITEMS]]
    return _json_value(value)
