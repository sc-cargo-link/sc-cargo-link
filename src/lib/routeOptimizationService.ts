import { data as containerData, ContainerData } from '@/data/ContainerData';
import { data as locationData, LocationData } from '@/data/LocationData';

export type FlattenedContract = {
  id: string;
  recordId: string;
  item: string;
  source: string;
  destination: string;
  quantity: number;
  reward: number;
  timestamp: string;
  status: string;
};

export type OptimizedRoute = {
  route: RouteStep[];
  totalDistance: number;
  totalFuel: number;
  totalTime: number;
  totalReward: number;
  cargoUtilization: number;
};

export type RouteStep = {
  location: ContainerData;
  action: 'start' | 'pickup' | 'deliver';
  contract?: FlattenedContract;
  cargoOnBoard: number;
  cumulativeDistance: number;
};

export type OptimizationType = 'distance' | 'min-stops';

export class RouteOptimizationService {
  private contractLocations = new Map<string, ContainerData>();

  constructor() {
    // Initialize location mappings
    this.initializeLocationMappings();
  }

  private initializeLocationMappings() {
    // Add all ContainerData locations
    containerData.forEach(item => {
      this.contractLocations.set(item.ObjectContainer.toLowerCase(), item);
      this.contractLocations.set(item.InternalName.toLowerCase(), item);
    });

    // Add LocationData locations converted to ContainerData format
    locationData.forEach(item => {
      const containerData: ContainerData = {
        item_id: item.item_id,
        System: item.System,
        ObjectContainer: item.PoiName,
        InternalName: item.PoiName,
        Type: item.Type,
        XCoord: item.XCoord,
        YCoord: item.YCoord,
        ZCoord: item.ZCoord,
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
        Comment: item.Comment || "",
        Submitted: ""
      };
      
      this.contractLocations.set(item.PoiName.toLowerCase(), containerData);
    });
  }

  private findLocationCoordinates(locationName: string): ContainerData | null {
    const normalizedName = locationName.toLowerCase().trim();
    
    // Try exact match first
    let match = this.contractLocations.get(normalizedName);
    
    // If no exact match, try partial match
    if (!match) {
      for (const [key, value] of this.contractLocations.entries()) {
        if (key.includes(normalizedName) || normalizedName.includes(key)) {
          match = value;
          break;
        }
      }
    }
    
    return match || null;
  }

  private calculateDistance(loc1: ContainerData, loc2: ContainerData): number {
    const dx = loc1.XCoord - loc2.XCoord;
    const dy = loc1.YCoord - loc2.YCoord;
    const dz = loc1.ZCoord - loc2.ZCoord;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private selectBestContracts(contracts: FlattenedContract[], maxSCU: number): FlattenedContract[] {
    // Sort by reward (highest first)
    const sorted = [...contracts].sort((a, b) => b.reward - a.reward);
    
    const selected: FlattenedContract[] = [];
    let usedSCU = 0;
    
    for (const contract of sorted) {
      if (usedSCU + contract.quantity <= maxSCU) {
        selected.push(contract);
        usedSCU += contract.quantity;
      }
    }
    
    return selected;
  }

  private generateDistanceOptimizedRoute(
    contracts: FlattenedContract[], 
    startingLocation: ContainerData, 
    maxSCU: number
  ): OptimizedRoute | null {
    if (contracts.length === 0) return null;

    // Find coordinates for all contract locations
    const validContracts: FlattenedContract[] = [];

    for (const contract of contracts) {
      const sourceCoords = this.findLocationCoordinates(contract.source);
      const destCoords = this.findLocationCoordinates(contract.destination);
      
      if (sourceCoords && destCoords) {
        validContracts.push(contract);
      }
    }

    if (validContracts.length === 0) return null;

    // Select best contracts that fit in cargo capacity
    const selectedContracts = this.selectBestContracts(validContracts, maxSCU);
    
    if (selectedContracts.length === 0) return null;

    // State tracking for pickup-before-delivery constraint
    const availablePickups = new Set(selectedContracts.map(c => c.id));
    const pickedUpContracts = new Set<string>();
    const route: RouteStep[] = [];
    let currentLocation = startingLocation;
    let cargoOnBoard = 0;
    let totalDistance = 0;

    // Add starting point
    route.push({
      location: currentLocation,
      action: 'start',
      cargoOnBoard: 0,
      cumulativeDistance: 0
    });

    // Main route generation loop - Distance optimization
    while (availablePickups.size > 0 || pickedUpContracts.size > 0) {
      let bestNext: { contract: FlattenedContract; type: 'pickup' | 'delivery'; distance: number } | null = null;

      // Check all available pickups
      for (const contractId of availablePickups) {
        const contract = selectedContracts.find(c => c.id === contractId)!;
        const sourceCoords = this.findLocationCoordinates(contract.source)!;
        
        // Check if we have space for this pickup
        if (cargoOnBoard + contract.quantity <= maxSCU) {
          const distance = this.calculateDistance(currentLocation, sourceCoords);
          
          if (!bestNext || distance < bestNext.distance) {
            bestNext = { contract, type: 'pickup', distance };
          }
        }
      }

      // Check all available deliveries (only for picked-up contracts)
      for (const contractId of pickedUpContracts) {
        const contract = selectedContracts.find(c => c.id === contractId)!;
        const destCoords = this.findLocationCoordinates(contract.destination)!;
        
        const distance = this.calculateDistance(currentLocation, destCoords);
        
        if (!bestNext || distance < bestNext.distance) {
          bestNext = { contract, type: 'delivery', distance };
        }
      }

      if (!bestNext) break; // No valid moves left

      // Move to the best location
      if (bestNext.type === 'pickup') {
        const sourceCoords = this.findLocationCoordinates(bestNext.contract.source)!;
        currentLocation = sourceCoords;
        cargoOnBoard += bestNext.contract.quantity;
        
        // Move contract from available pickups to picked up contracts
        availablePickups.delete(bestNext.contract.id);
        pickedUpContracts.add(bestNext.contract.id);
        
        route.push({
          location: currentLocation,
          action: 'pickup',
          contract: bestNext.contract,
          cargoOnBoard,
          cumulativeDistance: totalDistance + bestNext.distance
        });
        
        console.log(`PICKUP: ${bestNext.contract.item} at ${currentLocation.ObjectContainer}, cargo: ${cargoOnBoard}`);
      } else {
        const destCoords = this.findLocationCoordinates(bestNext.contract.destination)!;
        currentLocation = destCoords;
        cargoOnBoard -= bestNext.contract.quantity;
        
        // Remove contract from picked up contracts (completed)
        pickedUpContracts.delete(bestNext.contract.id);
        
        route.push({
          location: currentLocation,
          action: 'deliver',
          contract: bestNext.contract,
          cargoOnBoard,
          cumulativeDistance: totalDistance + bestNext.distance
        });
        
        console.log(`DELIVER: ${bestNext.contract.item} at ${currentLocation.ObjectContainer}, cargo: ${cargoOnBoard}`);
      }

      totalDistance += bestNext.distance;
    }

    // Calculate totals
    const totalReward = selectedContracts.reduce((sum, contract) => sum + contract.reward, 0);
    const totalFuel = Math.ceil(totalDistance / 1000000);
    const totalTime = Math.ceil(totalDistance / 5000000);
    const cargoUtilization = (selectedContracts.reduce((sum, contract) => sum + contract.quantity, 0) / maxSCU) * 100;

    return {
      route,
      totalDistance,
      totalFuel,
      totalTime,
      totalReward,
      cargoUtilization
    };
  }

  private generateMinStopsOptimizedRoute(
    contracts: FlattenedContract[], 
    startingLocation: ContainerData, 
    maxSCU: number
  ): OptimizedRoute | null {
    if (contracts.length === 0) return null;

    // Find coordinates for all contract locations
    const validContracts: FlattenedContract[] = [];

    for (const contract of contracts) {
      const sourceCoords = this.findLocationCoordinates(contract.source);
      const destCoords = this.findLocationCoordinates(contract.destination);
      
      if (sourceCoords && destCoords) {
        validContracts.push(contract);
      }
    }

    if (validContracts.length === 0) return null;

    // Select best contracts that fit in cargo capacity
    const selectedContracts = this.selectBestContracts(validContracts, maxSCU);
    
    if (selectedContracts.length === 0) return null;

    // Group contracts by location to minimize stops
    const locationGroups = new Map<string, FlattenedContract[]>();
    
    // Group pickups by source location
    selectedContracts.forEach(contract => {
      const source = contract.source.toLowerCase();
      if (!locationGroups.has(source)) {
        locationGroups.set(source, []);
      }
      locationGroups.get(source)!.push(contract);
    });

    // Group deliveries by destination location
    selectedContracts.forEach(contract => {
      const dest = contract.destination.toLowerCase();
      if (!locationGroups.has(dest)) {
        locationGroups.set(dest, []);
      }
    });

    const route: RouteStep[] = [];
    let currentLocation = startingLocation;
    let cargoOnBoard = 0;
    let totalDistance = 0;
    const completedContracts = new Set<string>();

    // Add starting point
    route.push({
      location: currentLocation,
      action: 'start',
      cargoOnBoard: 0,
      cumulativeDistance: 0
    });

    // Visit each location group to minimize stops
    const sortedLocations = Array.from(locationGroups.keys()).sort((a, b) => {
      const distA = this.calculateDistance(currentLocation, this.findLocationCoordinates(a)!);
      const distB = this.calculateDistance(currentLocation, this.findLocationCoordinates(b)!);
      return distA - distB;
    });

    for (const locationName of sortedLocations) {
      const locationCoords = this.findLocationCoordinates(locationName)!;
      const distance = this.calculateDistance(currentLocation, locationCoords);
      
      currentLocation = locationCoords;
      totalDistance += distance;

      // Process all pickups at this location
      const contractsAtLocation = locationGroups.get(locationName)!;
      const pickupsAtLocation = contractsAtLocation.filter(c => c.source.toLowerCase() === locationName);
      
      for (const contract of pickupsAtLocation) {
        if (cargoOnBoard + contract.quantity <= maxSCU && !completedContracts.has(contract.id)) {
          cargoOnBoard += contract.quantity;
          completedContracts.add(contract.id + '_picked');
          
          route.push({
            location: currentLocation,
            action: 'pickup',
            contract: contract,
            cargoOnBoard,
            cumulativeDistance: totalDistance
          });
          
          console.log(`PICKUP: ${contract.item} at ${currentLocation.ObjectContainer}, cargo: ${cargoOnBoard}`);
        }
      }

      // Process all deliveries at this location
      const deliveriesAtLocation = contractsAtLocation.filter(c => c.destination.toLowerCase() === locationName);
      
      for (const contract of deliveriesAtLocation) {
        if (completedContracts.has(contract.id + '_picked')) {
          cargoOnBoard -= contract.quantity;
          completedContracts.add(contract.id);
          
          route.push({
            location: currentLocation,
            action: 'deliver',
            contract: contract,
            cargoOnBoard,
            cumulativeDistance: totalDistance
          });
          
          console.log(`DELIVER: ${contract.item} at ${currentLocation.ObjectContainer}, cargo: ${cargoOnBoard}`);
        }
      }
    }

    // Calculate totals
    const totalReward = selectedContracts.reduce((sum, contract) => sum + contract.reward, 0);
    const totalFuel = Math.ceil(totalDistance / 1000000);
    const totalTime = Math.ceil(totalDistance / 5000000);
    const cargoUtilization = (selectedContracts.reduce((sum, contract) => sum + contract.quantity, 0) / maxSCU) * 100;

    return {
      route,
      totalDistance,
      totalFuel,
      totalTime,
      totalReward,
      cargoUtilization
    };
  }

  public generateOptimizedRoute(
    contracts: FlattenedContract[], 
    startingLocation: ContainerData, 
    maxSCU: number,
    optimizationType: OptimizationType
  ): OptimizedRoute | null {
    switch (optimizationType) {
      case 'distance':
        return this.generateDistanceOptimizedRoute(contracts, startingLocation, maxSCU);
      case 'min-stops':
        return this.generateMinStopsOptimizedRoute(contracts, startingLocation, maxSCU);
      default:
        return this.generateDistanceOptimizedRoute(contracts, startingLocation, maxSCU);
    }
  }
}

export const routeOptimizationService = new RouteOptimizationService();
