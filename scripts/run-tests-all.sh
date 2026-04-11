#!/bin/bash
set -e

# CloudStorage Complete Test Suite Runner
# Runs tests against real backend including all unit, integration, and E2E tests
# Usage: ./scripts/run-tests-all.sh

echo "🧪 CloudStorage Complete Test Suite"
echo "===================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Starting test infrastructure...${NC}"

# Start test environment
docker-compose -f docker-compose.test.yml down -v 2>/dev/null || true
docker-compose -f docker-compose.test.yml up -d

# Wait for services to be healthy  
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if curl -s -f http://localhost:5010/api/health > /dev/null; then
        echo -e "${GREEN}✅ Services are healthy${NC}"
        break
    fi
    attempt=$((attempt + 1))
    echo "  Attempt $attempt/$max_attempts..."
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo -e "${RED}❌ Services failed to start${NC}"
    docker-compose -f docker-compose.test.yml logs
    exit 1
fi

echo ""

# Run backend tests
echo -e "${YELLOW}🧪 Running Backend Tests...${NC}"
cd "tests/CloudStorage.Domain.Tests"
if dotnet test --configuration Release --logger "console;verbosity=minimal"; then
    echo -e "${GREEN}✅ Domain tests passed${NC}"
else
    echo -e "${RED}❌ Domain tests failed${NC}"
    exit 1
fi
cd ../..

cd "tests/CloudStorage.Application.Tests"
if dotnet test --configuration Release --logger "console;verbosity=minimal"; then
    echo -e "${GREEN}✅ Application tests passed${NC}"
else
    echo -e "${RED}❌ Application tests failed${NC}"
    exit 1
fi
cd ../..

cd "tests/CloudStorage.Infrastructure.Tests"
if dotnet test --configuration Release --logger "console;verbosity=minimal"; then
    echo -e "${GREEN}✅ Infrastructure tests passed${NC}"
else
    echo -e "${RED}❌ Infrastructure tests failed${NC}"
    exit 1
fi
cd ../..

cd "tests/CloudStorage.API.Tests"
if dotnet test --configuration Release --logger "console;verbosity=minimal"; then
    echo -e "${GREEN}✅ API integration tests passed${NC}"
else
    echo -e "${RED}❌ API integration tests failed${NC}"
    exit 1
fi
cd ../..

echo ""

# Run frontend unit tests
echo -e "${YELLOW}🧪 Running Frontend Unit Tests...${NC}"
cd "CloudStorage.Client"
if npm run test:ci; then
    echo -e "${GREEN}✅ Frontend unit tests passed${NC}"
else
    echo -e "${RED}❌ Frontend unit tests failed${NC}"
    exit 1
fi

# Run E2E tests
echo -e "${YELLOW}🧪 Running End-to-End Tests...${NC}"
echo "  Running Admin persona tests..."
if TEST_MODE=real npm run e2e -- "e2e/personas/admin/**/*.spec.ts"; then
    echo -e "${GREEN}  ✅ Admin tests passed${NC}"
else
    echo -e "${RED}  ⚠️  Admin tests had failures${NC}"
fi

echo "  Running Regular User persona tests..."
if TEST_MODE=real npm run e2e -- "e2e/personas/regularUser/**/*.spec.ts"; then
    echo -e "${GREEN}  ✅ Regular User tests passed${NC}"
else
    echo -e "${RED}  ⚠️  Regular User tests had failures${NC}"
fi

echo "  Running Guest persona tests..."
if TEST_MODE=real npm run e2e -- "e2e/personas/guest/**/*.spec.ts"; then
    echo -e "${GREEN}  ✅ Guest tests passed${NC}"
else
    echo -e "${RED}  ⚠️  Guest tests had failures${NC}"
fi

echo "  Running Resilience tests..."
if TEST_MODE=real npm run e2e -- "e2e/personas/resilience/**/*.spec.ts"; then
    echo -e "${GREEN}  ✅ Resilience tests passed${NC}"
else
    echo -e "${RED}  ⚠️  Resilience tests had failures${NC}"
fi

echo ""
echo -e "${GREEN}✅ All tests completed!${NC}"
echo ""

# Cleanup
echo -e "${YELLOW}🧹 Cleaning up test infrastructure...${NC}"
docker-compose -f docker-compose.test.yml down -v

echo -e "${GREEN}✅ Test suite completed successfully!${NC}"
