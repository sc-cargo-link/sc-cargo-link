
import React, { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash, Search, Plus, X } from 'lucide-react';
import { loadFromStorage, saveToStorage } from '@/lib/storage';

type ExtractedRecord = {
  id: string;
  timestamp: string;
  reward: number;
  contractName?: string;
  objective: Array<{
    item: string;
    location: string; // source
    deliveries?: Array<{ location: string; quantity: number }>;
  }>;
};

type StatusValue = 'pending' | 'in-progress' | 'completed' | 'failed';

type ContractDisplay = {
  id: string; // recordId|objIdx
  recordId: string;
  item: string;
  source: string;
  deliveries: Array<{ location: string; quantity: number }>;
  reward: number;
  contractName?: string;
  timestamp: string;
  status: StatusValue;
};

const STATUS_STORAGE_KEY = 'contractStatusMap';
const COMPLETED_STORAGE_KEY = 'contractCompletedMap';

const ContractsPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | StatusValue>('all');
  const [records, setRecords] = useState<ExtractedRecord[]>(() => loadFromStorage('extractedData', []));
  const [statusMap, setStatusMap] = useState<Record<string, StatusValue>>(
    () => loadFromStorage<Record<string, StatusValue>>(STATUS_STORAGE_KEY, {})
  );
  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>(
    () => loadFromStorage<Record<string, boolean>>(COMPLETED_STORAGE_KEY, {})
  );

  useEffect(() => {
    const sub = setInterval(() => {
      // pick up changes made from Record page without reload
      const latest = loadFromStorage<ExtractedRecord[]>('extractedData', []);
      setRecords(latest);
    }, 1000);
    return () => clearInterval(sub);
  }, []);

  useEffect(() => {
    saveToStorage(STATUS_STORAGE_KEY, statusMap);
  }, [statusMap]);

  useEffect(() => {
    saveToStorage(COMPLETED_STORAGE_KEY, completedMap);
  }, [completedMap]);

  const contracts = useMemo<ContractDisplay[]>(() => {
    const list: ContractDisplay[] = [];
    for (const rec of records) {
      rec.objective.forEach((obj, objIdx) => {
        const id = `${rec.id}|${objIdx}`;
        const status = statusMap[id] ?? 'pending';
        list.push({
          id,
          recordId: rec.id,
          item: obj.item,
          source: obj.location,
          deliveries: obj.deliveries || [],
          reward: rec.reward,
          contractName: rec.contractName,
          timestamp: rec.timestamp,
          status,
        });
      });
    }
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [records, statusMap]);

  const groupedContracts = useMemo(() => {
    const groups: { [recordId: string]: ContractDisplay[] } = {};
    contracts.forEach(contract => {
      if (!groups[contract.recordId]) {
        groups[contract.recordId] = [];
      }
      groups[contract.recordId].push(contract);
    });
    return groups;
  }, [contracts]);

  const filteredGroupedContracts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered: { [recordId: string]: ContractDisplay[] } = {};
    
    Object.entries(groupedContracts).forEach(([recordId, contractGroup]) => {
      const filteredGroup = contractGroup.filter(c => {
        const matchesSearch =
          q === '' ||
          c.item.toLowerCase() === q ||
          c.source.toLowerCase() === q ||
          (c.contractName && c.contractName.toLowerCase() === q) ||
          c.deliveries.some(del => del.location.toLowerCase() === q) ||
          c.deliveries.some(del => String(del.quantity) === q) ||
          String(c.reward) === q;
        const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
        return matchesSearch && matchesStatus;
      });
      
      if (filteredGroup.length > 0) {
        filtered[recordId] = filteredGroup;
      }
    });
    
    return filtered;
  }, [groupedContracts, searchQuery, statusFilter]);

  const updateStatus = (id: string, next: StatusValue) => {
    setStatusMap(prev => ({ ...prev, [id]: next }));
  };

  const removeContract = (id: string) => {
    // update records in storage by removing the matching objective
    const [recordId, objIdxStr] = id.split('|');
    const objIdx = Number(objIdxStr);
    const nextRecords = records.map(r => {
      if (r.id === recordId) {
        const newObjectives = r.objective.filter((_, idx) => idx !== objIdx);
        return { ...r, objective: newObjectives };
      }
      return r;
    });
    // prune empty records
    const finalRecords = nextRecords.filter(r => r.objective.length > 0);
    setRecords(finalRecords);
    saveToStorage('extractedData', finalRecords);
  };

  const removeContractGroup = (recordId: string) => {
    // Remove entire contract group (all objectives for this record)
    const nextRecords = records.filter(r => r.id !== recordId);
    setRecords(nextRecords);
    saveToStorage('extractedData', nextRecords);
  };

  const updateContractGroupStatus = (recordId: string, status: StatusValue) => {
    // Update status for all contracts in the group
    const group = groupedContracts[recordId];
    if (group) {
      const updates: Record<string, StatusValue> = {};
      group.forEach(contract => {
        updates[contract.id] = status;
      });
      setStatusMap(prev => ({ ...prev, ...updates }));
    }
  };

  const getGroupStatus = (recordId: string): StatusValue => {
    const group = groupedContracts[recordId];
    if (!group || group.length === 0) return 'pending';
    
    // If all contracts have the same status, return that status
    const firstStatus = group[0].status;
    if (group.every(contract => contract.status === firstStatus)) {
      return firstStatus;
    }
    
    // If mixed statuses, return 'in-progress' as default
    return 'in-progress';
  };

  const toggleContractCompleted = (contractId: string) => {
    setCompletedMap(prev => ({
      ...prev,
      [contractId]: !prev[contractId]
    }));
  };

  const isContractCompleted = (contractId: string): boolean => {
    return completedMap[contractId] || false;
  };

  const calculateTotalSCU = (contractGroup: ContractDisplay[]): number => {
    return contractGroup.reduce((total, contract) => {
      const contractSCU = contract.deliveries.reduce((sum, delivery) => sum + delivery.quantity, 0);
      return total + contractSCU;
    }, 0);
  };

  const statusColor = (status: StatusValue) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'in-progress': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'completed': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'failed': return 'bg-red-500/20 text-red-300 border-red-500/30';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Contracts</h1>
          <p className="text-gray-400 mt-1">Manage your hauling contracts</p>
        </div>
        <Button className="bg-neon-blue text-space-dark hover:bg-neon-blue/90">
          <Plus className="mr-2 h-4 w-4" />
          New Contract
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search contracts..."
            className="pl-10 pr-10 bg-space-medium border-neon-blue/20 focus:border-neon-blue"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger className="bg-space-medium border-neon-blue/20 focus:border-neon-blue">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="holographic-panel rounded-lg p-4 border border-neon-blue/20">
        {Object.keys(filteredGroupedContracts).length === 0 ? (
          <p className="text-gray-400">No contracts available</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(filteredGroupedContracts).map(([recordId, contractGroup]) => {
              const firstContract = contractGroup[0];
              const groupStatus = getGroupStatus(recordId);
              const totalReward = firstContract.reward;
              const totalSCU = calculateTotalSCU(contractGroup);
              
              return (
                <div key={recordId} className="p-3 bg-space-medium/50 border border-neon-blue/20 rounded-lg">
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-xs text-gray-400 font-mono">[{recordId}]</span>
                      {firstContract.contractName && (
                        <span className="text-white font-medium text-sm">{firstContract.contractName}</span>
                      )}
                      <span className="text-green-400 font-semibold">{totalReward?.toLocaleString?.() ?? totalReward} aUEC</span>
                      <span className="text-neon-blue font-semibold">{totalSCU} SCU</span>
                      <Badge className={`${statusColor(groupStatus)} text-xs`}>{groupStatus}</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Select value={groupStatus} onValueChange={(v) => updateContractGroupStatus(recordId, v as StatusValue)}>
                        <SelectTrigger className="w-[120px] h-8 bg-space-medium border-neon-blue/20 focus:border-neon-blue text-xs">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in-progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="failed">Failed</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="h-8 px-2 border-red-500/40 text-red-300 hover:bg-red-500/10" 
                        onClick={() => removeContractGroup(recordId)}
                      >
                        <Trash className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {contractGroup.map((contract, contractIdx) => {
                      const isCompleted = isContractCompleted(contract.id);
                      return (
                        <div key={contract.id} className="space-y-1">
                          {contract.deliveries.length > 0 ? (
                            contract.deliveries.map((delivery, idx) => (
                              <div key={idx} className={`text-sm text-gray-300 flex items-center gap-2 ${isCompleted ? 'line-through opacity-60' : ''}`}>
                                <Checkbox
                                  checked={isCompleted}
                                  onCheckedChange={() => toggleContractCompleted(contract.id)}
                                  className="mr-2"
                                />
                                <span 
                                  className="text-white font-medium cursor-pointer hover:text-neon-blue transition-colors"
                                  onClick={() => setSearchQuery(contract.item)}
                                >
                                  {contract.item}
                                </span>
                                <span 
                                  className="text-gray-400 cursor-pointer hover:text-neon-blue transition-colors"
                                  onClick={() => setSearchQuery(contract.source)}
                                >
                                  {contract.source}
                                </span>
                                <span className="text-gray-400">→</span>
                                <span 
                                  className="text-white cursor-pointer hover:text-neon-blue transition-colors"
                                  onClick={() => setSearchQuery(delivery.location)}
                                >
                                  {delivery.location}
                                </span>
                                <span className="text-neon-blue text-xs">({delivery.quantity} SCU)</span>
                              </div>
                            ))
                          ) : (
                            <div className={`text-sm text-gray-500 italic flex items-center gap-2 ${isCompleted ? 'line-through opacity-60' : ''}`}>
                              <Checkbox
                                checked={isCompleted}
                                onCheckedChange={() => toggleContractCompleted(contract.id)}
                                className="mr-2"
                              />
                              <span 
                                className="cursor-pointer hover:text-neon-blue transition-colors"
                                onClick={() => setSearchQuery(contract.item)}
                              >
                                {contract.item}
                              </span>
                              <span 
                                className="cursor-pointer hover:text-neon-blue transition-colors"
                                onClick={() => setSearchQuery(contract.source)}
                              >
                                {contract.source}
                              </span>
                              <span> - No deliveries specified</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContractsPage;
