from __future__ import annotations

from pydantic import BaseModel, Field


class CalculationStep(BaseModel):
    expression: str
    result: float


class GeneratedExample(BaseModel):
    statement: str
    variables: dict[str, float] = Field(default_factory=dict)
    formula: str = ""
    calculation_steps: list[CalculationStep] = Field(default_factory=list)
    expected_result: float | None = None
    unit: str = ""


class VerificationResult(BaseModel):
    verified: bool
    recomputed_result: float | None = None
    expected_result: float | None = None
    tolerance: float = 1e-6
    detail: str = ""
