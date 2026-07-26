from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class BusinessSnapshot(BaseModel):
    """Subset-compatible representation of RevenueBusinessSnapshotDto from ASP.NET Core."""

    dataScopes: List[str] = Field(default_factory=list)
    fromDate: Optional[datetime] = None
    toDate: Optional[datetime] = None
    overview: Optional[Any] = None
    monthly: Optional[Any] = None
    daily: Optional[Any] = None
    byHour: Optional[Any] = None
    byDayOfWeek: Optional[Any] = None
    bestSellers: Optional[Any] = None
    byCategory: Optional[Any] = None
    tableTurnover: Optional[Any] = None
    byPartySize: Optional[Any] = None
    forecast: Optional[Any] = None
    grossProfitReport: Optional[Any] = None
    netProfitReport: Optional[Any] = None


class BusinessChatRequest(BaseModel):
    message: str
    intent: str = "summary"
    snapshot: BusinessSnapshot


class BusinessChatAction(BaseModel):
    title: str
    why: str
    how: List[str] = Field(default_factory=list)


class BusinessChatResponse(BaseModel):
    # These names intentionally match AiBusinessChatResponseDto after JSON serialization.
    summary: str
    answerText: str
    kpis: Dict[str, Any] = Field(default_factory=dict)
    insights: List[str] = Field(default_factory=list)
    actions: List[BusinessChatAction] = Field(default_factory=list)
    risks: List[str] = Field(default_factory=list)
    followUpQuestions: List[str] = Field(default_factory=list)
