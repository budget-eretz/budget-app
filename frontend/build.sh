#!/bin/bash

# Build script for Render.com deployment
# Handles Rollup optional dependency issues

echo "Starting frontend build process..."

# Print environment variables for debugging
echo "Environment variables:"
echo "VITE_API_URL: $VITE_API_URL"
echo "NODE_ENV: $NODE_ENV"

# Clean previous builds
rm -rf node_modules package-lock.json dist

# Install dependencies with optional dependencies
echo "Installing dependencies..."
npm install --include=optional

# If Rollup Linux dependency is missing, try to install it explicitly
if ! npm list @rollup/rollup-linux-x64-gnu > /dev/null 2>&1; then
    echo "Installing Rollup Linux dependency..."
    npm install @rollup/rollup-linux-x64-gnu --save-optional --no-save || echo "Optional dependency install failed, continuing..."
fi

# Build the project
echo "Building project..."
npm run build

echo "Build completed successfully!"
echo "Files in dist directory:"
ls -la dist/