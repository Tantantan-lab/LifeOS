# syntax=docker/dockerfile:1
# LifeOS API — connector engine + AI insights (FastAPI).
# Build context = repo root (mirrors the web service convention).
# Dev: the compose service bind-mounts ./apps/api:/app, so edits hot-reload
# with uvicorn --reload; no image rebuild needed.

FROM python:3.14-slim
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1
WORKDIR /app
COPY apps/api/pyproject.toml apps/api/README.md ./
COPY apps/api/app ./app
COPY apps/api/tests ./tests
RUN pip install -e ".[dev]"
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
