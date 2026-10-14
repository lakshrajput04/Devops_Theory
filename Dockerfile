FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=10000

WORKDIR /app

# Install dependencies first so this layer is cached between code changes
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app.py .
COPY templates/ templates/
COPY static/ static/

# Run as a non-root user
RUN useradd --create-home appuser
USER appuser

EXPOSE 10000

# One worker so the in-memory leaderboard is shared; threads handle concurrency.
# Render injects $PORT at runtime.
CMD gunicorn --workers 1 --threads 4 --bind 0.0.0.0:${PORT} app:app
