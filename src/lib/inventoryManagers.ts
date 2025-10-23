import { CargoItem } from '@/types/routePlanner';

export class StationInventoryManager {
  private stationInventory: Map<number, Map<string, number>>;

  constructor() {
    this.stationInventory = new Map();
  }

  initializeFromContracts(contracts: Array<{
    id: string;
    source: string;
    sourceEntityId: number | null;
    item: string;
    deliveries: Array<{ location: string; entityId: number | null; quantity: number }>;
  }>) {
    this.stationInventory.clear();

    contracts.forEach(contract => {
      if (contract.sourceEntityId) {
        const totalQuantity = contract.deliveries.reduce((sum, d) => sum + d.quantity, 0);
        this.addItemToStation(contract.sourceEntityId, contract.item, totalQuantity);
      }
    });
  }

  addItemToStation(stationId: number, itemName: string, quantity: number) {
    if (!this.stationInventory.has(stationId)) {
      this.stationInventory.set(stationId, new Map());
    }
    const stationItems = this.stationInventory.get(stationId)!;
    const currentQuantity = stationItems.get(itemName) || 0;
    stationItems.set(itemName, currentQuantity + quantity);
  }

  getAvailableItems(stationId: number): CargoItem[] {
    const stationItems = this.stationInventory.get(stationId);
    if (!stationItems) return [];

    return Array.from(stationItems.entries())
      .filter(([_, quantity]) => quantity > 0)
      .map(([itemName, quantity]) => ({ itemName, quantity }));
  }

  consumePickup(stationId: number, itemName: string, quantity: number): boolean {
    const stationItems = this.stationInventory.get(stationId);
    if (!stationItems) return false;

    const available = stationItems.get(itemName) || 0;
    if (available < quantity) return false;

    stationItems.set(itemName, available - quantity);
    return true;
  }

  addDropoff(stationId: number, itemName: string, quantity: number) {
    this.addItemToStation(stationId, itemName, quantity);
  }

  reset() {
    this.stationInventory.clear();
  }

  clone(): StationInventoryManager {
    const cloned = new StationInventoryManager();
    this.stationInventory.forEach((items, stationId) => {
      const clonedItems = new Map(items);
      cloned.stationInventory.set(stationId, clonedItems);
    });
    return cloned;
  }
}

export class ShipInventoryManager {
  private currentCargo: Map<string, number>;
  private maxCapacity: number;

  constructor(maxCapacity: number = 100) {
    this.currentCargo = new Map();
    this.maxCapacity = maxCapacity;
  }

  setMaxCapacity(capacity: number) {
    this.maxCapacity = capacity;
  }

  getCurrentSCU(): number {
    let total = 0;
    this.currentCargo.forEach(quantity => {
      total += quantity;
    });
    return total;
  }

  getAvailableSCU(): number {
    return this.maxCapacity - this.getCurrentSCU();
  }

  canPickup(itemName: string, quantity: number): boolean {
    return this.getAvailableSCU() >= quantity;
  }

  pickup(itemName: string, quantity: number): boolean {
    if (!this.canPickup(itemName, quantity)) return false;

    const current = this.currentCargo.get(itemName) || 0;
    this.currentCargo.set(itemName, current + quantity);
    return true;
  }

  forcePickup(itemName: string, quantity: number): void {
    const current = this.currentCargo.get(itemName) || 0;
    this.currentCargo.set(itemName, current + quantity);
  }

  dropoff(itemName: string, quantity: number): boolean {
    const current = this.currentCargo.get(itemName) || 0;
    if (current < quantity) return false;

    const remaining = current - quantity;
    if (remaining === 0) {
      this.currentCargo.delete(itemName);
    } else {
      this.currentCargo.set(itemName, remaining);
    }
    return true;
  }

  getInventory(): CargoItem[] {
    return Array.from(this.currentCargo.entries())
      .filter(([_, quantity]) => quantity > 0)
      .map(([itemName, quantity]) => ({ itemName, quantity }));
  }

  hasItem(itemName: string): boolean {
    return (this.currentCargo.get(itemName) || 0) > 0;
  }

  getItemQuantity(itemName: string): number {
    return this.currentCargo.get(itemName) || 0;
  }

  reset() {
    this.currentCargo.clear();
  }

  clone(): ShipInventoryManager {
    const cloned = new ShipInventoryManager(this.maxCapacity);
    cloned.currentCargo = new Map(this.currentCargo);
    return cloned;
  }
}

