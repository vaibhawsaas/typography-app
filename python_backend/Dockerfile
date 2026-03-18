# Use an official Python slim image
FROM python:3.11-slim

# Install system-level dependencies needed by moviepy / pillow / edge-tts
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies first (layer-cached)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code
COPY . .

# Create the outputs directory
RUN mkdir -p outputs

EXPOSE 5000

# Run with Uvicorn (production-grade ASGI server)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "5000", "--workers", "2"]
