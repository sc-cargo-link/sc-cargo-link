/**
 * Utility functions for comparing contracts to detect duplicates
 */

export interface ContractData {
  id: string;
  timestamp: string;
  reward: number;
  contractName?: string;
  objective: Array<{
    item: string;
    location: string; // source
    deliveries?: Array<{ location: string; quantity: number }>;
  }>;
}

/**
 * Normalizes a contract name for comparison by trimming whitespace and converting to lowercase
 */
const normalizeContractName = (name: string): string => {
  return name?.trim().toLowerCase() || '';
};

/**
 * Normalizes a location name for comparison by trimming whitespace and converting to lowercase
 */
const normalizeLocationName = (location: string): string => {
  return location?.trim().toLowerCase() || '';
};

/**
 * Compares two arrays of locations for equality
 */
const compareLocationArrays = (locations1: string[], locations2: string[]): boolean => {
  if (locations1.length !== locations2.length) {
    return false;
  }
  
  const normalized1 = locations1.map(normalizeLocationName).sort();
  const normalized2 = locations2.map(normalizeLocationName).sort();
  
  return normalized1.every((loc, index) => loc === normalized2[index]);
};

/**
 * Compares two arrays of deliveries for equality
 */
const compareDeliveries = (deliveries1: Array<{ location: string; quantity: number }>, deliveries2: Array<{ location: string; quantity: number }>): boolean => {
  if (deliveries1.length !== deliveries2.length) {
    return false;
  }
  
  const normalized1 = deliveries1
    .map(d => ({ location: normalizeLocationName(d.location), quantity: d.quantity }))
    .sort((a, b) => a.location.localeCompare(b.location) || a.quantity - b.quantity);
  
  const normalized2 = deliveries2
    .map(d => ({ location: normalizeLocationName(d.location), quantity: d.quantity }))
    .sort((a, b) => a.location.localeCompare(b.location) || a.quantity - b.quantity);
  
  return normalized1.every((delivery, index) => 
    delivery.location === normalized2[index].location && 
    delivery.quantity === normalized2[index].quantity
  );
};

/**
 * Compares two contracts to determine if they are duplicates
 * Compares: name, reward, source locations, destination locations, and cargo SCU
 */
export const isDuplicateContract = (contract1: ContractData, contract2: ContractData): boolean => {
  // Compare contract names
  if (normalizeContractName(contract1.contractName || '') !== normalizeContractName(contract2.contractName || '')) {
    return false;
  }
  
  // Compare rewards
  if (contract1.reward !== contract2.reward) {
    return false;
  }
  
  // Compare objectives (source locations, items, and deliveries)
  if (contract1.objective.length !== contract2.objective.length) {
    return false;
  }
  
  for (let i = 0; i < contract1.objective.length; i++) {
    const obj1 = contract1.objective[i];
    const obj2 = contract2.objective[i];
    
    // Compare item names
    if (normalizeLocationName(obj1.item) !== normalizeLocationName(obj2.item)) {
      return false;
    }
    
    // Compare source locations
    if (normalizeLocationName(obj1.location) !== normalizeLocationName(obj2.location)) {
      return false;
    }
    
    // Compare deliveries (destination locations and quantities)
    const deliveries1 = obj1.deliveries || [];
    const deliveries2 = obj2.deliveries || [];
    
    if (!compareDeliveries(deliveries1, deliveries2)) {
      return false;
    }
  }
  
  return true;
};

/**
 * Checks if a new contract is a duplicate of any existing contracts
 * Returns the duplicate contract if found, null otherwise
 */
export const findDuplicateContract = (newContract: ContractData, existingContracts: ContractData[]): ContractData | null => {
  return existingContracts.find(existing => isDuplicateContract(newContract, existing)) || null;
};
