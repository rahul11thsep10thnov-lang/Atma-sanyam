"""Run the species-rig tests and store the counts for the acceptance register: python -m tools.asset_forge.rig_report"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main() -> None:
    r = subprocess.run([sys.executable, "-m", "pytest", "-p", "no:cacheprovider", "-o", "addopts=", "-q", "tests/acceptance/test_species_rigs.py"], cwd=ROOT, capture_output=True, text=True)
    tail = r.stdout.strip().splitlines()[-1] if r.stdout.strip() else ""
    passed = int(m.group(1)) if (m := re.search(r"(\d+) passed", tail)) else 0
    failed = int(m.group(1)) if (m := re.search(r"(\d+) failed", tail)) else 0
    out = {"file": "tests/acceptance/test_species_rigs.py", "passed": passed, "failed": failed, "summary": tail, "run_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
           "checks": ["rig validates against its template", "20 clips run through the existing composer without errors", "parts stay attached on every sampled frame (bounding-box check)",
                      "head retracts into the shell", "version 1 crocodile still loads and animates"]}
    (ROOT / "docs" / "generated").mkdir(parents=True, exist_ok=True)
    (ROOT / "docs" / "generated" / "rig_test_results.json").write_text(json.dumps(out, indent=2) + "\n", encoding="utf-8")
    print(out["summary"])


if __name__ == "__main__":
    main()
