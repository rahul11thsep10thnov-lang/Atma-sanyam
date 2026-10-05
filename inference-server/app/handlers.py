"""Model handlers. Each one loads lazily on first use and runs synchronously
in a worker thread. torch / transformers / diffusers are imported inside the
handlers so the server's auth and protocol layer imports without them.

UNTESTED against real weights: these were written without GPU access. The
calls follow the libraries' documented APIs; verify each handler on a GPU
host before enabling its model (see README.md, "Bring-up checklist").
"""
import hashlib
import os
import tempfile
import threading
from dataclasses import dataclass, field
from typing import Any, Callable, Protocol

import numpy as np
from PIL import Image

from .config import ConfigError, ModelSource, Settings
from .imaging import BadInput, gray_png, load_image, normalize_depth, pad_to_multiple, png_bytes, snap_size, wan_num_frames


@dataclass
class HandlerResult:
    outputs: dict[str, bytes]
    model_version: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


class Handler(Protocol):
    def run(self, inputs: dict[str, bytes], params: dict[str, Any]) -> HandlerResult: ...


def _require(inputs: dict[str, bytes], name: str) -> bytes:
    if name not in inputs:
        raise BadInput(f'missing input "{name}"')
    return inputs[name]


def _device() -> str:
    import torch

    return "cuda" if torch.cuda.is_available() else "cpu"


def _seed(params: dict[str, Any]) -> int:
    return int(params.get("seed", 0)) & 0xFFFFFFFF


# ---------------------------------------------------------------- depth


class DepthHandler:
    """Depth Anything V2 Small / DPT via transformers. Output: grey PNG, white = near."""

    def __init__(self, src: ModelSource):
        import torch
        from transformers import AutoImageProcessor, AutoModelForDepthEstimation

        self.torch = torch
        self.device = _device()
        self.processor = AutoImageProcessor.from_pretrained(src.repo, revision=src.revision)
        self.model = AutoModelForDepthEstimation.from_pretrained(src.repo, revision=src.revision).to(self.device).eval()
        self.version = src.revision

    def run(self, inputs, params):
        torch = self.torch
        img = load_image(_require(inputs, "image"))
        with torch.inference_mode():
            batch = self.processor(images=img, return_tensors="pt").to(self.device)
            pred = self.model(**batch).predicted_depth  # relative inverse depth: larger = nearer
            pred = torch.nn.functional.interpolate(pred.unsqueeze(1), size=(img.height, img.width), mode="bicubic", align_corners=False)[0, 0]
        return HandlerResult({"depth": gray_png(normalize_depth(pred.float().cpu().numpy()))}, self.version, {"convention": "white=near"})


# ---------------------------------------------------------------- segmentation


class BiRefNetHandler:
    """BiRefNet subject matting. Outputs: mask (grey PNG, white = keep) and cutout (RGBA PNG)."""

    SIZE = 1024

    def __init__(self, src: ModelSource):
        import torch
        from transformers import AutoModelForImageSegmentation

        if not src.revision:
            # trust_remote_code executes Python from the model repository: only run a reviewed, pinned commit.
            raise ConfigError("birefnet loads remote code: pin a reviewed commit in INFERENCE_MODEL_SOURCES ({\"birefnet\": {\"repo\": ..., \"revision\": <sha>}})")
        self.torch = torch
        self.device = _device()
        torch.set_float32_matmul_precision("high")
        self.model = AutoModelForImageSegmentation.from_pretrained(src.repo, revision=src.revision, trust_remote_code=True).to(self.device).eval()
        self.version = src.revision

    def run(self, inputs, params):
        torch = self.torch
        img = load_image(_require(inputs, "image"))
        x = np.asarray(img.resize((self.SIZE, self.SIZE), Image.BILINEAR), dtype=np.float32) / 255.0
        x = (x - np.array([0.485, 0.456, 0.406], dtype=np.float32)) / np.array([0.229, 0.224, 0.225], dtype=np.float32)
        t = torch.from_numpy(x.transpose(2, 0, 1)).unsqueeze(0).to(self.device)
        with torch.inference_mode():
            pred = self.model(t)[-1].sigmoid()[0, 0].float().cpu().numpy()
        mask = Image.fromarray(np.round(pred * 255).astype(np.uint8), mode="L").resize(img.size, Image.BILINEAR)
        cutout = img.convert("RGBA")
        cutout.putalpha(mask)
        return HandlerResult({"mask": png_bytes(mask), "cutout": png_bytes(cutout)}, self.version)


# ---------------------------------------------------------------- inpainting


class LamaHandler:
    """LaMa (big-lama) exported to TorchScript, as distributed by the LaMa/IOPaint projects."""

    def __init__(self, settings: Settings):
        import torch

        path = settings.lama_torchscript_path
        if not path or not os.path.isfile(path):
            raise ConfigError("LAMA_TORCHSCRIPT_PATH must point to the big-lama TorchScript file")
        if not settings.lama_sha256:
            raise ConfigError("LAMA_SHA256 is required: TorchScript files contain code, so the file must match a reviewed checksum")
        with open(path, "rb") as fh:
            digest = hashlib.sha256(fh.read()).hexdigest()
        if digest != settings.lama_sha256:
            raise ConfigError(f"LAMA_TORCHSCRIPT_PATH checksum mismatch ({digest})")
        self.torch = torch
        self.device = _device()
        self.model = torch.jit.load(path, map_location=self.device).eval()
        self.version = f"sha256:{digest[:12]}"

    def run(self, inputs, params):
        torch = self.torch
        img = load_image(_require(inputs, "image"))
        mask_img = load_image(_require(inputs, "mask"), mode="L").resize(img.size, Image.NEAREST)
        rgb = np.asarray(img, dtype=np.float32) / 255.0
        mask = (np.asarray(mask_img) > 127).astype(np.float32)
        h, w = mask.shape
        x = torch.from_numpy(pad_to_multiple(rgb, 8).transpose(2, 0, 1)).unsqueeze(0).to(self.device)
        m = torch.from_numpy(pad_to_multiple(mask, 8)).unsqueeze(0).unsqueeze(0).to(self.device)
        with torch.inference_mode():
            out = self.model(x, m)[0].permute(1, 2, 0).float().cpu().numpy()[:h, :w]
        filled = np.where(mask[..., None] > 0, out, rgb)  # keep every unmasked pixel exactly
        return HandlerResult({"image": png_bytes(Image.fromarray(np.clip(np.round(filled * 255), 0, 255).astype(np.uint8), mode="RGB"))}, self.version)


# ---------------------------------------------------------------- image generation


class _DiffusersImage:
    multiple = 16
    max_pixels = 1_600_000

    def _place(self, pipe, settings: Settings):
        if settings.cpu_offload:
            pipe.enable_model_cpu_offload()
        else:
            pipe.to(_device())
        return pipe

    def _size(self, params):
        return snap_size(int(params.get("width", 1024)), int(params.get("height", 1024)), self.multiple, int(params.get("maxPixels", self.max_pixels)))


class FluxSchnellHandler(_DiffusersImage):
    def __init__(self, src: ModelSource, settings: Settings):
        import torch
        from diffusers import FluxPipeline

        self.torch = torch
        self.pipe = self._place(FluxPipeline.from_pretrained(src.repo, revision=src.revision, torch_dtype=torch.bfloat16), settings)
        self.version = src.revision

    def run(self, inputs, params):
        w, h = self._size(params)
        prompt = str(params.get("prompt", "")).strip()
        if not prompt:
            raise BadInput("prompt is required")
        gen = self.torch.Generator("cpu").manual_seed(_seed(params))
        img = self.pipe(prompt=prompt, width=w, height=h, num_inference_steps=int(params.get("steps", 4)), guidance_scale=0.0, max_sequence_length=256, generator=gen).images[0]
        return HandlerResult({"image": png_bytes(img)}, self.version, {"width": w, "height": h})


class QwenImageHandler(_DiffusersImage):
    def __init__(self, src: ModelSource, settings: Settings):
        import torch
        from diffusers import DiffusionPipeline

        self.torch = torch
        self.pipe = self._place(DiffusionPipeline.from_pretrained(src.repo, revision=src.revision, torch_dtype=torch.bfloat16), settings)
        self.version = src.revision

    def run(self, inputs, params):
        w, h = self._size(params)
        prompt = str(params.get("prompt", "")).strip()
        if not prompt:
            raise BadInput("prompt is required")
        gen = self.torch.Generator("cpu").manual_seed(_seed(params))
        img = self.pipe(
            prompt=prompt,
            negative_prompt=str(params.get("negativePrompt") or " "),
            width=w,
            height=h,
            num_inference_steps=int(params.get("steps", 30)),
            true_cfg_scale=float(params.get("guidance", 4.0)),
            generator=gen,
        ).images[0]
        return HandlerResult({"image": png_bytes(img)}, self.version, {"width": w, "height": h})


# ---------------------------------------------------------------- image to video (optional)


class WanI2VHandler(_DiffusersImage):
    max_pixels = 480 * 832

    def __init__(self, src: ModelSource, settings: Settings):
        import torch
        from diffusers import AutoencoderKLWan, WanImageToVideoPipeline
        from transformers import CLIPVisionModel

        self.torch = torch
        enc = CLIPVisionModel.from_pretrained(src.repo, subfolder="image_encoder", revision=src.revision, torch_dtype=torch.float32)
        vae = AutoencoderKLWan.from_pretrained(src.repo, subfolder="vae", revision=src.revision, torch_dtype=torch.float32)
        pipe = WanImageToVideoPipeline.from_pretrained(src.repo, vae=vae, image_encoder=enc, revision=src.revision, torch_dtype=torch.bfloat16)
        self.pipe = self._place(pipe, settings)
        self.version = src.revision

    def run(self, inputs, params):
        from diffusers.utils import export_to_video

        img = load_image(_require(inputs, "image"))
        w, h = self._size(params)
        fps = int(params.get("fps", 16))
        frames_n = wan_num_frames(float(params.get("durationSeconds", 4)), fps)
        gen = self.torch.Generator("cpu").manual_seed(_seed(params))
        frames = self.pipe(
            image=img.resize((w, h), Image.LANCZOS),
            prompt=str(params.get("prompt", "")),
            negative_prompt=str(params.get("negativePrompt") or ""),
            width=w,
            height=h,
            num_frames=frames_n,
            num_inference_steps=int(params.get("steps", 30)),
            guidance_scale=float(params.get("cfg", 5.0)),
            generator=gen,
        ).frames[0]
        with tempfile.TemporaryDirectory() as tmp:
            path = os.path.join(tmp, "clip.mp4")
            export_to_video(frames, path, fps=fps)
            with open(path, "rb") as fh:
                video = fh.read()
        return HandlerResult({"video": video}, self.version, {"fps": fps, "frames": frames_n, "width": w, "height": h})


# ---------------------------------------------------------------- registry

# Backend modelId → default weights. Override (and pin revisions) with INFERENCE_MODEL_SOURCES.
DEFAULT_SOURCES: dict[str, ModelSource] = {
    "depth-anything-v2-small": ModelSource("depth-anything/Depth-Anything-V2-Small-hf"),
    "midas-dpt-hybrid": ModelSource("Intel/dpt-hybrid-midas"),
    "birefnet": ModelSource("ZhengPeng7/BiRefNet"),
    "flux1-schnell": ModelSource("black-forest-labs/FLUX.1-schnell"),
    "qwen-image": ModelSource("Qwen/Qwen-Image"),
    "wan2.1-i2v-14b-480p": ModelSource("Wan-AI/Wan2.1-I2V-14B-480P-Diffusers"),
}

Factory = Callable[[Settings], Handler]


def _src(settings: Settings, model_id: str) -> ModelSource:
    return settings.sources.get(model_id) or DEFAULT_SOURCES[model_id]


FACTORIES: dict[tuple[str, str], Factory] = {
    ("depth", "depth-anything-v2-small"): lambda s: DepthHandler(_src(s, "depth-anything-v2-small")),
    ("depth", "midas-dpt-hybrid"): lambda s: DepthHandler(_src(s, "midas-dpt-hybrid")),
    ("segmentation", "birefnet"): lambda s: BiRefNetHandler(_src(s, "birefnet")),
    ("inpainting", "big-lama"): lambda s: LamaHandler(s),
    ("image-generation", "flux1-schnell"): lambda s: FluxSchnellHandler(_src(s, "flux1-schnell"), s),
    ("image-generation", "qwen-image"): lambda s: QwenImageHandler(_src(s, "qwen-image"), s),
    ("i2v", "wan2.1-i2v-14b-480p"): lambda s: WanI2VHandler(_src(s, "wan2.1-i2v-14b-480p"), s),
}


class Registry:
    """Lazily instantiates handlers for the allow-listed models; one instance per (task, model)."""

    def __init__(self, settings: Settings, factories: dict[tuple[str, str], Factory] | None = None):
        self.settings = settings
        self.factories = FACTORIES if factories is None else factories
        self._handlers: dict[tuple[str, str], Handler] = {}
        self._lock = threading.Lock()

    def supported(self) -> list[dict[str, str]]:
        return [{"task": t, "model": m} for (t, m) in self.factories if m in self.settings.models]

    def loaded(self) -> list[str]:
        return [f"{t}:{m}" for (t, m) in self._handlers]

    def knows(self, task: str, model: str) -> bool:
        return model in self.settings.models and (task, model) in self.factories

    def get(self, task: str, model: str) -> Handler:
        key = (task, model)
        with self._lock:
            if key not in self._handlers:
                self._handlers[key] = self.factories[key](self.settings)
            return self._handlers[key]


def gpu_info() -> dict[str, Any] | None:
    try:
        import torch
    except ImportError:
        return None
    if not torch.cuda.is_available():
        return None
    free, total = torch.cuda.mem_get_info()
    return {"name": torch.cuda.get_device_name(0), "vramTotalGb": round(total / 1e9, 1), "vramFreeGb": round(free / 1e9, 1)}
