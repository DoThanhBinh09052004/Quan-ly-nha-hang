import hmac

from fastapi import APIRouter, Header, HTTPException

from config import MODEL_ADMIN_API_KEY
from runtime.model_registry import ModelRegistry
from training.model_trainer import ModelTrainer, SUPPORTED_MODEL_NAMES
from artifacts.serializers import serialize_customer_segment
from services.customer_segment_label_service import label_trained_clusters


def create_model_admin_router(registry: ModelRegistry) -> APIRouter:
    """Tạo các route nội bộ cho retrain và kiểm tra trạng thái artifact."""
    router = APIRouter(prefix="/admin/models", tags=["model-admin"])
    trainer = ModelTrainer(registry.store)

    def require_api_key(x_model_admin_key: str | None = Header(default=None)) -> None:
        """Chặn thao tác tốn tài nguyên nếu thiếu API key cấu hình qua environment."""
        if not MODEL_ADMIN_API_KEY:
            raise HTTPException(status_code=503, detail="Model administration is not configured")
        if not x_model_admin_key or not hmac.compare_digest(x_model_admin_key, MODEL_ADMIN_API_KEY):
            raise HTTPException(status_code=401, detail="Invalid model administration key")

    @router.get("/status")
    async def model_status(x_model_admin_key: str | None = Header(default=None)) -> dict:
        """Cho vận hành biết model nào đang sẵn sàng phục vụ."""
        require_api_key(x_model_admin_key)
        return registry.status()

    @router.get("/customer-segment/labels")
    async def customer_segment_labels(x_model_admin_key: str | None = Header(default=None)) -> dict:
        """Trả toàn bộ nhãn cụm đã lưu trong segmentation artifact, không gọi OpenAI."""
        require_api_key(x_model_admin_key)
        model = registry.customer_segment_model
        if model is None or model.model is None or model.scaler is None:
            raise HTTPException(status_code=503, detail="Customer segment model is not loaded")

        clusters = []
        for cluster in range(model.model.n_clusters):
            label = model.cluster_labels.get(str(cluster), {})
            clusters.append({
                "cluster": cluster,
                "cluster_name": f"Cụm {cluster + 1}",
                "cluster_features": model.cluster_center(cluster),
                "behavior_label": str(label.get("behavior_label", "")),
                "behavior_description": str(label.get("behavior_description", "")),
                "behavior_traits": [str(item) for item in label.get("behavior_traits", [])][:4],
            })
        return {
            "metadata": registry.metadata.get("customer-segment", {}),
            "label_count": len(model.cluster_labels),
            "clusters": clusters,
        }

    @router.post("/{model_name}/retrain")
    async def retrain_model(model_name: str, x_model_admin_key: str | None = Header(default=None)) -> dict:
        """Train một model theo yêu cầu và chỉ hot-swap khi train thành công."""
        require_api_key(x_model_admin_key)
        if model_name not in SUPPORTED_MODEL_NAMES:
            raise HTTPException(status_code=404, detail="Unknown model")
        try:
            if model_name == "customer-segment":
                # Label trước khi persist để artifact mới luôn có đủ nhãn cụm.
                model, metadata, payload = trainer.build(model_name)
                model.cluster_labels = await label_trained_clusters(payload.pop("cluster_summaries"))
                payload = serialize_customer_segment(model)
                metadata["label_count"] = len(model.cluster_labels)
                trainer.persist(model_name, payload, metadata)
            else:
                model, metadata = trainer.train(model_name)
            registry.replace(model_name, model, metadata)
            return {"model_name": model_name, "status": "trained", "metadata": metadata}
        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error)) from error
        except Exception as error:
            raise HTTPException(status_code=500, detail="Model training failed; active model was kept") from error

    return router
