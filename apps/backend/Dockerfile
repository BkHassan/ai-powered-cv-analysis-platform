# syntax=docker/dockerfile:1

# Builder Stage
FROM node:18-bullseye AS builder
WORKDIR /app

# Install build dependencies required for native modules
RUN apt-get update && apt-get install -y \
  build-essential \
  python3 \
  libvips-dev \
  && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json ./
COPY pnpm-lock.yaml ./

# Install pnpm and dependencies for build
RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile

# Copy source code and build
COPY tsconfig.json ./
COPY src ./src
RUN pnpm run build

# Production Stage
FROM node:18-bullseye
ENV NODE_ENV=production
WORKDIR /app

# Create non-root user
RUN addgroup --system app && adduser --system --ingroup app app

# Install system dependencies required by the application
RUN apt-get update && apt-get install -y \
  libc6 \
  libstdc++6 \
  libgomp1 \
  wget \
  curl \
  libssl-dev \
  libatomic1 \
  libprotobuf-dev \
  libprotoc-dev \
  liblzma-dev \
  libzstd-dev \
  ca-certificates \
  build-essential \
  python3 \
  libvips-dev \
  && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json ./
COPY pnpm-lock.yaml ./

# Install pnpm and production dependencies
RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile --prod

# Copy compiled code from builder stage
COPY --from=builder /app/dist ./dist

# Fix permissions & switch user
RUN chown -R app:app /app
USER app

# Expose and healthcheck
EXPOSE 3003
HEALTHCHECK --interval=30s --timeout=5s \
  CMD wget --quiet --tries=1 --spider http://localhost:3003 || exit 1

# Start the app
CMD ["node", "dist/main.js"]