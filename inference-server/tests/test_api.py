"""Protocol and security tests. They use a fake model handler, so they run on
CPU without torch; the real GPU handlers are not exercised here."""
import base64
import io
import json
import sys
import time
from pathlib import Path

import numpy as np
import pytest
from fastapi.testclient import TestClient
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import ConfigError, Settings, load_settings  # noqa: E402
from app.handlers import HandlerResult, Registry  # noqa: E402
from app.imaging import BadInput, normalize_depth, pad_to_multiple, snap_size, wan_num_frames  # noqa: E402
from app.main import create_app  # noqa: E402
from app.security import ReplayCache, sign_body, verify_signature  # noqa: E402

KEY = "k" * 32
SECRET = "s" * 40


class FakeDepth:
    def __init__(self, settings):
        self.calls = 0

    def run(self, inputs, params):
        if "image" not in inputs:
            raise BadInput('missing input "image"')
        self.calls += 1
        img = Image.open(io.BytesIO(inputs["image"]))
        buf = io.BytesIO()
        Image.new("L", img.size, 200).save(buf, format="PNG")
        return HandlerResult({"depth": buf.getvalue()}, "fake-1", {"convention": "white=near"})


def make_client(**overrides):
    settings = Settings(api_key=KEY, signing_secret=SECRET, models=frozenset({"depth-anything-v2-small"}), **overrides)
    registry = Registry(settings, {("depth", "depth-anything-v2-small"): FakeDepth})
    return TestClient(create_app(settings, registry))


def png_b64(w=8, h=6):
    buf = io.BytesIO()
    Image.new("RGB", (w, h), (10, 20, 30)).save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()


def signed(task="depth", job_id="job-1", body=None, ts=None, key=KEY, secret=SECRET, sig=None):
    payload = body if body is not None else {"jobId": job_id, "model": "depth-anything-v2-small", "inputs": {"image": png_b64()}, "params": {"role": "background"}}
    raw = json.dumps(payload).encode()
    timestamp = str(int(time.time()) if ts is None else ts)
    headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json", "X-Atma-Job-Id": job_id, "X-Atma-Timestamp": timestamp, "X-Atma-Signature": sig or sign_body(secret, timestamp, job_id, raw)}
    return f"/v1/{task}", raw, headers


def test_signature_matches_the_node_client():
    # Vector produced by signBody() in backend/src/studio/localai/http/InferenceClient.ts
    body = b'{"jobId":"job-123","model":"depth-anything-v2-small","inputs":{"image":"aGVsbG8="},"params":{"role":"background"}}'
    expected = "ef02e33ec88097162eb8af494c8f84fb105301968a9b44942b29166a15db3dff"
    assert sign_body("test-secret", "1700000000", "job-123", body) == expected
    assert verify_signature("test-secret", "1700000000", "job-123", expected, body, now=1700000100)
    assert not verify_signature("test-secret", "1700000000", "job-123", expected, body, now=1700000400)
    assert not verify_signature("test-secret", "1700000000", "job-123", expected, body + b" ", now=1700000100)


def test_successful_signed_job():
    client = make_client(worker_id="gpu-a")
    url, raw, headers = signed()
    res = client.post(url, content=raw, headers=headers)
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["model"] == "depth-anything-v2-small" and body["modelVersion"] == "fake-1" and body["gpuWorkerId"] == "gpu-a"
    depth = Image.open(io.BytesIO(base64.b64decode(body["outputs"]["depth"])))
    assert depth.size == (8, 6) and depth.mode == "L"


def test_health_requires_the_api_key():
    client = make_client()
    assert client.get("/v1/health").status_code == 401
    assert client.get("/v1/health", headers={"Authorization": "Bearer wrong"}).status_code == 401
    res = client.get("/v1/health", headers={"Authorization": f"Bearer {KEY}"})
    assert res.status_code == 200 and res.json()["models"] == ["depth-anything-v2-small"]


def test_no_unauthenticated_docs():
    client = make_client()
    for path in ("/docs", "/openapi.json", "/redoc"):
        assert client.get(path).status_code == 404


@pytest.mark.parametrize(
    "mutate,status",
    [
        (lambda u, r, h: (u, r, {**h, "Authorization": "Bearer nope"}), 401),
        (lambda u, r, h: (u, r, {k: v for k, v in h.items() if k != "Authorization"}), 401),
        (lambda u, r, h: (u, r + b" ", h), 401),  # body tampered after signing
        (lambda u, r, h: (u, r, {**h, "X-Atma-Signature": "00" * 32}), 401),
        (lambda u, r, h: (u, r, {k: v for k, v in h.items() if k != "X-Atma-Signature"}), 401),
        (lambda u, r, h: ("/v1/unknown", r, h), 404),
    ],
)
def test_rejections(mutate, status):
    client = make_client()
    url, raw, headers = mutate(*signed())
    assert client.post(url, content=raw, headers=headers).status_code == status


def test_stale_timestamp_is_rejected():
    client = make_client()
    url, raw, headers = signed(ts=int(time.time()) - 301)
    assert client.post(url, content=raw, headers=headers).status_code == 401


def test_replay_is_rejected():
    client = make_client()
    url, raw, headers = signed()
    assert client.post(url, content=raw, headers=headers).status_code == 200
    assert client.post(url, content=raw, headers=headers).status_code == 409


def test_job_id_must_match_the_signed_header():
    client = make_client()
    body = {"jobId": "other", "model": "depth-anything-v2-small", "inputs": {"image": png_b64()}, "params": {}}
    url, raw, headers = signed(body=body, job_id="job-1")
    assert client.post(url, content=raw, headers=headers).status_code == 401


def test_models_outside_the_allowlist_or_task_are_rejected():
    client = make_client()
    for task, model in (("depth", "depth-anything-v2-large"), ("segmentation", "depth-anything-v2-small")):
        body = {"jobId": "j", "model": model, "inputs": {"image": png_b64()}, "params": {}}
        url, raw, headers = signed(task=task, job_id="j", body=body)
        assert client.post(url, content=raw, headers=headers).status_code == 400


def test_bad_inputs_are_rejected_without_retry():
    client = make_client()
    body = {"jobId": "j2", "model": "depth-anything-v2-small", "inputs": {"image": "%%%not-base64"}, "params": {}}
    url, raw, headers = signed(job_id="j2", body=body)
    assert client.post(url, content=raw, headers=headers).status_code == 400
    body = {"jobId": "j3", "model": "depth-anything-v2-small", "inputs": {}, "params": {}}
    url, raw, headers = signed(job_id="j3", body=body)
    assert client.post(url, content=raw, headers=headers).status_code == 400


def test_body_size_limit():
    client = make_client(max_body_bytes=2048)
    body = {"jobId": "big", "model": "depth-anything-v2-small", "inputs": {"image": "A" * 4096}, "params": {}}
    url, raw, headers = signed(job_id="big", body=body)
    assert client.post(url, content=raw, headers=headers).status_code == 413


def test_settings_refuse_weak_secrets_and_non_commercial_models():
    good = {"INFERENCE_API_KEY": KEY, "INFERENCE_SIGNING_SECRET": SECRET}
    with pytest.raises(ConfigError):
        load_settings({**good, "INFERENCE_API_KEY": "short"})
    with pytest.raises(ConfigError):
        load_settings({**good, "INFERENCE_SIGNING_SECRET": "short"})
    with pytest.raises(ConfigError, match="non-commercial"):
        load_settings({**good, "INFERENCE_MODELS": "depth-anything-v2-small,flux1-dev"})
    with pytest.raises(ConfigError):
        load_settings({**good, "INFERENCE_MODEL_SOURCES": "{not json"})
    s = load_settings({**good, "INFERENCE_MODELS": "birefnet, depth-anything-v2-small", "INFERENCE_MODEL_SOURCES": '{"birefnet": {"repo": "ZhengPeng7/BiRefNet", "revision": "abc123"}}'})
    assert s.models == {"birefnet", "depth-anything-v2-small"} and s.sources["birefnet"].revision == "abc123"


def test_replay_cache_expires():
    cache = ReplayCache(ttl_seconds=10)
    assert cache.add("a", now=0) and not cache.add("a", now=5)
    assert cache.add("a", now=11)


def test_image_helpers():
    d = normalize_depth(np.linspace(0, 10, 100).reshape(10, 10))
    assert d.dtype == np.uint8 and d[0, 0] == 0 and d[-1, -1] == 255  # larger inverse depth (nearer) → white
    assert snap_size(1080, 1920, 16, 480 * 832) == (464, 832)
    w, h = snap_size(1080, 1920, 16, 1_600_000)
    assert w % 16 == 0 and h % 16 == 0 and w * h <= 1_600_000
    assert wan_num_frames(4, 16) == 65 and wan_num_frames(10, 16) == 81 and (wan_num_frames(3, 16) - 1) % 4 == 0
    assert pad_to_multiple(np.zeros((10, 13, 3)), 8).shape == (16, 16, 3)
