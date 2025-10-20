// Test setup file
// This file runs before each test file

import { beforeEach, afterEach, vi } from 'vitest';

// Mock console methods to avoid cluttering test output
beforeEach(() => {
  // Suppress console.log during tests unless explicitly testing logging
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  // Restore console after each test
  vi.restoreAllMocks();
});

// Global test utilities
global.testUtils = {
  createMockContract: (overrides = {}) => ({
    id: 'test-contract',
    recordId: 'test-record',
    item: 'Test Item',
    source: 'Test Source',
    destination: 'Test Destination',
    quantity: 10,
    reward: 50000,
    timestamp: '2024-01-01',
    status: 'pending',
    ...overrides
  }),
  
  createMockLocation: (overrides = {}) => ({
    item_id: 'test-location',
    System: 'Test System',
    ObjectContainer: 'Test Location',
    InternalName: 'test-location',
    Type: 'Station',
    XCoord: 0,
    YCoord: 0,
    ZCoord: 0,
    RotationSpeedX: 0,
    RotationSpeedY: 0,
    RotationSpeedZ: 0,
    RotationAdjustmentX: 0,
    RotationAdjustmentY: 0,
    RotationAdjustmentZ: 0,
    RotQuatW: "0.000000",
    RotQuatX: 0,
    RotQuatY: 0,
    RotQuatZ: 0,
    BodyRadius: 0,
    OrbitalMarkerRadius: 0,
    GRIDRadius: 0,
    Comment: "Test location",
    Submitted: "",
    ...overrides
  })
};
