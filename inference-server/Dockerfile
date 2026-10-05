# Reference GPU inference server. Pick a PyTorch CUDA image that matches your driver.
FROM pytorch/pytorch:2.5.1-cuda12.4-cudnn9-runtime

ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1 HF_HOME=/models/hf
WORKDIR /srv
COPY requirements.txt requirements-gpu.txt ./
RUN pip install -r requirements-gpu.txt
COPY app ./app

RUN useradd --create-home --uid 10001 inference && mkdir -p /models && chown inference /models
USER inference
EXPOSE 8190
# Bind inside the container; publish the port only on the private network (see README).
CMD ["uvicorn", "--factory", "app.main:app_factory", "--host", "0.0.0.0", "--port", "8190", "--workers", "1"]
