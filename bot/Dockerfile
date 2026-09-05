# Multi-stage Docker build for Hugging Face Spaces Docker SDK
# Stage 1: Build TypeScript code
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm ci

COPY src ./src
RUN npm run build

# Stage 2: Production runtime image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=7860

# Install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled JavaScript output
COPY --from=builder /app/dist ./dist

# Hugging Face Spaces requires running as non-root user (UID 1000 = node in Alpine)
RUN chown -R node:node /app
USER node

EXPOSE 7860

# Start Bot and HTTP health check server
CMD ["node", "dist/index.js"]
