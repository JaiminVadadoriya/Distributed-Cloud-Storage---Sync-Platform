#!/bin/bash
set -e

# E2E Tests Only Runner
# Runs Playwright E2E tests against real backend
# Usage: ./scripts/run-e2e-tests.sh [persona] [mode]
# Example: ./scripts/run-e2e-tests.sh admin real
#          ./scripts/run-e2e-tests.sh all mock

PERSONA=${1:-all}
MODE=${2:-real}

echo "🎭 E2E Test Runner - Persona: $PERSONA, Mode: $MODE"
echo "===================================================="
echo ""

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

cd CloudStorage.Client

# Handle different persona selections
case $PERSONA in
  admin)
    echo -e "${YELLOW}Running Admin persona tests...${NC}"
    TEST_MODE=$MODE npm run e2e -- "e2e/personas/admin/**/*.spec.ts"
    ;;
  
  regularUser)
    echo -e "${YELLOW}Running Regular User persona tests...${NC}"
    TEST_MODE=$MODE npm run e2e -- "e2e/personas/regularUser/**/*.spec.ts"
    ;;
  
  guest)
    echo -e "${YELLOW}Running Guest persona tests...${NC}"
    TEST_MODE=$MODE npm run e2e -- "e2e/personas/guest/**/*.spec.ts"
    ;;
  
  resilience)
    echo -e "${YELLOW}Running Resilience tests...${NC}"
    TEST_MODE=$MODE npm run e2e -- "e2e/personas/resilience/**/*.spec.ts"
    ;;
  
  performance)
    echo -e "${YELLOW}Running Performance tests...${NC}"
    TEST_MODE=performance npm run e2e -- "e2e/personas/performance/**/*.spec.ts"
    ;;
  
  accessibility)
    echo -e "${YELLOW}Running Accessibility tests...${NC}"
    TEST_MODE=a11y npm run e2e -- "e2e/personas/accessibility/**/*.spec.ts"
    ;;
  
  all)
    echo -e "${YELLOW}Running all E2E tests...${NC}"
    TEST_MODE=$MODE npm run e2e
    ;;
  
  *)
    echo -e "${RED}Unknown persona: $PERSONA${NC}"
    echo "Valid options: admin, regularUser, guest, resilience, performance, accessibility, all"
    exit 1
    ;;
esac

echo ""
echo -e "${GREEN}✅ E2E tests completed!${NC}"
echo ""
echo "📊 View detailed report:"
echo "   npx playwright show-report"
