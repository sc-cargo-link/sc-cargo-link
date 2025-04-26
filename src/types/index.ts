
export interface Contract {
  id: string;
  title: string;
  description: string;
  startLocation: string;
  endLocation: string;
  payment: number;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  deadline?: Date; 
  cargo: CargoItem[];
  createDate: Date;
}

export interface CargoItem {
  id: string;
  name: string;
  quantity: number;
  unitValue: number;
  type: string;
  size: number; // Size in SCU (Standard Cargo Units)
  fragile: boolean;
  illegal: boolean;
}

export interface Route {
  id: string;
  name: string;
  startLocation: string;
  waypoints: string[];
  endLocation: string;
  distance: number; // Distance in millions of kilometers
  estimatedTime: number; // Time in minutes
  fuelConsumption: number; // Fuel consumption in units
  dangerLevel: 'low' | 'medium' | 'high';
  contracts: string[]; // IDs of contracts associated with this route
}

export interface Ship {
  id: string;
  name: string;
  model: string;
  cargoCapacity: number; // Capacity in SCU
  currentCargo: number; // Current cargo in SCU
  loadedCargo: CargoItem[];
}
