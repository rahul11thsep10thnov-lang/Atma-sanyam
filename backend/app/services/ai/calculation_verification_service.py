"""Deterministic arithmetic verification (build spec section 10). The LLM
may PROPOSE a numeric example; this service is the only authority on
whether the numbers are actually correct. Uses Python's own arithmetic via
a restricted expression evaluator rather than trusting the LLM's arithmetic
or eval()'ing arbitrary code.
"""
import ast
import operator

from app.schemas.example import GeneratedExample, VerificationResult

_ALLOWED_OPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Pow: operator.pow,
    ast.USub: operator.neg,
    ast.UAdd: operator.pos,
}


class UnsafeExpressionError(Exception):
    pass


def safe_eval(expression: str) -> float:
    """Evaluate a simple arithmetic expression (+ - * / ** and parentheses
    only) without using eval()."""
    tree = ast.parse(expression, mode="eval")
    return _eval_node(tree.body)


def _eval_node(node: ast.AST) -> float:
    if isinstance(node, ast.Constant) and isinstance(node.value, int | float):
        return float(node.value)
    if isinstance(node, ast.BinOp) and type(node.op) in _ALLOWED_OPS:
        return _ALLOWED_OPS[type(node.op)](_eval_node(node.left), _eval_node(node.right))
    if isinstance(node, ast.UnaryOp) and type(node.op) in _ALLOWED_OPS:
        return _ALLOWED_OPS[type(node.op)](_eval_node(node.operand))
    raise UnsafeExpressionError(f"Disallowed expression element: {ast.dump(node)}")


class CalculationVerificationService:
    def verify(self, example: GeneratedExample, tolerance: float = 1e-6) -> VerificationResult:
        if not example.calculation_steps:
            return VerificationResult(
                verified=False,
                expected_result=example.expected_result,
                tolerance=tolerance,
                detail="No calculation steps provided to verify.",
            )
        last_recomputed: float | None = None
        for step in example.calculation_steps:
            try:
                recomputed = safe_eval(step.expression)
            except (UnsafeExpressionError, SyntaxError, ZeroDivisionError) as exc:
                return VerificationResult(
                    verified=False,
                    expected_result=example.expected_result,
                    tolerance=tolerance,
                    detail=f"Could not evaluate '{step.expression}': {exc}",
                )
            if abs(recomputed - step.result) > tolerance:
                return VerificationResult(
                    verified=False,
                    recomputed_result=recomputed,
                    expected_result=example.expected_result,
                    tolerance=tolerance,
                    detail=(
                        f"Step '{step.expression}' claimed result {step.result} but "
                        f"independently recomputed as {recomputed}."
                    ),
                )
            last_recomputed = recomputed

        if example.expected_result is not None and last_recomputed is not None:
            if abs(last_recomputed - example.expected_result) > tolerance:
                return VerificationResult(
                    verified=False,
                    recomputed_result=last_recomputed,
                    expected_result=example.expected_result,
                    tolerance=tolerance,
                    detail=(
                        f"Final step result {last_recomputed} does not match "
                        f"expected_result {example.expected_result}."
                    ),
                )
        return VerificationResult(
            verified=True,
            recomputed_result=last_recomputed,
            expected_result=example.expected_result,
            tolerance=tolerance,
            detail="All calculation steps independently verified.",
        )
