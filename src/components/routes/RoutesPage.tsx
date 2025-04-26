
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { sampleRoutes, sampleContracts } from '@/data/sampleData';
import { Plus, Search, AlertTriangle } from 'lucide-react';

const RoutesPage = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRoutes = sampleRoutes.filter(route =>
    route.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    route.startLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
    route.endLocation.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDangerBadgeColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      case 'high':
        return 'bg-red-500/20 text-red-300 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const getContractInfo = (contractIds: string[]) => {
    return contractIds.map(id => 
      sampleContracts.find(contract => contract.id === id)
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Routes</h1>
          <p className="text-gray-400 mt-1">Plan and optimize your hauling routes</p>
        </div>
        <Button className="bg-neon-blue text-space-dark hover:bg-neon-blue/90">
          <Plus className="mr-2 h-4 w-4" />
          New Route
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search routes..."
          className="pl-10 bg-space-medium border-neon-blue/20 focus:border-neon-blue"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {filteredRoutes.map((route) => {
          const contracts = getContractInfo(route.contracts);
          
          return (
            <Card key={route.id} className="holographic-panel hover:border-neon-blue/40 transition-colors cursor-pointer">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <h3 className="font-medium text-white text-lg">{route.name}</h3>
                  <Badge className={`${getDangerBadgeColor(route.dangerLevel)}`}>
                    {route.dangerLevel === 'high' && <AlertTriangle className="h-3 w-3 mr-1" />}
                    {route.dangerLevel.charAt(0).toUpperCase() + route.dangerLevel.slice(1)} Risk
                  </Badge>
                </div>
                
                <div className="mt-4 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">From:</span>
                    <span className="text-white text-right">{route.startLocation}</span>
                  </div>
                  {route.waypoints.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Via:</span>
                      <span className="text-white text-right">{route.waypoints.join(', ')}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-400">To:</span>
                    <span className="text-white text-right">{route.endLocation}</span>
                  </div>
                </div>
                
                <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                  <div className="text-center p-2 bg-space-medium rounded">
                    <p className="text-gray-400 text-xs">Distance</p>
                    <p className="text-white font-medium">{route.distance} Mkm</p>
                  </div>
                  <div className="text-center p-2 bg-space-medium rounded">
                    <p className="text-gray-400 text-xs">Est. Time</p>
                    <p className="text-white font-medium">{route.estimatedTime} min</p>
                  </div>
                  <div className="text-center p-2 bg-space-medium rounded">
                    <p className="text-gray-400 text-xs">Fuel</p>
                    <p className="text-white font-medium">{route.fuelConsumption} units</p>
                  </div>
                </div>
                
                {contracts.length > 0 && (
                  <div className="mt-4">
                    <p className="text-gray-400 text-xs mb-2">Associated Contracts:</p>
                    <div className="flex flex-wrap gap-2">
                      {contracts.map((contract) => contract && (
                        <Badge key={contract.id} className="bg-space-medium text-white border border-neon-blue/30">
                          {contract.title}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default RoutesPage;
