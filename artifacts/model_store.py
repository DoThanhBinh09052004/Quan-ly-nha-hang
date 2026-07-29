from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib

from config import MODEL_PATH


class ModelArtifactStore:
    """Stores a model payload atomically so readers never observe a partial file."""

    def __init__(self, root: str | Path = MODEL_PATH) -> None:
        self.root = Path(root)

    def path_for(self, model_name: str) -> Path:
        """Ánh xạ tên logic sang artifact hiện hữu để triển khai không bị gián đoạn."""
        # Giữ tên artifact cũ để deploy hiện tại vẫn load được trước lần retrain đầu tiên.
        filenames = {
            "revenue": "revenue_forecast.pkl",
            "recommendation": "recommendation_rules.pkl",
            "ingredient-demand": "ingredient_demand.pkl",
            "customer-segment": "customer_segment.pkl",
        }
        return self.root / filenames.get(model_name, f"{model_name}.pkl")

    def exists(self, model_name: str) -> bool:
        """Kiểm tra artifact đã được persist hay chưa."""
        return self.path_for(model_name).is_file()

    def load(self, model_name: str) -> dict[str, Any]:
        """Đọc artifact mới hoặc bọc artifact legacy thành payload dùng được trong RAM."""
        payload = joblib.load(self.path_for(model_name))
        if isinstance(payload, dict) and "artifact_version" in payload:
            return payload
        # Legacy artifacts were written directly by the former model classes.
        # Wrap them in memory so the current service stays available; retrain will
        # replace them atomically with the new metadata-bearing format.
        if model_name == "recommendation":
            payload = {"rules": payload, "item_names": {}}
        if not isinstance(payload, dict):
            raise ValueError("Artifact format is invalid.")
        return {
            "artifact_version": 0,
            "model_name": model_name,
            "metadata": {"legacy_artifact": True},
            "payload": payload,
        }

    def save(self, model_name: str, model_payload: dict[str, Any], metadata: dict[str, Any]) -> dict[str, Any]:
        """Lưu artifact mới qua file tạm rồi replace atomically."""
        self.root.mkdir(parents=True, exist_ok=True)
        artifact = {
            "artifact_version": 1,
            "model_name": model_name,
            "saved_at": datetime.now(timezone.utc).isoformat(),
            "metadata": metadata,
            "payload": model_payload,
        }
        destination = self.path_for(model_name)
        temporary = destination.with_suffix(".tmp")
        joblib.dump(artifact, temporary)
        os.replace(temporary, destination)
        return artifact
