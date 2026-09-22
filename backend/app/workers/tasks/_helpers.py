from contextlib import contextmanager

from sqlalchemy.orm import Session

from app.core.database import SessionLocal


@contextmanager
def task_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class NonRetryableError(Exception):
    """Raised for permanently invalid input (build spec section 26: "Do not
    retry permanently invalid input indefinitely")."""
