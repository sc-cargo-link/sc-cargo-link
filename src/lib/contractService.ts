import { db, ContractSession, Contract } from './db';

export const contractService = {
  async createSession(name: string, sessionId: string, contracts: Contract[]): Promise<number> {
    try {
      const id = await db.contractSessions.add({
        sessionId,
        name,
        createdAt: new Date(),
        contracts
      });
      return id;
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  },

  async getSessions(): Promise<ContractSession[]> {
    try {
      return await db.contractSessions.toArray();
    } catch (error) {
      console.error('Error getting sessions:', error);
      throw error;
    }
  },

  async getSessionById(id: number): Promise<ContractSession | undefined> {
    try {
      return await db.contractSessions.get(id);
    } catch (error) {
      console.error('Error getting session:', error);
      throw error;
    }
  }
}; 