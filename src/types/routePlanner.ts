export interface CargoItem {
  itemName: string;
  quantity: number;
}

export interface RouteStop {
  id: string;
  stationId: number;
  stationName: string;
  pickupSelections: Map<string, boolean>;
  availablePickups: CargoItem[];
  dropoffs: CargoItem[];
  inventoryAfter: CargoItem[];
  currentSCU: number;
}

export interface RoutePlannerState {
  startingLocation: string;
  startingLocationId: number | null;
  cargoSpace: number;
  routeStops: RouteStop[];
}

