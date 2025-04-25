# Use lightweight Node image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install netcat for database connection checking
RUN apk add --no-cache netcat-openbsd

# Copy only the package files first for better Docker layer caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the project files
COPY . .

# Set timezone environment variable
ENV TZ=Asia/Jakarta

# Build the app (e.g., transpile TypeScript if needed)
RUN npm run build

# Expose app port (default: 3000)
EXPOSE 3000

# Runtime command will be defined in docker-compose, so no CMD needed here