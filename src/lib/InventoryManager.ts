export interface CargoItem {
  item: string;
  quantity: number;
  scu: number;
}

export interface InventoryItem {
  quantity: number; // SCU amount
  scu: number; // per-unit SCU (always 1 after refactor)
}

export interface SCUUsage {
  current: number;
  total: number;
  pickup: CargoItem[];
  beforePickup: number;
  beforeStop: number;
  inventoryAtStop: Map<string, InventoryItem>;
}

export class InventoryManager {
  private inventory: Map<string, InventoryItem> = new Map();
  private cargoSelections: Map<string, {
    pickup: Map<string, boolean>;
  }> = new Map();

  constructor(initialInventory?: Map<string, InventoryItem>) {
    if (initialInventory) {
      this.inventory = new Map(initialInventory);
    }
  }

  // Get current total SCU usage
  getCurrentShipSCU(): number {
    let totalSCU = 0;
    this.inventory.forEach((itemData) => {
      totalSCU += itemData.scu * itemData.quantity;
    });
    return totalSCU;
  }

  // Get cargo selection for a location
  getCargoSelection(location: string, getCargoForLocation: (location: string) => { pickup: CargoItem[] }) {
    if (!this.cargoSelections.has(location)) {
      // Default: select all pickup
      const cargo = getCargoForLocation(location);
      const pickupSelections = new Map<string, boolean>();
      
      cargo.pickup.forEach(item => {
        pickupSelections.set(item.item, true);
      });
      
      this.cargoSelections.set(location, {
        pickup: pickupSelections
      });
      
      return { pickup: pickupSelections };
    }
    return this.cargoSelections.get(location)!;
  }

  // Toggle cargo selection
  toggleCargoSelection(location: string, item: string, type: 'pickup') {
    const locationSelections = this.cargoSelections.get(location) || {
      pickup: new Map<string, boolean>()
    };
    
    const currentValue = locationSelections[type].get(item) || false;
    locationSelections[type].set(item, !currentValue);
    
    this.cargoSelections.set(location, locationSelections);
  }

  // Calculate SCU usage for route stops
  calculateSCUUsage(
    routeStops: string[],
    cargoSpace: number,
    getCargoForLocation: (location: string) => { pickup: CargoItem[] }
  ): SCUUsage[] {
    let currentSCU = 0;
    const scuUsage: SCUUsage[] = [];
    
    // Start with initial ship inventory
    let workingInventory = new Map(this.inventory);
    
    // Calculate initial SCU from ship inventory
    workingInventory.forEach((itemData) => {
      currentSCU += itemData.scu * itemData.quantity;
    });
    
    // Process each route stop
    routeStops.forEach((stop, index) => {
      if (stop.trim()) {
        const cargo = getCargoForLocation(stop);
        
        // Record SCU usage BEFORE any operations
        const scuBeforeStop = currentSCU;
        
        // Get cargo selections for this location
        const selections = this.getCargoSelection(stop, getCargoForLocation);
        
        // Pick up cargo (if selected)
        const pickupItems: CargoItem[] = [];
        cargo.pickup.forEach(item => {
          const isSelected = selections.pickup.get(item.item) || false;
          
          if (isSelected) {
            pickupItems.push({ ...item });
            
            // Update inventory (store remaining SCU in quantity; per-unit SCU set to 1)
            const currentQuantity = workingInventory.get(item.item)?.quantity || 0;
            workingInventory.set(item.item, {
              quantity: currentQuantity + item.scu,
              scu: 1
            });
            
            // Update SCU
            currentSCU += item.scu;
          }
        });
        
        // Record SCU after pickup
        const scuAfterPickup = currentSCU;
        
        // Record usage for this stop
        scuUsage.push({
          current: scuAfterPickup,
          total: cargoSpace,
          pickup: pickupItems,
          beforePickup: scuAfterPickup,
          beforeStop: scuBeforeStop,
          inventoryAtStop: new Map(workingInventory)
        });
      }
    });
    
    return scuUsage;
  }

  // Get inventory map
  getInventory(): Map<string, InventoryItem> {
    return new Map(this.inventory);
  }

  // Set inventory
  setInventory(inventory: Map<string, InventoryItem>) {
    this.inventory = new Map(inventory);
  }

  // Get cargo selections
  getCargoSelections(): Map<string, {
    pickup: Map<string, boolean>;
  }> {
    return new Map(this.cargoSelections);
  }

  // Set cargo selections
  setCargoSelections(selections: Map<string, {
    pickup: Map<string, boolean>;
  }>) {
    this.cargoSelections = new Map(selections);
  }
}
