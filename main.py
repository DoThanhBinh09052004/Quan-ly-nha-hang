from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Nạp .env trước khi BusinessChatService tạo OpenAiClient lúc import route.
import config
from api.endpoints import router
from api.business_chat import router as business_chat_router
from api.model_admin import create_model_admin_router
import globals


app = FastAPI(title="Nhà hàng AI Service", version="1.1")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)
app.include_router(business_chat_router)
app.include_router(create_model_admin_router(globals.model_registry))


@app.on_event("startup")
async def load_models() -> None:
    """Load persisted artifacts only; retraining is an explicit admin operation."""
    globals.model_registry.load_all()
    print(f"Model registry status: {globals.model_registry.status()}")


@app.get("/")
async def root() -> dict:
    return {"message": "Nhà hàng AI Service is running"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
