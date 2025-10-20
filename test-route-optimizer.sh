#!/bin/bash

# Test runner script for Route Optimization Service
echo "🧪 Running Route Optimization Service Tests..."
echo "=============================================="

# Run the tests with coverage
npm run test -- src/lib/__tests__/routeOptimizationService.test.ts --coverage

echo ""
echo "✅ Tests completed!"
echo ""
echo "📊 Test Coverage Summary:"
echo "- Contract Selection: Tests cargo capacity limits and reward prioritization"
echo "- Pickup-Before-Delivery: Ensures proper constraint enforcement"
echo "- Cargo Management: Validates capacity tracking throughout routes"
echo "- Distance Optimization: Tests nearest-neighbor algorithm"
echo "- Min Stops Optimization: Tests location grouping approach"
echo "- Edge Cases: Handles empty lists, invalid locations, zero capacity"
echo "- Route Statistics: Validates reward calculation and cargo utilization"
echo "- Console Logging: Ensures proper debug output"
