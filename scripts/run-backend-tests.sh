#!/bin/bash
set -e

# Backend Tests Only Runner
# Runs all .NET unit, integration, and API tests
# Usage: ./scripts/run-backend-tests.sh

echo "🔧 Backend Test Suite Runner"
echo "============================="
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check Docker status (for integration tests)
echo -e "${YELLOW}📦 Starting test database...${NC}"

if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running${NC}"
    exit 1
fi

docker-compose -f docker-compose.test.yml up -d postgres-test redis-test rabbitmq-test

# Wait for database
echo -e "${YELLOW}⏳ Waiting for database to be ready...${NC}"
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if docker exec cloudstorage-postgres-test-1 pg_isready -U postgres > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Database is ready${NC}"
        break
    fi
    attempt=$((attempt + 1))
    sleep 1
done

echo ""

# Run tests in order of dependency
echo -e "${YELLOW}🧪 Running Domain Tests...${NC}"
cd tests/CloudStorage.Domain.Tests
if dotnet test --configuration Release --verbosity=minimal; then
    echo -e "${GREEN}✅ Domain tests passed${NC}"
else
    echo -e "${RED}❌ Domain tests failed${NC}"
    exit 1
fi
cd ../..
echo ""

echo -e "${YELLOW}🧪 Running Application Tests...${NC}"
cd tests/CloudStorage.Application.Tests
if dotnet test --configuration Release --verbosity=minimal; then
    echo -e "${GREEN}✅ Application tests passed${NC}"
else
    echo -e "${RED}❌ Application tests failed${NC}"
    exit 1
fi
cd ../..
echo ""

echo -e "${YELLOW}🧪 Running Infrastructure Tests...${NC}"
cd tests/CloudStorage.Infrastructure.Tests
if dotnet test --configuration Release --verbosity=minimal; then
    echo -e "${GREEN}✅ Infrastructure tests passed${NC}"
else
    echo -e "${RED}❌ Infrastructure tests failed${NC}"
    exit 1
fi
cd ../..
echo ""

echo -e "${YELLOW}🧪 Running API Integration Tests...${NC}"
cd tests/CloudStorage.API.Tests
if dotnet test --configuration Release --verbosity=minimal; then
    echo -e "${GREEN}✅ API integration tests passed${NC}"
else
    echo -e "${RED}❌ API integration tests failed${NC}"
    exit 1
fi
cd ../..
echo ""

# Cleanup
echo -e "${YELLOW}🧹 Cleaning up...${NC}"
docker-compose -f docker-compose.test.yml down -v 2>/dev/null || true

echo -e "${GREEN}✅ All backend tests passed!${NC}"
