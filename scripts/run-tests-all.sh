#!/bin/bash

# CloudStorage Comprehensive Test Runner
# This script orchestrates the full testing lifecycle

# Exit on any failure
set -e

echo "🚀 Starting Comprehensive Test Suite..."

# 1. Start Docker Backend
echo "🐳 Starting Docker backend (Test Environment)..."
docker-compose -f docker-compose.test.yml up -d --build

# 2. Run Backend Unit & Integration Tests
echo "🧪 Running Backend Unit & Integration Tests..."
dotnet test tests/CloudStorage.Domain.Tests
dotnet test tests/CloudStorage.Application.Tests
dotnet test tests/CloudStorage.API.Tests

# 3. Run Frontend Unit Tests
echo "🔧 Running Frontend Unit Tests (Vitest)..."
cd CloudStorage.Client
npm run test:ci
cd ..

# 4. Run E2E Tests (Against Real Backend)
echo "🎭 Running E2E Persona Tests..."
cd CloudStorage.Client
# Wait for API to be healthy
npm run e2e:real
cd ..

echo "✅ All tests passed successfully!"

# 5. Optional: Tear down environment
# docker-compose -f docker-compose.test.yml down
