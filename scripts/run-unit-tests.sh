#!/bin/bash
set -e

# Frontend Unit Tests Only Runner
# Runs Vitest unit tests
# Usage: ./scripts/run-unit-tests.sh

echo "🧪 Frontend Unit Test Runner"
echo "============================="
echo ""

cd CloudStorage.Client

# Run with coverage report
echo "📊 Running Vitest with coverage reporting..."
npm run test:ci

echo ""
echo "📊 Coverage Report:"
echo "   File: coverage/coverage-final.json"
echo "   HTML: ./coverage/index.html"
