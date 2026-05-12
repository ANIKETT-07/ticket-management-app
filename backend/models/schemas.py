from uuid import UUID
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, List, Any
from pydantic import BaseModel, Field
from backend.models.ticket import ChannelEnum, ResolutionStatusEnum, SentimentLabelEnum


# ── Ticket Schemas ─────────────────────────────────────────────────────────────

class TicketBase(BaseModel):
    timestamp: datetime
    customer_id: str
    channel: ChannelEnum
    message: str
    agent_reply: Optional[str] = None
    product: Optional[str] = None
    order_value: Optional[Decimal] = None
    customer_country: Optional[str] = None
    resolution_status: ResolutionStatusEnum = ResolutionStatusEnum.open


class TicketCreate(TicketBase):
    pass


class TicketResponse(TicketBase):
    ticket_id: UUID
    category: Optional[str] = None
    subcategory: Optional[str] = None
    sentiment_score: Optional[int] = None
    sentiment_label: Optional[SentimentLabelEnum] = None
    key_issues: Optional[List[str]] = None
    suggested_reply: Optional[str] = None
    word_count: Optional[int] = None
    processed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TicketListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[TicketResponse]


# ── Upload / Task Schemas ──────────────────────────────────────────────────────

class UploadResponse(BaseModel):
    message: str
    total_rows: int
    task_id: str


class TaskStatusResponse(BaseModel):
    task_id: str
    status: str                        # PENDING | STARTED | SUCCESS | FAILURE | RETRY
    result: Optional[Any] = None
    error: Optional[str] = None


# ── Insights — KPI Summary ─────────────────────────────────────────────────────

class KPISummary(BaseModel):
    total_tickets: int
    open_tickets: int
    resolved_tickets: int
    escalated_tickets: int
    avg_sentiment_score: float
    top_category: str
    total_revenue_at_risk: float
    tickets_processed_today: int
    resolution_rate: float             # resolved / total  (0–100 %)
    escalation_rate: float             # escalated / total (0–100 %)


# ── Insights — Category Breakdown ─────────────────────────────────────────────

class CategoryStat(BaseModel):
    category: str
    count: int
    percentage: float
    avg_sentiment: float
    revenue_at_risk: float
    open_count: int
    resolved_count: int
    escalated_count: int


class CategoryBreakdown(BaseModel):
    categories: List[CategoryStat]


# ── Insights — Trends ─────────────────────────────────────────────────────────

class TrendPoint(BaseModel):
    date: date
    ticket_count: int
    avg_sentiment: float
    open_count: int
    resolved_count: int
    escalated_count: int
    revenue_at_risk: float


class TrendResponse(BaseModel):
    days: int
    data: List[TrendPoint]


# ── Insights — Velocity ───────────────────────────────────────────────────────

class VelocityPoint(BaseModel):
    category: str
    count_current: int
    count_previous: int
    change_pct: float                  # positive = growing problem


class VelocityResponse(BaseModel):
    period_days: int
    items: List[VelocityPoint]


# ── Insights — Sentiment Distribution ────────────────────────────────────────

class SentimentBucket(BaseModel):
    label: str
    count: int
    percentage: float


class SentimentDistribution(BaseModel):
    total: int
    buckets: List[SentimentBucket]
    avg_score: float


# ── Insights — Country Breakdown ──────────────────────────────────────────────

class CountryStat(BaseModel):
    country: str
    ticket_count: int
    avg_sentiment: float
    revenue_at_risk: float
    top_category: str


class CountryBreakdown(BaseModel):
    countries: List[CountryStat]


# ── Insights — Revenue At Risk ─────────────────────────────────────────────────

class RevenueRiskItem(BaseModel):
    category: str
    open_tickets: int
    total_order_value: float
    avg_order_value: float
    pct_of_total: float


class RevenueRiskResponse(BaseModel):
    total_at_risk: float
    items: List[RevenueRiskItem]


# ── Insights — Product Breakdown ──────────────────────────────────────────────

class ProductStat(BaseModel):
    product: str
    ticket_count: int
    avg_sentiment: float
    top_category: str
    revenue_at_risk: float


class ProductBreakdown(BaseModel):
    products: List[ProductStat]


# ── Insights — Top Issues ──────────────────────────────────────────────────────

class IssueFrequency(BaseModel):
    issue: str
    count: int
    categories: List[str]


class TopIssuesResponse(BaseModel):
    issues: List[IssueFrequency]


# ── Search Schemas ─────────────────────────────────────────────────────────────

class SearchRequest(BaseModel):
    query: str = Field(..., min_length=3, max_length=500)
    top_k: int = Field(default=5, ge=1, le=20)
    category_filter: Optional[str] = None


class SearchResult(BaseModel):
    ticket_id: UUID
    message: str
    category: Optional[str]
    sentiment_label: Optional[str]
    similarity_score: float
    timestamp: datetime


class SearchResponse(BaseModel):
    query: str
    results: List[SearchResult]


# ── Suggest Schemas ────────────────────────────────────────────────────────────

class SuggestRequest(BaseModel):
    ticket_id: Optional[UUID] = None
    message: str = Field(..., min_length=5)
    category: Optional[str] = None


class SuggestResponse(BaseModel):
    suggested_reply: str
    category: Optional[str]
    confidence_note: str


# ── Health Schema ──────────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    version: str
    services: dict[str, str]
