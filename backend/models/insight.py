from datetime import date
from sqlalchemy import Column, Integer, String, Date, Float, Numeric, JSON, func
from backend.db.session import Base


class DailyInsight(Base):
    __tablename__ = "daily_insights"

    id = Column(Integer, primary_key=True, autoincrement=True)
    date = Column(Date, nullable=False, index=True)
    category = Column(String(100), nullable=False, index=True)
    ticket_count = Column(Integer, nullable=False, default=0)
    avg_sentiment = Column(Float, nullable=True)
    top_issues = Column(JSON, nullable=True)
    revenue_at_risk = Column(Numeric(12, 2), nullable=True)
    created_at = Column(Date, server_default=func.current_date())
