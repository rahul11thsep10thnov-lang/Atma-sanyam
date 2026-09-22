from app.schemas.example import CalculationStep, GeneratedExample
from app.services.ai.calculation_verification_service import (
    CalculationVerificationService,
    UnsafeExpressionError,
    safe_eval,
)


def test_safe_eval_basic_arithmetic():
    assert safe_eval("45 / 3") == 15.0
    assert safe_eval("(2 + 3) * 4") == 20.0
    assert safe_eval("2 ** 3") == 8.0


def test_safe_eval_rejects_unsafe_code():
    import ast

    for expr in ["__import__('os').system('echo hi')", "open('/etc/passwd')"]:
        try:
            safe_eval(expr)
            raised = False
        except (UnsafeExpressionError, SyntaxError, ValueError):
            raised = True
        assert raised, f"expected {expr!r} to be rejected"


def test_verification_accepts_correct_example():
    example = GeneratedExample(
        statement="A cyclist travels 45 km in 3 hours.",
        formula="speed = distance / time",
        calculation_steps=[CalculationStep(expression="45 / 3", result=15.0)],
        expected_result=15.0,
    )
    result = CalculationVerificationService().verify(example)
    assert result.verified is True


def test_verification_rejects_wrong_step_result():
    example = GeneratedExample(
        statement="bad example",
        calculation_steps=[CalculationStep(expression="45 / 3", result=99.0)],
        expected_result=99.0,
    )
    result = CalculationVerificationService().verify(example)
    assert result.verified is False
    assert "recomputed" in result.detail


def test_verification_rejects_mismatched_expected_result():
    example = GeneratedExample(
        statement="bad example",
        calculation_steps=[CalculationStep(expression="45 / 3", result=15.0)],
        expected_result=20.0,
    )
    result = CalculationVerificationService().verify(example)
    assert result.verified is False


def test_verification_rejects_no_steps():
    example = GeneratedExample(statement="no steps", expected_result=15.0)
    result = CalculationVerificationService().verify(example)
    assert result.verified is False
