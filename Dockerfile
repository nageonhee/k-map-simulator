# Build stage
FROM node:20-slim AS build-stage

WORKDIR /app

# Install build dependencies
COPY package*.json ./
RUN npm install

# Copy project files
COPY . .

# Build the frontend (Vite)
RUN npm run build

# Production stage
FROM node:20-slim AS production-stage

WORKDIR /app

# Install Python 3, venv, and other dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-venv \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Set up Virtual Environment
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy built assets and server code
COPY --from=build-stage /app/dist ./dist
COPY --from=build-stage /app/package*.json ./
COPY --from=build-stage /app/server.ts ./
COPY --from=build-stage /app/src ./src
COPY --from=build-stage /app/main.py ./
COPY --from=build-stage /app/start.sh ./

# Make startup script executable
RUN chmod +x ./start.sh

# Install production dependencies
RUN npm install --omit=dev

# Final environment settings
ENV NODE_ENV=production
ENV PORT=3000

# Metadata for Cloud Run
EXPOSE 3000
EXPOSE 8000

# Install tsx globally in production stage
RUN npm install -g tsx

# Start both servers
CMD ["./start.sh"]
