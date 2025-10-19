
import React, { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Trash, Search, Plus } from 'lucide-react';
import { loadFromStorage, saveToStorage } from '@/lib/storage';

type ExtractedRecord = {
  id: string;
  timestamp: string;
  reward: number;
  objective: Array<{
    item: string;
    location: string; // source
    deliveries?: Array<{ location: string; quantity: number }>;
  }>;
};

type StatusValue = 'pending' | 'in-progress' | 'completed' | 'failed';

type FlattenedContract = {
  id: string; // composite id: recordId|objIdx|delIdx
  recordId: string;
  item: string;
  source: string;
  destination: string;
  quantity: number;
  reward: number;
  timestamp: string;
  status: StatusValue;
};

const STATUS_STORAGE_KEY = 'contractStatusMap';

const ContractsPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | StatusValue>('all');
  const [records, setRecords] = useState<ExtractedRecord[]>(() => loadFromStorage('extractedData', []));
  const [statusMap, setStatusMap] = useState<Record<string, StatusValue>>(
    () => loadFromStorage<Record<string, StatusValue>>(STATUS_STORAGE_KEY, {})
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

  const flattened = useMemo<FlattenedContract[]>(() => {
    const list: FlattenedContract[] = [];
    for (const rec of records) {
      rec.objective.forEach((obj, objIdx) => {
        (obj.deliveries || []).forEach((del, delIdx) => {
          const id = `${rec.id}|${objIdx}|${delIdx}`;
          const status = statusMap[id] ?? 'pending';
          list.push({
            id,
            recordId: rec.id,
            item: obj.item,
            source: obj.location,
            destination: del.location,
            quantity: del.quantity,
            reward: rec.reward,
            timestamp: rec.timestamp,
            status,
          });
        });
      });
    }
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [records, statusMap]);

  const filteredContracts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return flattened.filter(c => {
      const matchesSearch =
        q === '' ||
        c.item.toLowerCase().includes(q) ||
        c.source.toLowerCase().includes(q) ||
        c.destination.toLowerCase().includes(q) ||
        String(c.quantity).includes(q) ||
        String(c.reward).includes(q);
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [flattened, searchQuery, statusFilter]);

  const updateStatus = (id: string, next: StatusValue) => {
    setStatusMap(prev => ({ ...prev, [id]: next }));
  };

  const removeContract = (id: string) => {
    // update records in storage by removing the matching delivery
    const [recordId, objIdxStr, delIdxStr] = id.split('|');
    const objIdx = Number(objIdxStr), delIdx = Number(delIdxStr);
    const nextRecords = records.map(r => ({ ...r, objective: r.objective.map(o => ({ ...o, deliveries: [...(o.deliveries || [])] })) }));
    const rec = nextRecords.find(r => r.id === recordId);
    if (!rec) return;
    const obj = rec.objective[objIdx];
    if (!obj) return;
    if (!obj.deliveries) return;
    obj.deliveries.splice(delIdx, 1);
    // prune empty structures
    rec.objective = rec.objective.filter(o => (o.deliveries && o.deliveries.length > 0));
    const finalRecords = nextRecords.filter(r => r.objective.length > 0);
    setRecords(finalRecords);
    saveToStorage('extractedData', finalRecords);
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
            className="pl-10 bg-space-medium border-neon-blue/20 focus:border-neon-blue"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
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
        {filteredContracts.length === 0 ? (
          <p className="text-gray-400">No contracts available</p>
        ) : (
          <div className="space-y-3">
            {filteredContracts.map(c => (
              <div key={c.id} className="p-4 bg-space-medium/50 border border-neon-blue/20 rounded-lg">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-white">{c.item}</h3>
                      <Badge className={statusColor(c.status)}>{c.status}</Badge>
                    </div>
                    <div className="text-sm text-gray-300">
                      <div>From: <span className="text-white">{c.source}</span></div>
                      <div>To: <span className="text-white">{c.destination}</span></div>
                      <div>Qty: <span className="text-white">{c.quantity}</span></div>
                      <div>Reward: <span className="text-white">{c.reward?.toLocaleString?.() ?? c.reward} aUEC</span></div>
                      <div className="text-gray-400">{new Date(c.timestamp).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 min-w-[180px] items-end">
                    <Select value={c.status} onValueChange={(v) => updateStatus(c.id, v as StatusValue)}>
                      <SelectTrigger className="w-[160px] bg-space-medium border-neon-blue/20 focus:border-neon-blue">
                        <SelectValue placeholder="Set status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="failed">Failed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" className="border-red-500/40 text-red-300 hover:bg-red-500/10" onClick={() => removeContract(c.id)}>
                      <Trash className="h-4 w-4 mr-2" /> Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContractsPage;
