import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Numeric, DateTime, SmallInteger,
    Float, Enum, JSON, func
)
import enum
from backend.db.session import Base


class ChannelEnum(str, enum.Enum):
    chat = "chat"
    email = "email"
    web = "web"


class ResolutionStatusEnum(str, enum.Enum):
    open = "open"
    resolved = "resolved"
    escalated = "escalated"


class SentimentLabelEnum(str, enum.Enum):
    positive = "positive"
    neutral = "neutral"
    frustrated = "frustrated"
    angry = "angry"


class Ticket(Base):
    __tablename__ = "tickets"

    ticket_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    customer_id = Column(String(100), nullable=False, index=True)
    channel = Column(Enum(ChannelEnum), nullable=False)
    message = Column(Text, nullable=False)
    agent_reply = Column(Text, nullable=True)
    product = Column(String(200), nullable=True, index=True)
    order_value = Column(Numeric(10, 2), nullable=True)
    customer_country = Column(String(100), nullable=True)
    resolution_status = Column(
        Enum(ResolutionStatusEnum), nullable=False, default=ResolutionStatusEnum.open
    )

    # AI-enriched fields
    category = Column(String(100), nullable=True, index=True)
    subcategory = Column(String(100), nullable=True)
    sentiment_score = Column(SmallInteger, nullable=True)  # 1–5
    sentiment_label = Column(Enum(SentimentLabelEnum), nullable=True)
    key_issues = Column(JSON, nullable=True)
    suggested_reply = Column(Text, nullable=True)
    embedding_id = Column(String(200), nullable=True)

    # Metadata
    word_count = Column(SmallInteger, nullable=True)
    processed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
