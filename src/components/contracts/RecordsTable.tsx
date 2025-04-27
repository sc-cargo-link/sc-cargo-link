import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface RecordsTableProps {
  records: Array<{
    id: string;
    timestamp: string;
    reward: number;
    objective: Array<{
      item: string;
      location: string;
      quantity: number;
    }>;
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
              <TableHead className="text-neon-blue">Reward</TableHead>
              <TableHead className="text-neon-blue">Objective</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="text-green-400 font-semibold">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>{item.reward}</span>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <img src={debugImages[item.id]?.reward} alt="Reward Debug" className="max-w-xs max-h-40" />
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="text-gray-300">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="whitespace-pre-line block">
                        {item.objective.map((obj, idx) => (
                          <React.Fragment key={idx}>
                            {obj.item && obj.location && Array.isArray((obj as any).deliveries) ? (
                              <>
                                {`Collect ${obj.item} from ${obj.location}.`}
                                {(obj as any).deliveries.map((del: any, dIdx: number) => (
                                  <div key={dIdx} className="ml-4">{`- Deliver 0/${del.quantity} SCU to ${del.location}.`}</div>
                                ))}
                              </>
                            ) : obj.location && obj.quantity ? (
                              <div>{`- Deliver 0/${obj.quantity} SCU to ${obj.location}.`}</div>
                            ) : null}
                            {/* {idx !== item.objective.length - 1 && <br />} */}
                          </React.Fragment>
                        ))}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <img src={debugImages[item.id]?.objective} alt="Objective Debug" className="max-w-xs max-h-40" />
                    </TooltipContent>
                  </Tooltip>
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