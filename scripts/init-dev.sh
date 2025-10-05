#!/bin/bash

# Script to initialize development environment
# This script runs migrations and seeds the database

set -e

echo "🚀 Initializing Budget App Development Environment..."

# Wait for database to be ready
echo "⏳ Waiting for database..."
sleep 5

# Run migrations
echo "📦 Running database migrations..."
npm run migrate

# Seed database
echo "🌱 Seeding database with sample data..."
npm run seed

echo "✅ Development environment initialized!"
echo ""
echo "📝 Sample login credentials:"
echo "   Circle Treasurer: treasurer@circle.com / password123"
echo "   Group Treasurer:  treasurer@north.com / password123"
echo "   Member:           member1@circle.com / password123"
echo ""
echo "🌐 Access the application at:"
echo "   Frontend: http://localhost:3456"
echo "   Backend:  http://localhost:4567"
