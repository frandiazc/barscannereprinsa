# Build stage
FROM node:22-alpine as builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Limpiar caché y forzar instalación exhaustiva de dependencias
RUN npm cache clean --force && npm install --no-audit --no-fund

# Copy source code
COPY . .

# Build step
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets to Nginx serving directory
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port (Coolify usually maps this automatically, Nginx default is 80)
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
