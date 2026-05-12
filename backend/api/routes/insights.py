from datetime import date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case

from backend.db.session import get_db
from backend.models.ticket import Ticket, ResolutionStatusEnum, SentimentLabelEnum
from backend.models.insight import DailyInsight
from backend.models.schemas import (
    KPISummary,
    CategoryBreakdown, CategoryStat,
    TrendResponse, TrendPoint,
    VelocityResponse, VelocityPoint,
    SentimentDistribution, SentimentBucket,
    CountryBreakdown, CountryStat,
    RevenueRiskResponse, RevenueRiskItem,
    ProductBreakdown, ProductStat,
    TopIssuesResponse, IssueFrequency,
)

router = APIRouter(prefix="/insights", tags=["Insights"])


def _open_filter(q):
    return q.filter(Ticket.resolution_status == ResolutionStatusEnum.open)


def _unresolved_filter(q):
    return q.filter(Ticket.resolution_status != ResolutionStatusEnum.resolved)


def _apply_filters(q, category: Optional[str], days: Optional[int], channel: Optional[str] = None):
    if category:
        q = q.filter(Ticket.category == category)
    if days:
        since = date.today() - timedelta(days=days)
        q = q.filter(Ticket.timestamp >= since)
    if channel:
        q = q.filter(Ticket.channel == channel)
    return q


# ── /summary ──────────────────────────────────────────────────────────────────

@router.get("/summary", response_model=KPISummary)
def get_summary(
    category: Optional[str] = Query(default=None),
    days: Optional[int] = Query(default=None, ge=1, le=365),
    channel: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    base = _apply_filters(db.query(Ticket), category, days, channel)
    total = base.count() or 0

    open_count = base.filter(
        Ticket.resolution_status == ResolutionStatusEnum.open
    ).count() or 0
    resolved_count = base.filter(
        Ticket.resolution_status == ResolutionStatusEnum.resolved
    ).count() or 0
    escalated_count = base.filter(
        Ticket.resolution_status == ResolutionStatusEnum.escalated
    ).count() or 0

    avg_q = _apply_filters(
        db.query(func.avg(Ticket.sentiment_score)).filter(Ticket.sentiment_score.isnot(None)),
        category, days, channel,
    )
    avg_sentiment = avg_q.scalar() or 0.0

    rev_q = _apply_filters(
        db.query(func.sum(Ticket.order_value)).filter(
            Ticket.resolution_status != ResolutionStatusEnum.resolved,
            Ticket.order_value.isnot(None),
        ),
        category, days, channel,
    )
    revenue_at_risk = rev_q.scalar() or 0.0

    top_cat_q = _apply_filters(
        db.query(Ticket.category, func.count(Ticket.ticket_id).label("cnt"))
          .filter(Ticket.category.isnot(None)),
        category, days, channel,
    )
    top_cat_row = top_cat_q.group_by(Ticket.category).order_by(func.count(Ticket.ticket_id).desc()).first()
    top_category = top_cat_row[0] if top_cat_row else "N/A"

    today = date.today()
    proc_q = _apply_filters(
        db.query(func.count(Ticket.ticket_id)).filter(func.date(Ticket.created_at) == str(today)),
        category, days, channel,
    )
    processed_today = proc_q.scalar() or 0

    resolution_rate = round((resolved_count / total * 100), 2) if total else 0.0
    escalation_rate = round((escalated_count / total * 100), 2) if total else 0.0

    return KPISummary(
        total_tickets=total,
        open_tickets=open_count,
        resolved_tickets=resolved_count,
        escalated_tickets=escalated_count,
        avg_sentiment_score=round(float(avg_sentiment), 2),
        top_category=top_category,
        total_revenue_at_risk=round(float(revenue_at_risk), 2),
        tickets_processed_today=processed_today,
        resolution_rate=resolution_rate,
        escalation_rate=escalation_rate,
    )


# ── /categories ───────────────────────────────────────────────────────────────

@router.get("/categories", response_model=CategoryBreakdown)
def get_categories(
    days: Optional[int] = Query(default=None, ge=1, le=365),
    channel: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    base_q = _apply_filters(db.query(Ticket).filter(Ticket.category.isnot(None)), None, days, channel)
    total = base_q.count() or 1

    q = _apply_filters(db.query(
        Ticket.category,
        func.count(Ticket.ticket_id).label("cnt"),
        func.avg(Ticket.sentiment_score).label("avg_sent"),
        func.sum(Ticket.order_value).label("rev"),
        func.sum(case((Ticket.resolution_status == ResolutionStatusEnum.open, 1), else_=0)).label("open_cnt"),
        func.sum(case((Ticket.resolution_status == ResolutionStatusEnum.resolved, 1), else_=0)).label("resolved_cnt"),
        func.sum(case((Ticket.resolution_status == ResolutionStatusEnum.escalated, 1), else_=0)).label("escalated_cnt"),
    ).filter(Ticket.category.isnot(None)), None, days, channel)

    rows = q.group_by(Ticket.category).order_by(func.count(Ticket.ticket_id).desc()).all()

    return CategoryBreakdown(
        categories=[
            CategoryStat(
                category=r.category,
                count=r.cnt,
                percentage=round((r.cnt / total) * 100, 2),
                avg_sentiment=round(float(r.avg_sent or 0), 2),
                revenue_at_risk=round(float(r.rev or 0), 2),
                open_count=r.open_cnt or 0,
                resolved_count=r.resolved_cnt or 0,
                escalated_count=r.escalated_cnt or 0,
            )
            for r in rows
        ]
    )


# ── /trends ───────────────────────────────────────────────────────────────────

@router.get("/trends", response_model=TrendResponse)
def get_trends(
    days: int = Query(default=30, ge=7, le=90),
    category: Optional[str] = Query(default=None),
    channel: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    since = date.today() - timedelta(days=days)

    q = _apply_filters(db.query(
        func.date(Ticket.timestamp).label("day"),
        func.count(Ticket.ticket_id).label("cnt"),
        func.avg(Ticket.sentiment_score).label("avg_sent"),
        func.sum(case((Ticket.resolution_status == ResolutionStatusEnum.open, 1), else_=0)).label("open_cnt"),
        func.sum(case((Ticket.resolution_status == ResolutionStatusEnum.resolved, 1), else_=0)).label("resolved_cnt"),
        func.sum(case((Ticket.resolution_status == ResolutionStatusEnum.escalated, 1), else_=0)).label("escalated_cnt"),
        func.sum(case((Ticket.resolution_status != ResolutionStatusEnum.resolved, Ticket.order_value), else_=0)).label("rev_risk"),
    ).filter(Ticket.timestamp >= since), category, None, channel)

    rows = q.group_by(func.date(Ticket.timestamp)).order_by(func.date(Ticket.timestamp)).all()

    return TrendResponse(
        days=days,
        data=[
            TrendPoint(
                date=r.day,
                ticket_count=r.cnt,
                avg_sentiment=round(float(r.avg_sent or 0), 2),
                open_count=r.open_cnt or 0,
                resolved_count=r.resolved_cnt or 0,
                escalated_count=r.escalated_cnt or 0,
                revenue_at_risk=round(float(r.rev_risk or 0), 2),
            )
            for r in rows
        ],
    )


# ── /velocity ─────────────────────────────────────────────────────────────────

@router.get("/velocity", response_model=VelocityResponse)
def get_velocity(
    period_days: int = Query(default=7, ge=1, le=30),
    category: Optional[str] = Query(default=None),
    channel: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    today = date.today()
    current_start  = today - timedelta(days=period_days)
    previous_start = current_start - timedelta(days=period_days)

    def _counts(start: date, end: date) -> dict[str, int]:
        q = _apply_filters(
            db.query(Ticket.category, func.count(Ticket.ticket_id).label("cnt"))
            .filter(
                Ticket.category.isnot(None),
                func.date(Ticket.timestamp) >= str(start),
                func.date(Ticket.timestamp) < str(end),
            ),
            category, None, channel,
        )
        return {r.category: r.cnt for r in q.group_by(Ticket.category).all()}

    current  = _counts(current_start, today)
    previous = _counts(previous_start, current_start)

    all_cats = sorted(set(current) | set(previous))
    items: list[VelocityPoint] = []
    for cat in all_cats:
        curr = current.get(cat, 0)
        prev = previous.get(cat, 0)
        change_pct = 100.0 if prev == 0 and curr > 0 else (0.0 if prev == 0 else round(((curr - prev) / prev) * 100, 2))
        items.append(VelocityPoint(category=cat, count_current=curr, count_previous=prev, change_pct=change_pct))

    items.sort(key=lambda x: x.change_pct, reverse=True)
    return VelocityResponse(period_days=period_days, items=items)


# ── /sentiment-distribution ───────────────────────────────────────────────────

@router.get("/sentiment-distribution", response_model=SentimentDistribution)
def get_sentiment_distribution(
    category: Optional[str] = Query(default=None),
    days: Optional[int] = Query(default=None, ge=1, le=365),
    channel: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    q = _apply_filters(
        db.query(Ticket.sentiment_label, func.count(Ticket.ticket_id).label("cnt"))
          .filter(Ticket.sentiment_label.isnot(None)),
        category, days, channel,
    )
    rows = q.group_by(Ticket.sentiment_label).all()

    total = sum(r.cnt for r in rows) or 1
    avg_q = _apply_filters(
        db.query(func.avg(Ticket.sentiment_score)).filter(Ticket.sentiment_score.isnot(None)),
        category, days, channel,
    )
    avg_score = avg_q.scalar() or 0.0

    label_order = ["positive", "neutral", "frustrated", "angry"]
    row_map = {r.sentiment_label: r.cnt for r in rows}

    return SentimentDistribution(
        total=total,
        buckets=[
            SentimentBucket(
                label=label,
                count=row_map.get(label, 0),
                percentage=round((row_map.get(label, 0) / total) * 100, 2),
            )
            for label in label_order
        ],
        avg_score=round(float(avg_score), 2),
    )


# ── /revenue-risk ─────────────────────────────────────────────────────────────

@router.get("/revenue-risk", response_model=RevenueRiskResponse)
def get_revenue_risk(
    category: Optional[str] = Query(default=None),
    days: Optional[int] = Query(default=None, ge=1, le=365),
    channel: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    q = _apply_filters(db.query(
        Ticket.category,
        func.count(Ticket.ticket_id).label("cnt"),
        func.sum(Ticket.order_value).label("total_val"),
        func.avg(Ticket.order_value).label("avg_val"),
    ).filter(
        Ticket.resolution_status != ResolutionStatusEnum.resolved,
        Ticket.category.isnot(None),
        Ticket.order_value.isnot(None),
    ), category, days, channel)
    rows = q.group_by(Ticket.category).order_by(func.sum(Ticket.order_value).desc()).all()

    total_risk = sum(float(r.total_val or 0) for r in rows) or 1.0

    return RevenueRiskResponse(
        total_at_risk=round(total_risk, 2),
        items=[
            RevenueRiskItem(
                category=r.category,
                open_tickets=r.cnt,
                total_order_value=round(float(r.total_val or 0), 2),
                avg_order_value=round(float(r.avg_val or 0), 2),
                pct_of_total=round((float(r.total_val or 0) / total_risk) * 100, 2),
            )
            for r in rows
        ],
    )


# ── /countries ────────────────────────────────────────────────────────────────

@router.get("/countries", response_model=CountryBreakdown)
def get_countries(
    limit: int = Query(default=15, ge=1, le=50),
    category: Optional[str] = Query(default=None),
    days: Optional[int] = Query(default=None, ge=1, le=365),
    channel: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    q = _apply_filters(db.query(
        Ticket.customer_country,
        func.count(Ticket.ticket_id).label("cnt"),
        func.avg(Ticket.sentiment_score).label("avg_sent"),
        func.sum(case((Ticket.resolution_status != ResolutionStatusEnum.resolved, Ticket.order_value), else_=0)).label("rev_risk"),
    ).filter(Ticket.customer_country.isnot(None)), category, days, channel)
    rows = q.group_by(Ticket.customer_country).order_by(func.count(Ticket.ticket_id).desc()).limit(limit).all()

    country_stats: list[CountryStat] = []
    for r in rows:
        top_cat_q = db.query(Ticket.category, func.count(Ticket.ticket_id).label("cnt")).filter(
            Ticket.customer_country == r.customer_country,
            Ticket.category.isnot(None),
        )
        if days:
            since = date.today() - timedelta(days=days)
            top_cat_q = top_cat_q.filter(Ticket.timestamp >= since)
        top_cat_row = top_cat_q.group_by(Ticket.category).order_by(func.count(Ticket.ticket_id).desc()).first()
        country_stats.append(CountryStat(
            country=r.customer_country,
            ticket_count=r.cnt,
            avg_sentiment=round(float(r.avg_sent or 0), 2),
            revenue_at_risk=round(float(r.rev_risk or 0), 2),
            top_category=top_cat_row[0] if top_cat_row else "N/A",
        ))

    return CountryBreakdown(countries=country_stats)


# ── /products ─────────────────────────────────────────────────────────────────

@router.get("/products", response_model=ProductBreakdown)
def get_products(
    limit: int = Query(default=15, ge=1, le=50),
    category: Optional[str] = Query(default=None),
    days: Optional[int] = Query(default=None, ge=1, le=365),
    channel: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    q = _apply_filters(db.query(
        Ticket.product,
        func.count(Ticket.ticket_id).label("cnt"),
        func.avg(Ticket.sentiment_score).label("avg_sent"),
        func.sum(case((Ticket.resolution_status != ResolutionStatusEnum.resolved, Ticket.order_value), else_=0)).label("rev_risk"),
    ).filter(Ticket.product.isnot(None)), category, days, channel)
    rows = q.group_by(Ticket.product).order_by(func.count(Ticket.ticket_id).desc()).limit(limit).all()

    product_stats: list[ProductStat] = []
    for r in rows:
        top_cat_q = db.query(Ticket.category, func.count(Ticket.ticket_id).label("cnt")).filter(
            Ticket.product == r.product,
            Ticket.category.isnot(None),
        )
        if days:
            since = date.today() - timedelta(days=days)
            top_cat_q = top_cat_q.filter(Ticket.timestamp >= since)
        if category:
            top_cat_q = top_cat_q.filter(Ticket.category == category)
        top_cat_row = top_cat_q.group_by(Ticket.category).order_by(func.count(Ticket.ticket_id).desc()).first()
        product_stats.append(ProductStat(
            product=r.product,
            ticket_count=r.cnt,
            avg_sentiment=round(float(r.avg_sent or 0), 2),
            top_category=top_cat_row[0] if top_cat_row else "N/A",
            revenue_at_risk=round(float(r.rev_risk or 0), 2),
        ))

    return ProductBreakdown(products=product_stats)


# ── /top-issues ───────────────────────────────────────────────────────────────

@router.get("/top-issues", response_model=TopIssuesResponse)
def get_top_issues(
    limit: int = Query(default=10, ge=1, le=50),
    category: Optional[str] = Query(default=None),
    days: Optional[int] = Query(default=None, ge=1, le=365),
    channel: Optional[str] = Query(default=None),
    db: Session = Depends(get_db),
):
    q = _apply_filters(
        db.query(Ticket.key_issues, Ticket.category).filter(Ticket.key_issues.isnot(None)),
        category, days, channel,
    )
    rows = q.all()

    issue_map: dict[str, dict] = {}
    for row in rows:
        if not row.key_issues:
            continue
        for issue in row.key_issues:
            if issue not in issue_map:
                issue_map[issue] = {"count": 0, "categories": set()}
            issue_map[issue]["count"] += 1
            if row.category:
                issue_map[issue]["categories"].add(row.category)

    sorted_issues = sorted(issue_map.items(), key=lambda x: x[1]["count"], reverse=True)

    return TopIssuesResponse(
        issues=[
            IssueFrequency(issue=issue, count=data["count"], categories=sorted(data["categories"]))
            for issue, data in sorted_issues[:limit]
        ]
    )
