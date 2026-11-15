from __future__ import annotations

import time
from typing import Any

import bcrypt
import jwt

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8")[:72], bcrypt.gensalt(rounds=12)).decode("ascii")


def verify_password(password: str, password_hash: str | None) -> bool:
    if not password_hash:
        return False
    try:
        return bcrypt.checkpw(password.encode("utf-8")[:72], password_hash.encode("ascii"))
    except ValueError:
        return False


def create_token(secret: str, user_id: str, role: str, ttl_minutes: int) -> str:
    now = int(time.time())
    return jwt.encode({"sub": user_id, "role": role, "iat": now, "exp": now + ttl_minutes * 60}, secret, algorithm=ALGORITHM)


def decode_token(secret: str, token: str) -> dict[str, Any] | None:
    try:
        return jwt.decode(token, secret, algorithms=[ALGORITHM])
    except jwt.PyJWTError:
        return None
