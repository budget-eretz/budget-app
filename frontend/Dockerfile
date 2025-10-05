# Frontend Dockerfile for Development

FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose Vite dev server port
EXPOSE 3456

# Default command (can be overridden in docker-compose)
CMD ["npm", "run", "dev"]
