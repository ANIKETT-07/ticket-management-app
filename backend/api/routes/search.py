import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.db.session import get_db
from backend.models.ticket import Ticket
from backend.models.schemas import SearchRequest, SearchResponse, SearchResult

router = APIRouter(prefix="/search", tags=["Search"])


@router.post("", response_model=SearchResponse)
def semantic_search(request: SearchRequest, db: Session = Depends(get_db)):
    """
    Semantic similarity search over ticket embeddings stored in ChromaDB.
    Returns the most similar tickets to the query string.
    """
    try:
        from backend.utils.chroma_client import get_chroma_collection
        from backend.utils.gemini_client import get_embedding
    except ImportError as e:
        raise HTTPException(status_code=503, detail=f"Search service unavailable: {e}")

    # Embed the query
    query_embedding = get_embedding(request.query)

    collection = get_chroma_collection()

    where_filter = {}
    if request.category_filter:
        where_filter = {"category": {"$eq": request.category_filter}}

    chroma_results = collection.query(
        query_embeddings=[query_embedding],
        n_results=request.top_k,
        where=where_filter if where_filter else None,
        include=["metadatas", "distances"],
    )

    ticket_ids = [
        uuid.UUID(meta["ticket_id"])
        for meta in chroma_results["metadatas"][0]
    ]
    distances = chroma_results["distances"][0]

    tickets = (
        db.query(Ticket).filter(Ticket.ticket_id.in_(ticket_ids)).all()
    )
    ticket_map = {t.ticket_id: t for t in tickets}

    results = []
    for tid, dist in zip(ticket_ids, distances):
        t = ticket_map.get(tid)
        if not t:
            continue
        results.append(
            SearchResult(
                ticket_id=t.ticket_id,
                message=t.message,
                category=t.category,
                sentiment_label=t.sentiment_label,
                similarity_score=round(1 - dist, 4),
                timestamp=t.timestamp,
            )
        )

    return SearchResponse(query=request.query, results=results)
