# Chibi Story Animation Engine: API, render worker and (optionally) the built dashboard in one image.
# Build:  docker build -t csae .          Run: see docker-compose.yml
FROM node:22-bookworm-slim AS dashboard
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npx vite build

FROM python:3.13-slim-bookworm
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 CSAE_ENV=production CSAE_DATA_ROOT=/data CSAE_ASSET_LIBRARY=/data/asset_library \
    CSAE_FRONTEND_DIST=/app/frontend/dist
RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg espeak-ng fonts-noto-core postgresql-client \
      libegl1 libgl1 libxrender1 libxi6 libxkbcommon0 libsm6 libxfixes3 libxxf86vm1 libgomp1 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY pyproject.toml alembic.ini ./
COPY engine ./engine
COPY backend ./backend
COPY tools ./tools
RUN pip install ".[render,backend,forge,llm]"
COPY scripts ./scripts
COPY asset_library ./asset_library
COPY --from=dashboard /app/frontend/dist ./frontend/dist
RUN useradd --create-home --uid 10001 csae && mkdir -p /data && chown -R csae /data /app
USER csae
VOLUME /data
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/health').status == 200 else 1)"
# First start seeds /data with the shipped asset library, applies migrations, then serves.
CMD ["sh", "-c", "[ -d /data/asset_library ] || cp -r /app/asset_library /data/asset_library; alembic upgrade head && python -m backend.cli serve --host 0.0.0.0 --port 8000"]
