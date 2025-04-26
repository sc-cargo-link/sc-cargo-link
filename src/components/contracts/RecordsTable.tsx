import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface RecordsTableProps {
  records: Array<{
    id: string;
    timestamp: string;
    reward: string;
    objective: string;
  }>;
  debugImages: {
    [key: string]: {
      reward: string;
      objective: string;
    };
  };
}

const RecordsTable: React.FC<RecordsTableProps> = ({ records, debugImages }) => (
  <div className="bg-black/30 rounded-lg p-4 border border-neon-blue/30">
    <h3 className="text-lg font-semibold text-white mb-4">Extracted Information</h3>
    {records.length > 0 ? (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-neon-blue">Time</TableHead>
              <TableHead className="text-neon-blue">Reward</TableHead>
              <TableHead className="text-neon-blue">Objective</TableHead>
              <TableHead className="text-neon-blue">Reward Zone</TableHead>
              <TableHead className="text-neon-blue">Objective Zone</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="text-gray-300">{item.timestamp}</TableCell>
                <TableCell className="text-green-400 font-semibold">{item.reward}</TableCell>
                <TableCell className="text-gray-300">{item.objective}</TableCell>
                <TableCell>
                  {debugImages[item.id]?.reward && (
                    <img src={debugImages[item.id].reward} alt="Reward Zone" className="max-h-16 border border-green-500 rounded" />
                  )}
                </TableCell>
                <TableCell>
                  {debugImages[item.id]?.objective && (
                    <img src={debugImages[item.id].objective} alt="Objective Zone" className="max-h-16 border border-blue-500 rounded" />
                  )}
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

export default RecordsTable; 