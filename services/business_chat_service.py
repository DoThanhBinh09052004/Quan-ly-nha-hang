from prompts.business_chat_prompts import SYSTEM_PROMPT, VALID_INTENTS, build_user_prompt
from schemas.business_chat import BusinessChatRequest, BusinessChatResponse
from services.business_snapshot_formatter import format_snapshot
from services.openai_client import OpenAiClient, OpenAiRequestError


class BusinessChatService:
    def __init__(self, openai_client: OpenAiClient | None = None) -> None:
        self._openai = openai_client or OpenAiClient()

    async def analyze(self, request: BusinessChatRequest) -> BusinessChatResponse:
        intent = request.intent.strip().lower() or "summary"
        if intent not in VALID_INTENTS:
            intent = "summary"

        snapshot = format_snapshot(request.snapshot)
        if not snapshot["data"]:
            return self._no_data_response()

        try:
            response = await self._openai.create_business_analysis(
                SYSTEM_PROMPT,
                build_user_prompt(request.message.strip(), intent, snapshot),
            )
            return BusinessChatResponse(**response)
        except (OpenAiRequestError, ValueError, TypeError):
            return self._fallback_response(intent, snapshot)

    @staticmethod
    def _no_data_response() -> BusinessChatResponse:
        return BusinessChatResponse(
            summary="Chưa có dữ liệu kinh doanh phù hợp để phân tích.",
            answerText="Hãy thử hỏi lại với khoảng thời gian hoặc chỉ số cụ thể hơn.",
            followUpQuestions=["Tổng quan doanh thu 30 ngày gần đây như thế nào?"],
        )

    @staticmethod
    def _fallback_response(intent: str, snapshot: dict) -> BusinessChatResponse:
        scopes = ", ".join(snapshot["dataScopes"]) or "dữ liệu kinh doanh"
        prompts = {
            "trend": "Dữ liệu xu hướng đã được chuẩn bị nhưng dịch vụ phân tích AI tạm thời chưa phản hồi.",
            "compare": "Dữ liệu so sánh đã được chuẩn bị nhưng chưa thể tạo diễn giải tự động.",
            "diagnosis": "Chưa thể chẩn đoán tự động lúc này; cần đối chiếu các chỉ số trong snapshot.",
            "recommendation": "Chưa thể tạo khuyến nghị tự động lúc này; hãy xem các KPI và dữ liệu bán hàng đã tải.",
        }
        return BusinessChatResponse(
            summary="Dữ liệu đã được nhận nhưng phân tích AI tạm thời chưa khả dụng.",
            answerText=prompts.get(intent, "Dữ liệu tổng quan đã được nhận nhưng chưa thể tạo diễn giải tự động."),
            insights=[f"Các phạm vi dữ liệu đã nhận: {scopes}."],
            followUpQuestions=["Bạn muốn phân tích doanh thu, lợi nhuận hay món bán chạy?"],
        )
