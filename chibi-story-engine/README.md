# Chibi Story Animation Engine

Turns a story into an animated 2.5D chibi video: structured storyboard → reusable rigged characters,
layered environments and animation clips → Hindi narration and dialogue → Blender (Cycles) frames →
FFmpeg MP4. The same engine and assets produce any number of stories; a story is only data.

This folder is independent of the Tame app in the rest of the repository.

- Status and phase reports: [PROJECT_STATUS.md](PROJECT_STATUS.md)
- Set-up: [docs/DEVELOPMENT_SETUP.md](docs/DEVELOPMENT_SETUP.md)
- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- All documents: [docs/](docs)

```bash
bash scripts/setup_dev.sh && source .venv/bin/activate
python -m pytest
```
