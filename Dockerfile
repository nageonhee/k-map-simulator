# Build stage
FROM node:20-slim AS build-stage

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM node:20-slim AS production-stage

WORKDIR /app

# Python 설치
RUN apt-get update && apt-get install -y \
    python3 \
    python3-venv \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Python 가상환경
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Python 패키지 설치
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 빌드된 파일 복사
COPY --from=build-stage /app/dist ./dist
COPY --from=build-stage /app/package*.json ./
COPY --from=build-stage /app/server.ts ./
COPY --from=build-stage /app/src ./src
COPY --from=build-stage /app/main.py ./
COPY --from=build-stage /app/tsconfig.json ./

# 환경 설정
ENV NODE_ENV=production
ENV PORT=8080

# 8080만 노출
EXPOSE 8080

# 전역 설치
RUN npm install -g tsx
RUN npm install --omit=dev

# Node 서버 실행 (Python은 Node 내에서 자동 시작)
CMD ["tsx", "server.ts"]
