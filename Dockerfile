# Stage 1: Build the application
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Serve the application
FROM node:20-alpine
WORKDIR /app

# Copy built assets from the builder stage
COPY --from=builder /app/dist ./dist
COPY package*.json ./

# Install only production dependencies (if any are needed by the server, though vite preview is self-contained)
# For vite preview, it's often not strictly necessary to run npm install again if vite is a devDependency,
# but to be safe and ensure vite is available, we can install it.
RUN npm install --omit=dev vite # Install vite itself

# Expose the port the app runs on. Vite preview defaults to 4173.
# If you want to use a different port, you can change it here and in the CMD.
EXPOSE 4173

# Command to run the application
# The '--host' flag makes Vite listen on all available network interfaces (0.0.0.0)
# This is crucial for Docker port mapping to work.
CMD ["npm", "run", "preview", "--", "--host", "--port", "4173"]
