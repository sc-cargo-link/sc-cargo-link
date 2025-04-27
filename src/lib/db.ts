import Dexie, { Table } from 'dexie';

export interface ContractSession {
  id?: number;
  sessionId: string;
  name: string;
  createdAt: Date;
  contracts: Contract[];
}

export interface Contract {
  id: string;
  timestamp: string;
  reward: number;
  objective: Array<{
    item: string;
    location: string;
    quantity: number;
  }>;
}

class HaulPlannerDB extends Dexie {
  contractSessions!: Table<ContractSession>;

  constructor() {
    super('HaulPlannerDB');
    this.version(1).stores({
      contractSessions: '++id, sessionId, name, createdAt',
      contracts: '++id, timestamp, reward, objective'
    });
  }
}

export const db = new HaulPlannerDB(); 