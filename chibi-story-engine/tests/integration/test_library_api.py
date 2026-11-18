"""Library API additions: stats, components, environment previews, enriched asset metadata, asset report."""
from __future__ import annotations

import pytest

pytestmark = pytest.mark.db
API = "/api/v1"


def test_library_stats_are_counted_from_disk(client, auth):
    s = client.get(f"{API}/library/stats", headers=auth).json()
    assert s["by_type"]["environment"] >= 178 and s["by_type"]["component"] >= 227 and s["by_type"]["character"] >= 119
    assert s["environment_categories"]["HNT"] == 12 and s["scare_layers"] >= 20 and s["svg_masters"] > 1000
    assert s["not_delivered"]


def test_components_endpoint_filters_by_kind(client, auth):
    trees = client.get(f"{API}/components?kind=tree", headers=auth).json()
    assert len(trees) == 30 and all(t["svg_url"].endswith(".svg") and t["image_url"].endswith(".png") for t in trees)
    assert client.get(f"{API}/components?q=banyan", headers=auth).json()


def test_assets_carry_catalogue_metadata_and_environment_detail(client, auth):
    env = next(e for e in client.get(f"{API}/environments", headers=auth).json() if e["id"] == "env-hnt-0001")
    assert env["category"] == "HNT" and env["catalog_code"] == "ENV-HNT-0001" and env["approval_status"] == "pending"
    assert any(l["scare"] for l in env["layers"]) and env["layers"][0]["svg_url"]
    assert env["compatibility"]["scare_levels"] == [0, 1, 2] and env["composite_url"]
    ch = next(c for c in client.get(f"{API}/characters", headers=auth).json() if c["id"] == "char-hum-0001")
    assert ch["catalog_code"] == "CHAR-HUM-0001" and len(ch["expression_images"]) == 15 and len(ch["pose_images"]) == 15


def test_environment_preview_renders_and_scare_level_changes_it(client, auth):
    a = client.get(f"{API}/environments/env-hnt-0001/preview?scare=0&width=320", headers=auth)
    b = client.get(f"{API}/environments/env-hnt-0001/preview?scare=2&width=320", headers=auth)
    assert a.status_code == b.status_code == 200 and a.headers["content-type"] == "image/jpeg"
    assert a.content != b.content
    night = client.get(f"{API}/environments/env-for-0001/preview?lighting=night&weather=fog&season=winter&width=320", headers=auth)
    assert night.status_code == 200
    assert client.get(f"{API}/environments/nope/preview", headers=auth).status_code == 404


def test_presets_list_fifteen_expressions_and_poses(client, auth):
    p = client.get(f"{API}/library/presets", headers=auth).json()
    assert len(p["facial_poses"]) == 15 and len(p["poses"]) == 15 and "monsoon" in p["seasons"]
    assert {"fog", "snow", "storm", "cloudy"} <= set(p["weather"])
