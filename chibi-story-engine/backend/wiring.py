"""Attach optional subsystems (asset sync, render worker, static dashboard) to the app."""
from __future__ import annotations

from fastapi import FastAPI

from .deps import AppContext


def wire(app: FastAPI, ctx: AppContext) -> None:
    return None
