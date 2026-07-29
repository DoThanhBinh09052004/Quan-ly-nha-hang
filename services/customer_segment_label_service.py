"""Gắn nhãn một lần cho các cụm vừa được train trước khi publish artifact."""

from typing import Any

from services.openai_cluster_labeler import label_cluster_behavior


async def label_trained_clusters(cluster_summaries: dict[str, dict[str, Any]]) -> dict[str, dict[str, Any]]:
    """Gọi OpenAI một lần cho mỗi cụm và từ chối publish nếu thiếu nhãn hợp lệ."""
    labels: dict[str, dict[str, Any]] = {}
    for cluster_id, summary in cluster_summaries.items():
        behavior = await label_cluster_behavior(summary)
        if not behavior["behavior_label"]:
            raise RuntimeError(f"Unable to label customer segment cluster {cluster_id}.")
        labels[cluster_id] = behavior
    return labels
