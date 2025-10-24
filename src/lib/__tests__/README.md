# Route Optimization Service Tests

This test suite provides comprehensive coverage for the `RouteOptimizationService` class, ensuring that both distance and minimum stops optimization algorithms work correctly.

## Test Structure

### 📋 Test Categories

1. **Contract Selection** - Tests cargo capacity limits and reward prioritization
2. **Pickup-Before-Delivery Constraint** - Ensures proper constraint enforcement
3. **Cargo Capacity Management** - Validates capacity tracking throughout routes
4. **Distance Optimization** - Tests nearest-neighbor algorithm
5. **Minimum Stops Optimization** - Tests location grouping approach
6. **Edge Cases** - Handles empty lists, invalid locations, zero capacity
7. **Route Statistics** - Validates reward calculation and cargo utilization

### 🧪 Test Cases

#### Contract Selection Tests
- ✅ Selects contracts that fit within cargo capacity
- ✅ Prioritizes higher reward contracts when cargo is limited
- ✅ Returns null when no contracts fit in cargo capacity

#### Pickup-Before-Delivery Constraint Tests
- ✅ Ensures pickup happens before delivery for each contract
- ✅ Handles multiple contracts with proper pickup-delivery ordering

#### Cargo Capacity Management Tests
- ✅ Never exceeds maximum cargo capacity
- ✅ Correctly tracks cargo load throughout the route

#### Distance Optimization Tests
- ✅ Generates routes optimized for minimum distance
- ✅ Calculates cumulative distance correctly

#### Minimum Stops Optimization Tests
- ✅ Groups operations by location to minimize stops

#### Edge Case Tests
- ✅ Handles empty contract list
- ✅ Handles contracts with invalid locations
- ✅ Handles zero cargo capacity
- ✅ Handles contracts with zero quantity

#### Route Statistics Tests
- ✅ Calculates total reward correctly
- ✅ Calculates cargo utilization correctly
- ✅ Includes start action in route


## Running Tests

## Mock Data

The tests use comprehensive mock data including:

- **Mock Locations**: Starting location, pickup location, delivery location
- **Mock Contracts**: Various contract configurations for testing
- **Mock ContainerData**: Complete location coordinate data
- **Mock LocationData**: Additional location data for comprehensive testing

## Test Utilities

The test suite includes utility functions in `setup.ts`:

- `createMockContract()` - Creates test contracts with overrides
- `createMockLocation()` - Creates test locations with overrides
- Console mocking for clean test output

## Key Test Scenarios

### 1. Basic Route Generation
Tests that the service can generate valid routes with proper pickup-delivery ordering.

### 2. Cargo Capacity Enforcement
Ensures the algorithm never exceeds cargo limits and properly tracks cargo throughout the route.

### 3. Reward Prioritization
Verifies that higher reward contracts are selected when cargo capacity is limited.

### 4. Distance vs Min Stops Optimization
Tests both optimization strategies to ensure they produce different but valid results.

### 5. Edge Case Handling
Comprehensive testing of boundary conditions and error scenarios.

## Coverage Goals

- **Function Coverage**: 100% of service methods
- **Branch Coverage**: All conditional paths tested
- **Line Coverage**: All executable lines covered
- **Edge Case Coverage**: Comprehensive boundary testing

## Debugging Tests

If tests fail, check:

1. **Mock Data**: Ensure mock locations match contract source/destination names
2. **Route Structure**: Verify route steps are in correct order
3. **Cargo Tracking**: Ensure cargo never exceeds capacity

## Contributing

When adding new tests:

1. Follow the existing test structure
2. Use descriptive test names
3. Include both positive and negative test cases
4. Mock external dependencies properly
5. Test edge cases and error conditions
