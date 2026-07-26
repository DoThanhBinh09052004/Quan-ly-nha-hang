from fastapi import APIRouter, HTTPException

from schemas.business_chat import BusinessChatRequest, BusinessChatResponse
from services.business_chat_service import BusinessChatService


router = APIRouter(prefix="/chat", tags=["business-chat"])
service = BusinessChatService()


@router.post("/business", response_model=BusinessChatResponse)
async def analyze_business_chat(request: BusinessChatRequest) -> BusinessChatResponse:
    """Analyze a business snapshot prepared by the ASP.NET Core API."""
    if not request.message.strip():
        raise HTTPException(status_code=422, detail="message must not be empty")

    try:
        return await service.analyze(request)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    except Exception as error:
        # Do not expose an OpenAI response or configuration detail to the caller.
        raise HTTPException(status_code=503, detail="Business analysis is temporarily unavailable") from error
