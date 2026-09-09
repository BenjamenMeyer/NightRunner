# Stage 1: Build
FROM python:3.12-alpine AS builder

WORKDIR /app

# Install build dependencies for psycopg and others if needed
RUN apk add --no-cache gcc musl-dev postgresql-dev libffi-dev

# Create a virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install dependencies
COPY pyproject.toml .
COPY nightrunner_backend/ nightrunner_backend/
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir .

# Stage 2: Runtime
FROM python:3.12-alpine

WORKDIR /app

# Install runtime dependencies for psycopg
RUN apk add --no-cache libpq

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy source code
COPY nightrunner_backend/ nightrunner_backend/

# Create a non-root user
RUN adduser -D nightrunner
USER nightrunner

# Set default port and entry point (respecting $PORT environment variable passed by Cloud Run)
ENV PORT=8000
CMD ["sh", "-c", "exec uvicorn nightrunner_backend.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
