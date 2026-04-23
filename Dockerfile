FROM node:20-alpine

WORKDIR /app

# Copy package files for both client and server
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install server dependencies
RUN cd server && npm install --production

# Install client dependencies
# We install all dependencies to build, then we can clean up if we want, but for simplicity we keep it.
RUN cd client && npm install

# Copy source code
COPY server/ ./server/
COPY client/ ./client/

# Build client
RUN cd client && npm run build

# Expose port
EXPOSE 5001

# Start the server
WORKDIR /app/server
CMD ["node", "index.js"]
