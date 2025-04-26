
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const Record = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Record Contract</h1>
          <p className="text-gray-400 mt-1">Document a new hauling contract</p>
        </div>
      </div>

      <div className="holographic-panel rounded-lg p-6 border border-neon-blue/20 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">Title</label>
            <Input className="bg-space-medium border-neon-blue/20" placeholder="Contract title" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">Client</label>
            <Input className="bg-space-medium border-neon-blue/20" placeholder="Client name" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-200">Description</label>
          <Input className="bg-space-medium border-neon-blue/20" placeholder="Contract description" />
        </div>

        <div className="flex justify-end">
          <Button className="bg-neon-blue text-space-dark hover:bg-neon-blue/90">
            Save Contract
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Record;
