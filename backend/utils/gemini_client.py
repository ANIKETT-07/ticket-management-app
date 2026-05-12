from functools import lru_cache
from typing import List
import google.generativeai as genai
from backend.config import settings
from backend.utils.logger import get_logger

logger = get_logger(__name__)


@lru_cache()
def _configure_genai():
    genai.configure(api_key=settings.GEMINI_API_KEY)
    return True


def get_gemini_model():
    """Return a Gemini model configured to return structured JSON."""
    _configure_genai()
    return genai.GenerativeModel(
        model_name=settings.GEMINI_MODEL,
        generation_config={"response_mime_type": "application/json"},
    )


def get_gemini_text_model():
    """Return a Gemini model for plain-text generation (e.g. agent replies)."""
    _configure_genai()
    return genai.GenerativeModel(
        model_name=settings.GEMINI_MODEL,
        generation_config={"temperature": 0.4, "max_output_tokens": 300},
    )


def get_embedding(text: str) -> List[float]:
    """Return a 768-dim embedding vector for the given text."""
    _configure_genai()
    result = genai.embed_content(
        model=settings.GEMINI_EMBEDDING_MODEL,
        content=text,
        task_type="retrieval_document",
    )
    return result["embedding"]
