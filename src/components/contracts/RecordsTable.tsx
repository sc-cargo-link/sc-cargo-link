import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { X, Edit, Plus, Trash, Search } from 'lucide-react';

interface RecordsTableProps {
  records: Array<{
    id: string;
    timestamp: string;
    reward: number;
    objective: Array<{
      item: string;
      location: string;
      quantity: number;
      deliveries?: Array<{
        location: string;
        quantity: number;
      }>;
    }>;
  }>;
  onUpdate: (records: RecordsTableProps['records']) => void;
}

interface EditDialogProps {
  record: RecordsTableProps['records'][0];
  onSave: (updatedRecord: RecordsTableProps['records'][0]) => void;
  onClose: () => void;
}

const EditDialog: React.FC<EditDialogProps> = ({ record, onSave, onClose }) => {
  const [editedRecord, setEditedRecord] = useState({
    ...record,
    objective: record.objective.map(obj => ({
      ...obj,
      deliveries: obj.deliveries || []
    }))
  });

  const addObjective = () => {
    setEditedRecord(prev => ({
      ...prev,
      objective: [...prev.objective, { item: '', location: '', quantity: 0, deliveries: [] }]
    }));
  };

  const removeObjective = (index: number) => {
    setEditedRecord(prev => ({
      ...prev,
      objective: prev.objective.filter((_, i) => i !== index)
    }));
  };

  const updateObjective = (index: number, field: string, value: string | number) => {
    setEditedRecord(prev => ({
      ...prev,
      objective: prev.objective.map((obj, i) => 
        i === index ? { ...obj, [field]: field === 'quantity' ? Number(value) : value } : obj
      )
    }));
  };

  const addDelivery = (objectiveIndex: number) => {
    setEditedRecord(prev => ({
      ...prev,
      objective: prev.objective.map((obj, i) => 
        i === objectiveIndex 
          ? { ...obj, deliveries: [...obj.deliveries, { location: '', quantity: 0 }] }
          : obj
      )
    }));
  };

  const removeDelivery = (objectiveIndex: number, deliveryIndex: number) => {
    setEditedRecord(prev => ({
      ...prev,
      objective: prev.objective.map((obj, i) => 
        i === objectiveIndex 
          ? { ...obj, deliveries: obj.deliveries.filter((_, j) => j !== deliveryIndex) }
          : obj
      )
    }));
  };

  const updateDelivery = (objectiveIndex: number, deliveryIndex: number, field: 'location' | 'quantity', value: string | number) => {
    setEditedRecord(prev => ({
      ...prev,
      objective: prev.objective.map((obj, i) => 
        i === objectiveIndex 
          ? {
              ...obj,
              deliveries: obj.deliveries.map((del, j) => 
                j === deliveryIndex 
                  ? { ...del, [field]: field === 'quantity' ? Number(value) : value }
                  : del
              )
            }
          : obj
      )
    }));
  };

  return (
    <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Edit Record</DialogTitle>
      </DialogHeader>
      <div className="grid gap-6 py-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Objectives</h3>
          <Button variant="outline" size="sm" onClick={addObjective}>
            <Plus className="h-4 w-4 mr-1" /> Add Objective
          </Button>
        </div>
        {editedRecord.objective.map((obj, objIndex) => (
          <div key={objIndex} className="space-y-4 border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <h4 className="text-md font-medium">Objective {objIndex + 1}</h4>
              <Button variant="ghost" size="sm" onClick={() => removeObjective(objIndex)}>
                <Trash className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid gap-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right">Item</label>
                <Input
                  className="col-span-3 bg-white/10 border border-white/20 focus:bg-white/20 focus:border-neon-blue/50 transition-colors"
                  value={obj.item}
                  onChange={(e) => updateObjective(objIndex, 'item', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right">Source</label>
                <Input
                  className="col-span-3 bg-white/10 border border-white/20 focus:bg-white/20 focus:border-neon-blue/50 transition-colors"
                  value={obj.location}
                  onChange={(e) => updateObjective(objIndex, 'location', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label>Deliveries</label>
                  <Button variant="outline" size="sm" onClick={() => addDelivery(objIndex)}>
                    <Plus className="h-4 w-4 mr-1" /> Add Delivery
                  </Button>
                </div>
                {obj.deliveries.map((del, delIndex) => (
                  <div key={delIndex} className="flex gap-2 items-center">
                    <Input
                      placeholder="Location"
                      value={del.location}
                      onChange={(e) => updateDelivery(objIndex, delIndex, 'location', e.target.value)}
                      className="bg-white/10 border border-white/20 focus:bg-white/20 focus:border-neon-blue/50 transition-colors"
                    />
                    <Input
                      type="number"
                      placeholder="Quantity"
                      value={del.quantity}
                      onChange={(e) => updateDelivery(objIndex, delIndex, 'quantity', e.target.value)}
                      className="w-24 bg-white/10 border border-white/20 focus:bg-white/20 focus:border-neon-blue/50 transition-colors"
                    />
                    <Button variant="ghost" size="sm" onClick={() => removeDelivery(objIndex, delIndex)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onSave(editedRecord)}>Save</Button>
      </div>
    </DialogContent>
  );
};

const RecordsTable: React.FC<RecordsTableProps> = ({ records, onUpdate }) => {
  const [editingRecord, setEditingRecord] = useState<RecordsTableProps['records'][0] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleRemoveRecord = (recordId: string) => {
    const updatedRecords = records.filter(record => record.id !== recordId);
    onUpdate(updatedRecords);
  };

  const handleSaveRecord = (updatedRecord: RecordsTableProps['records'][0]) => {
    const updatedRecords = records.map(record =>
      record.id === updatedRecord.id ? updatedRecord : record
    );
    onUpdate(updatedRecords);
    setEditingRecord(null);
  };

  const filteredRecords = records.filter(record => {
    if (!searchQuery.trim()) return true;
    
    const query = searchQuery.toLowerCase();
    const rewardMatch = record.reward.toString().includes(query);
    const objectiveMatch = record.objective.some(obj => {
      const itemMatch = obj.item.toLowerCase().includes(query);
      const locationMatch = obj.location.toLowerCase().includes(query);
      const deliveryMatch = obj.deliveries?.some(del => 
        del.location.toLowerCase().includes(query)
      );
      return itemMatch || locationMatch || deliveryMatch;
    });
    
    return rewardMatch || objectiveMatch;
  });

  return (
    <div className="bg-black/30 rounded-lg p-4 border border-neon-blue/30">
      <h3 className="text-lg font-semibold text-white mb-4">Extracted Information</h3>
      {records.length > 0 && (
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by item, location, or reward..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10 bg-white/10 border border-white/20 focus:bg-white/20 focus:border-neon-blue/50 transition-colors text-white placeholder:text-gray-400"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchQuery('')}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
      {records.length > 0 ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-neon-blue">Reward</TableHead>
                <TableHead className="text-neon-blue">Objective</TableHead>
                <TableHead className="text-neon-blue w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRecords
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-green-400 font-semibold">
                      {item.reward}
                    </TableCell>
                    <TableCell className="text-gray-300">
                      <span className="whitespace-pre-line block">
                        {item.objective.map((obj, idx) => (
                          <div key={idx}>
                              <span className="text-emerald-400">{obj.item}</span>:
                              {(obj as any).deliveries.map((del: any, dIdx: number) => (
                                <div key={dIdx} className="ml-4">
                                  - [<span className="text-red-300">{del.quantity}</span>] <span className="text-green-300">{obj.location}</span> ⇒ <span className="text-green-300">{del.location}</span> 
                                </div>
                              ))}
                            </div>
                        ))}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-2">
                        <Dialog open={editingRecord?.id === item.id}>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start"
                              onClick={() => setEditingRecord(item)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                            </Button>
                          </DialogTrigger>
                          {editingRecord && (
                            <EditDialog
                              record={editingRecord}
                              onSave={handleSaveRecord}
                              onClose={() => setEditingRecord(null)}
                            />
                          )}
                        </Dialog>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => handleRemoveRecord(item.id)}
                        >
                          <Trash className="h-4 w-4 mr-2" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <p className="text-gray-400 text-center py-8">No data captured yet.</p>
      )}
    </div>
  );
};

export default RecordsTable; 