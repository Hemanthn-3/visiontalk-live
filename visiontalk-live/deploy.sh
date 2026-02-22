#!/bin/bash

# VisionTalk Live Deployment Script

echo "Starting VisionTalk Live deployment..."

# Build Docker image
echo "Building Docker image..."
docker build -t visiontalk-live:latest ./backend

# Run the container
echo "Running container..."
docker run -d -p 3000:3000 --name visiontalk-live visiontalk-live:latest

echo "Deployment complete!"
echo "Server running at http://localhost:3000"
