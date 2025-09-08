# Use the stable version of Node.js as the base image for building the application
FROM node:18-alpine AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and pnpm lock file into the container
COPY package.json pnpm-lock.yaml ./

# Install pnpm globally and install project dependencies
RUN npm install -g pnpm
RUN pnpm install

# Copy the entire source code into the container
COPY . .

# Build the Next.js application (production build)
RUN pnpm run build

# Create a new image for the production environment
FROM node:18-alpine AS runner

# Set the working directory for the production environment
WORKDIR /app

# Copy the build files from the builder container into the runner container
COPY --from=builder /app ./

# Install pnpm globally in the production container
RUN npm install -g pnpm

# Expose port 3000 for the application to run
EXPOSE 3000

# Start the Next.js application in production mode
CMD ["pnpm", "start"]
