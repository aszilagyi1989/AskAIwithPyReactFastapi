FROM python:3.12-slim AS builder

# uv másolása a hivatalos képből
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

WORKDIR /app

# Függőségek telepítése
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-install-project --no-dev

# 2. fázis: Futtató környezet
FROM python:3.12-slim

WORKDIR /app

# Csak a .venv és a forráskód átmásolása
COPY --from=builder /app/.venv /app/.venv
COPY . .

# Virtuális környezet aktiválása a PATH-on keresztül
ENV PATH="/app/.venv/bin:$PATH"

# Render alapértelmezett port
EXPOSE 10000

# Indítás Uvicorn-nal
# Megjegyzés: A 'main' a fájlneved (main.py), az 'app' pedig a FastAPI példány neve
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "10000"]