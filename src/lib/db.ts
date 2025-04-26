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
  reward: string;
  objective: string;
}

class HaulPlannerDB extends Dexie {
  contractSessions!: Table<ContractSession>;

  constructor() {
    super('HaulPlannerDB');
    this.version(1).stores({
      contractSessions: '++id, sessionId, name, createdAt'
    });
  }
}

export const db = new HaulPlannerDB(); 