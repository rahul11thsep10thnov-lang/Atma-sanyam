"""Generates shared/schema/teaching_plan.schema.json from the Pydantic
TeachingPlan model, which is the source of truth (see docs/ARCHITECTURE.md).

Run: python -m app.schemas.export_schema
"""
import json
from pathlib import Path

from app.schemas.lesson import TeachingPlan


def main() -> None:
    out_path = Path(__file__).resolve().parents[3] / "shared" / "schema" / "teaching_plan.schema.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    schema = TeachingPlan.model_json_schema()
    out_path.write_text(json.dumps(schema, indent=2))
    print(f"Wrote {out_path}")


if __name__ == "__main__":
    main()
