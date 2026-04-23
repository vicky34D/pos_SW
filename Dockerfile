# Stage 1: Build Frontend
FROM node:20-slim AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ ./
ARG VITE_GOOGLE_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
RUN npm run build

# Stage 2: Build Backend & Final Image
FROM node:20-slim
WORKDIR /app

# Install dependencies for better-sqlite3 compilation
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY server/package*.json ./server/
RUN cd server && npm install --production

# Copy source and built frontend
COPY server/ ./server/
COPY --from=client-builder /app/client/dist ./client/dist

# Expose port
EXPOSE 5001

# Start the server
WORKDIR /app/server
CMD ["node", "index.js"]
