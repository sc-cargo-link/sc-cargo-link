import { describe, it, expect, beforeEach, vi } from 'vitest';
import { routeOptimizationService, FlattenedContract, OptimizationType } from '../routeOptimizationService';
import { ContainerData } from '@/data/ContainerData';

// Mock data for testing
const mockStartingLocation: ContainerData = {
  item_id: 'test-start',
  System: 'Test System',
  ObjectContainer: 'Test Starting Location',
  InternalName: 'test-start',
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
  Comment: "Test starting location",
  Submitted: ""
};

const mockPickupLocation: ContainerData = {
  item_id: 'test-pickup',
  System: 'Test System',
  ObjectContainer: 'Test Pickup Location',
  InternalName: 'test-pickup',
  Type: 'Station',
  XCoord: 1000,
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
  Comment: "Test pickup location",
  Submitted: ""
};

const mockDeliveryLocation: ContainerData = {
  item_id: 'test-delivery',
  System: 'Test System',
  ObjectContainer: 'Test Delivery Location',
  InternalName: 'test-delivery',
  Type: 'Station',
  XCoord: 2000,
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
  Comment: "Test delivery location",
  Submitted: ""
};

const mockContracts: FlattenedContract[] = [
  {
    id: 'contract-1',
    recordId: 'record-1',
    item: 'Test Item 1',
    source: 'Test Pickup Location',
    destination: 'Test Delivery Location',
    quantity: 10,
    reward: 50000,
    timestamp: '2024-01-01',
    status: 'pending'
  },
  {
    id: 'contract-2',
    recordId: 'record-2',
    item: 'Test Item 2',
    source: 'Test Pickup Location',
    destination: 'Test Delivery Location',
    quantity: 15,
    reward: 75000,
    timestamp: '2024-01-01',
    status: 'pending'
  }
];

// Mock the data modules
vi.mock('@/data/ContainerData', () => ({
  data: [mockStartingLocation, mockPickupLocation, mockDeliveryLocation]
}));

vi.mock('@/data/LocationData', () => ({
  data: []
}));

describe('RouteOptimizationService', () => {
  beforeEach(() => {
    // Clear console logs for cleaner test output
    vi.clearAllMocks();
  });

  describe('Contract Selection', () => {
    it('should select contracts that fit within cargo capacity', () => {
      const contracts = [
        { ...mockContracts[0], quantity: 10, reward: 50000 },
        { ...mockContracts[1], quantity: 15, reward: 75000 },
        { ...mockContracts[0], id: 'contract-3', quantity: 20, reward: 100000 }
      ];

      const result = routeOptimizationService.generateOptimizedRoute(
        contracts,
        mockStartingLocation,
        30, // maxSCU
        'distance'
      );

      expect(result).not.toBeNull();
      expect(result!.route.length).toBeGreaterThan(1);
    });

    it('should prioritize higher reward contracts when cargo is limited', () => {
      const contracts = [
        { ...mockContracts[0], quantity: 20, reward: 50000 },
        { ...mockContracts[1], quantity: 20, reward: 75000 }
      ];

      const result = routeOptimizationService.generateOptimizedRoute(
        contracts,
        mockStartingLocation,
        25, // maxSCU - can only fit one contract
        'distance'
      );

      expect(result).not.toBeNull();
      // Should select the higher reward contract (75000)
      const pickupSteps = result!.route.filter(step => step.action === 'pickup');
      expect(pickupSteps).toHaveLength(1);
      expect(pickupSteps[0].contract!.reward).toBe(75000);
    });

    it('should return null when no contracts fit in cargo capacity', () => {
      const contracts = [
        { ...mockContracts[0], quantity: 50 }
      ];

      const result = routeOptimizationService.generateOptimizedRoute(
        contracts,
        mockStartingLocation,
        30, // maxSCU - too small
        'distance'
      );

      expect(result).toBeNull();
    });
  });

  describe('Pickup-Before-Delivery Constraint', () => {
    it('should ensure pickup happens before delivery for each contract', () => {
      const result = routeOptimizationService.generateOptimizedRoute(
        [mockContracts[0]],
        mockStartingLocation,
        50,
        'distance'
      );

      expect(result).not.toBeNull();
      
      const route = result!.route;
      const pickupIndex = route.findIndex(step => step.action === 'pickup');
      const deliveryIndex = route.findIndex(step => step.action === 'deliver');

      expect(pickupIndex).toBeGreaterThan(-1);
      expect(deliveryIndex).toBeGreaterThan(-1);
      expect(pickupIndex).toBeLessThan(deliveryIndex);
    });

    it('should handle multiple contracts with proper pickup-delivery ordering', () => {
      const contracts = [
        { ...mockContracts[0], id: 'contract-1' },
        { ...mockContracts[1], id: 'contract-2' }
      ];

      const result = routeOptimizationService.generateOptimizedRoute(
        contracts,
        mockStartingLocation,
        50,
        'distance'
      );

      expect(result).not.toBeNull();
      
      const route = result!.route;
      const pickups = route.filter(step => step.action === 'pickup');
      const deliveries = route.filter(step => step.action === 'deliver');

      expect(pickups).toHaveLength(2);
      expect(deliveries).toHaveLength(2);

      // Verify each delivery has a corresponding pickup
      deliveries.forEach(delivery => {
        const contractId = delivery.contract!.id;
        const pickup = pickups.find(p => p.contract!.id === contractId);
        expect(pickup).toBeDefined();
      });
    });
  });

  describe('Cargo Capacity Management', () => {
    it('should never exceed maximum cargo capacity', () => {
      const contracts = [
        { ...mockContracts[0], quantity: 10 },
        { ...mockContracts[1], quantity: 15 }
      ];

      const result = routeOptimizationService.generateOptimizedRoute(
        contracts,
        mockStartingLocation,
        30,
        'distance'
      );

      expect(result).not.toBeNull();
      
      const route = result!.route;
      route.forEach(step => {
        expect(step.cargoOnBoard).toBeLessThanOrEqual(30);
      });
    });

    it('should correctly track cargo load throughout the route', () => {
      const contracts = [
        { ...mockContracts[0], quantity: 10 }
      ];

      const result = routeOptimizationService.generateOptimizedRoute(
        contracts,
        mockStartingLocation,
        50,
        'distance'
      );

      expect(result).not.toBeNull();
      
      const route = result!.route;
      let expectedCargo = 0;

      route.forEach((step, index) => {
        if (step.action === 'pickup') {
          expectedCargo += step.contract!.quantity;
        } else if (step.action === 'deliver') {
          expectedCargo -= step.contract!.quantity;
        }

        expect(step.cargoOnBoard).toBe(expectedCargo);
      });
    });
  });

  describe('Distance Optimization', () => {
    it('should generate routes optimized for minimum distance', () => {
      const contracts = [
        { ...mockContracts[0], quantity: 10 }
      ];

      const result = routeOptimizationService.generateOptimizedRoute(
        contracts,
        mockStartingLocation,
        50,
        'distance'
      );

      expect(result).not.toBeNull();
      expect(result!.totalDistance).toBeGreaterThan(0);
      expect(result!.totalFuel).toBeGreaterThan(0);
      expect(result!.totalTime).toBeGreaterThan(0);
    });

    it('should calculate cumulative distance correctly', () => {
      const contracts = [
        { ...mockContracts[0], quantity: 10 }
      ];

      const result = routeOptimizationService.generateOptimizedRoute(
        contracts,
        mockStartingLocation,
        50,
        'distance'
      );

      expect(result).not.toBeNull();
      
      const route = result!.route;
      expect(route[0].cumulativeDistance).toBe(0);
      
      for (let i = 1; i < route.length; i++) {
        expect(route[i].cumulativeDistance).toBeGreaterThanOrEqual(route[i-1].cumulativeDistance);
      }
    });
  });

  describe('Minimum Stops Optimization', () => {
    it('should group operations by location to minimize stops', () => {
      const contracts = [
        { ...mockContracts[0], id: 'contract-1', source: 'Location A', destination: 'Location B' },
        { ...mockContracts[1], id: 'contract-2', source: 'Location A', destination: 'Location C' }
      ];

      // Mock additional locations
      const mockLocationA: ContainerData = {
        ...mockPickupLocation,
        ObjectContainer: 'Location A',
        InternalName: 'location-a',
        XCoord: 1000
      };
      const mockLocationB: ContainerData = {
        ...mockDeliveryLocation,
        ObjectContainer: 'Location B',
        InternalName: 'location-b',
        XCoord: 2000
      };
      const mockLocationC: ContainerData = {
        ...mockDeliveryLocation,
        ObjectContainer: 'Location C',
        InternalName: 'location-c',
        XCoord: 3000
      };

      // Mock the data to include our test locations
      vi.doMock('@/data/ContainerData', () => ({
        data: [mockStartingLocation, mockLocationA, mockLocationB, mockLocationC]
      }));

      const result = routeOptimizationService.generateOptimizedRoute(
        contracts,
        mockStartingLocation,
        50,
        'min-stops'
      );

      expect(result).not.toBeNull();
      
      const route = result!.route;
      const uniqueLocations = new Set(route.map(step => step.location.ObjectContainer));
      
      // Should visit fewer unique locations than individual contracts
      expect(uniqueLocations.size).toBeLessThanOrEqual(contracts.length + 1); // +1 for starting location
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty contract list', () => {
      const result = routeOptimizationService.generateOptimizedRoute(
        [],
        mockStartingLocation,
        50,
        'distance'
      );

      expect(result).toBeNull();
    });

    it('should handle contracts with invalid locations', () => {
      const contracts = [
        { ...mockContracts[0], source: 'Non-existent Location', destination: 'Another Non-existent Location' }
      ];

      const result = routeOptimizationService.generateOptimizedRoute(
        contracts,
        mockStartingLocation,
        50,
        'distance'
      );

      expect(result).toBeNull();
    });

    it('should handle zero cargo capacity', () => {
      const result = routeOptimizationService.generateOptimizedRoute(
        mockContracts,
        mockStartingLocation,
        0,
        'distance'
      );

      expect(result).toBeNull();
    });

    it('should handle contracts with zero quantity', () => {
      const contracts = [
        { ...mockContracts[0], quantity: 0 }
      ];

      const result = routeOptimizationService.generateOptimizedRoute(
        contracts,
        mockStartingLocation,
        50,
        'distance'
      );

      expect(result).not.toBeNull();
      expect(result!.route.length).toBeGreaterThan(1);
    });
  });

  describe('Route Statistics', () => {
    it('should calculate total reward correctly', () => {
      const contracts = [
        { ...mockContracts[0], reward: 50000 },
        { ...mockContracts[1], reward: 75000 }
      ];

      const result = routeOptimizationService.generateOptimizedRoute(
        contracts,
        mockStartingLocation,
        50,
        'distance'
      );

      expect(result).not.toBeNull();
      expect(result!.totalReward).toBe(125000);
    });

    it('should calculate cargo utilization correctly', () => {
      const contracts = [
        { ...mockContracts[0], quantity: 20 },
        { ...mockContracts[1], quantity: 30 }
      ];

      const result = routeOptimizationService.generateOptimizedRoute(
        contracts,
        mockStartingLocation,
        100, // maxSCU
        'distance'
      );

      expect(result).not.toBeNull();
      expect(result!.cargoUtilization).toBe(50); // (20+30)/100 * 100 = 50%
    });

    it('should include start action in route', () => {
      const result = routeOptimizationService.generateOptimizedRoute(
        [mockContracts[0]],
        mockStartingLocation,
        50,
        'distance'
      );

      expect(result).not.toBeNull();
      expect(result!.route[0].action).toBe('start');
      expect(result!.route[0].cargoOnBoard).toBe(0);
    });
  });

  describe('Console Logging', () => {
    it('should log pickup and delivery actions', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const result = routeOptimizationService.generateOptimizedRoute(
        [mockContracts[0]],
        mockStartingLocation,
        50,
        'distance'
      );

      expect(result).not.toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('PICKUP:'),
        expect.any(String),
        expect.any(String),
        expect.any(Number)
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('DELIVER:'),
        expect.any(String),
        expect.any(String),
        expect.any(Number)
      );

      consoleSpy.mockRestore();
    });
  });
});
