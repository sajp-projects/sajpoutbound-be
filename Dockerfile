FROM node:18-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the code
COPY . .

# Set environment variables
ENV TZ=Asia/Jakarta

# Generate Prisma client
RUN npx prisma generate

# Build the app
RUN npm run build

# Expose the port
EXPOSE 3000

# Command to run the app with proper DB setup based on environment
CMD sh -c "echo 'Waiting for MySQL to be ready...' && sleep 5 && if [ \"$NODE_ENV\" = \"production\" ]; then npx prisma migrate deploy; else npx prisma migrate reset --force; fi && npm start"