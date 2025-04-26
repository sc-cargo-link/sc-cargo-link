
import React from 'react';
import { Contract } from '@/types';
import { Badge } from '@/components/ui/badge';

interface ContractListProps {
  contracts: Contract[];
  compact?: boolean;
}

const ContractList: React.FC<ContractListProps> = ({ contracts, compact = false }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'in-progress':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'completed':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'failed':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  if (contracts.length === 0) {
    return <p className="text-gray-400">No contracts available</p>;
  }

  return (
    <div className="space-y-4">
      {contracts.map((contract) => (
        <div 
          key={contract.id} 
          className="p-4 bg-space-medium/50 border border-neon-blue/20 rounded-lg hover:border-neon-blue/40 transition-colors cursor-pointer"
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium text-white">{contract.title}</h3>
              {!compact && <p className="text-sm text-gray-400 mt-1">{contract.description}</p>}
            </div>
            <Badge className={`${getStatusColor(contract.status)}`}>
              {contract.status}
            </Badge>
          </div>
          
          <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-1 text-sm">
            <div className="text-gray-400">From:</div>
            <div className="text-white">{contract.startLocation}</div>
            
            <div className="text-gray-400">To:</div>
            <div className="text-white">{contract.endLocation}</div>
            
            <div className="text-gray-400">Payment:</div>
            <div className="text-white">{contract.payment.toLocaleString()} aUEC</div>
            
            {contract.deadline && (
              <>
                <div className="text-gray-400">Deadline:</div>
                <div className="text-white">
                  {new Date(contract.deadline).toLocaleDateString()}
                </div>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ContractList;
