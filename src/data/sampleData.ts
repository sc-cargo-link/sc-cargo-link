
import { Contract, Route, Ship, CargoItem } from '../types';

// Sample cargo items
export const sampleCargoItems: CargoItem[] = [
  {
    id: 'cargo-1',
    name: 'Agricultural Supplies',
    quantity: 50,
    unitValue: 120,
    type: 'Agricultural',
    size: 1,
    fragile: false,
    illegal: false,
  },
  {
    id: 'cargo-2',
    name: 'Medical Supplies',
    quantity: 30,
    unitValue: 350,
    type: 'Medical',
    size: 1,
    fragile: true,
    illegal: false,
  },
  {
    id: 'cargo-3',
    name: 'Titanium',
    quantity: 100,
    unitValue: 80,
    type: 'Metal',
    size: 0.5,
    fragile: false,
    illegal: false,
  },
  {
    id: 'cargo-4',
    name: 'Widow Jump',
    quantity: 10,
    unitValue: 800,
    type: 'Narcotics',
    size: 0.2,
    fragile: false,
    illegal: true,
  },
  {
    id: 'cargo-5',
    name: 'Laranite',
    quantity: 70,
    unitValue: 280,
    type: 'Mineral',
    size: 0.8,
    fragile: false,
    illegal: false,
  },
];

// Sample contracts
export const sampleContracts: Contract[] = [
  {
    id: 'contract-1',
    title: 'Medical Supply Run',
    description: 'Transport medical supplies from Port Olisar to Area18',
    startLocation: 'Port Olisar',
    endLocation: 'Area18, ArcCorp',
    payment: 12500,
    status: 'pending',
    deadline: new Date(Date.now() + 86400000), // 24 hours from now
    cargo: [sampleCargoItems[1]], // Medical Supplies
    createDate: new Date(),
  },
  {
    id: 'contract-2',
    title: 'Mining Material Transport',
    description: 'Transport Titanium and Laranite from Daymar to Lorville',
    startLocation: 'Kudre Ore, Daymar',
    endLocation: 'Lorville, Hurston',
    payment: 18000,
    status: 'in-progress',
    deadline: new Date(Date.now() + 172800000), // 48 hours from now
    cargo: [sampleCargoItems[2], sampleCargoItems[4]], // Titanium and Laranite
    createDate: new Date(Date.now() - 86400000), // Created 24 hours ago
  },
  {
    id: 'contract-3',
    title: 'Agricultural Delivery',
    description: 'Transport agricultural supplies from Hurston to MicroTech',
    startLocation: 'Lorville, Hurston',
    endLocation: 'New Babbage, MicroTech',
    payment: 15000,
    status: 'pending',
    cargo: [sampleCargoItems[0]], // Agricultural Supplies
    createDate: new Date(Date.now() - 172800000), // Created 48 hours ago
  },
  {
    id: 'contract-4',
    title: 'Covert Delivery',
    description: 'Transport sensitive cargo. No questions asked.',
    startLocation: 'Grim HEX',
    endLocation: 'Levski, Delamar',
    payment: 32000,
    status: 'pending',
    cargo: [sampleCargoItems[3]], // Widow Jump
    createDate: new Date(Date.now() - 259200000), // Created 72 hours ago
  },
];

// Sample routes
export const sampleRoutes: Route[] = [
  {
    id: 'route-1',
    name: 'Crusader to ArcCorp',
    startLocation: 'Port Olisar',
    waypoints: ['CRU-L1'],
    endLocation: 'Area18, ArcCorp',
    distance: 41.2,
    estimatedTime: 45,
    fuelConsumption: 120,
    dangerLevel: 'low',
    contracts: ['contract-1'],
  },
  {
    id: 'route-2',
    name: 'Daymar Mining Run',
    startLocation: 'Kudre Ore, Daymar',
    waypoints: ['CRU-L1', 'HUR-L1'],
    endLocation: 'Lorville, Hurston',
    distance: 64.8,
    estimatedTime: 75,
    fuelConsumption: 185,
    dangerLevel: 'medium',
    contracts: ['contract-2'],
  },
  {
    id: 'route-3',
    name: 'Cross-System Haul',
    startLocation: 'Lorville, Hurston',
    waypoints: ['HUR-L1', 'CRU-L1', 'MIC-L1'],
    endLocation: 'New Babbage, MicroTech',
    distance: 89.5,
    estimatedTime: 95,
    fuelConsumption: 230,
    dangerLevel: 'medium',
    contracts: ['contract-3'],
  },
  {
    id: 'route-4',
    name: 'Smugglers Route',
    startLocation: 'Grim HEX',
    waypoints: ['Security Post Kareah'],
    endLocation: 'Levski, Delamar',
    distance: 38.7,
    estimatedTime: 55,
    fuelConsumption: 110,
    dangerLevel: 'high',
    contracts: ['contract-4'],
  },
];

// Sample ships
export const sampleShips: Ship[] = [
  {
    id: 'ship-1',
    name: 'Star Runner',
    model: 'Mercury Star Runner',
    cargoCapacity: 114,
    currentCargo: 30,
    loadedCargo: [sampleCargoItems[1]], // Medical Supplies
  },
  {
    id: 'ship-2',
    name: 'Haulin\' Beast',
    model: 'MISC Freelancer MAX',
    cargoCapacity: 120,
    currentCargo: 85,
    loadedCargo: [sampleCargoItems[2], sampleCargoItems[4]], // Titanium and Laranite
  },
  {
    id: 'ship-3',
    name: 'Trading Post',
    model: 'MISC Hull C',
    cargoCapacity: 4608,
    currentCargo: 50,
    loadedCargo: [sampleCargoItems[0]], // Agricultural Supplies
  },
  {
    id: 'ship-4',
    name: 'Shadow',
    model: 'Drake Caterpillar',
    cargoCapacity: 576,
    currentCargo: 2,
    loadedCargo: [sampleCargoItems[3]], // Widow Jump
  },
];
