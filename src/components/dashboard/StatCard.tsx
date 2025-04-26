
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    direction: 'up' | 'down';
  };
}

const StatCard: React.FC<StatCardProps> = ({ title, value, description, icon, trend }) => {
  return (
    <Card className="holographic-panel">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-white mt-1">{value}</p>
            {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
          </div>
          <div className="bg-space-medium rounded-full p-2">{icon}</div>
        </div>

        {trend && (
          <div className="mt-4 flex items-center">
            <div className={`flex items-center text-xs ${trend.direction === 'up' ? 'text-green-400' : 'text-red-400'}`}>
              {trend.direction === 'up' ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
              <span>{trend.value}</span>
            </div>
            <span className="text-xs text-gray-400 ml-1">from last week</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;
