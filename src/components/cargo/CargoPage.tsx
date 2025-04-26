
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { sampleShips, sampleCargoItems } from '@/data/sampleData';
import { Plus, Search, AlertTriangle, Package } from 'lucide-react';

const CargoPage = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredShips = sampleShips.filter(ship =>
    ship.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ship.model.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Cargo Management</h1>
          <p className="text-gray-400 mt-1">Track and manage your fleet's cargo</p>
        </div>
        <Button className="bg-neon-blue text-space-dark hover:bg-neon-blue/90">
          <Plus className="mr-2 h-4 w-4" />
          Add Ship
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search ships..."
          className="pl-10 bg-space-medium border-neon-blue/20 focus:border-neon-blue"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {filteredShips.map((ship) => {
          const cargoPercentage = (ship.currentCargo / ship.cargoCapacity) * 100;
          const hasIllegalCargo = ship.loadedCargo.some(cargo => 
            sampleCargoItems.find(item => item.id === cargo.id)?.illegal
          );
          
          return (
            <Card key={ship.id} className="holographic-panel hover:border-neon-blue/40 transition-colors cursor-pointer">
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-white text-lg">{ship.name}</h3>
                    <p className="text-sm text-gray-400">{ship.model}</p>
                  </div>
                  {hasIllegalCargo && (
                    <Badge className="bg-red-500/20 text-red-300 border-red-500/30">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Illegal Cargo
                    </Badge>
                  )}
                </div>
                
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-400">Cargo Capacity</span>
                    <span className="text-sm text-white">
                      {ship.currentCargo} / {ship.cargoCapacity} SCU
                    </span>
                  </div>
                  <Progress value={cargoPercentage} className="h-2 bg-space-medium">
                    <div 
                      className={`h-full ${cargoPercentage > 90 ? 'bg-red-400' : cargoPercentage > 70 ? 'bg-yellow-400' : 'bg-neon-blue'}`} 
                      style={{ width: `${cargoPercentage}%` }}
                    />
                  </Progress>
                </div>
                
                <div className="mt-4">
                  <h4 className="text-sm text-gray-400 mb-2">Current Cargo:</h4>
                  {ship.loadedCargo.length === 0 ? (
                    <p className="text-gray-400 text-sm">No cargo loaded</p>
                  ) : (
                    <div className="space-y-2">
                      {ship.loadedCargo.map(cargoId => {
                        const cargoItem = sampleCargoItems.find(item => item.id === cargoId.id);
                        if (!cargoItem) return null;
                        
                        return (
                          <div 
                            key={cargoItem.id} 
                            className="flex justify-between items-center p-2 bg-space-medium rounded"
                          >
                            <div className="flex items-center">
                              <Package className="h-4 w-4 text-gray-400 mr-2" />
                              <div>
                                <p className="text-white text-sm">{cargoItem.name}</p>
                                <p className="text-gray-400 text-xs">{cargoItem.type}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-white text-sm">{cargoItem.quantity} units</p>
                              <p className="text-gray-400 text-xs">{cargoItem.quantity * cargoItem.size} SCU</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                
                <div className="mt-4 text-right">
                  <p className="text-neon-blue text-sm">
                    Total Value: {ship.loadedCargo.reduce((sum, cargoId) => {
                      const cargoItem = sampleCargoItems.find(item => item.id === cargoId.id);
                      return sum + (cargoItem ? cargoItem.quantity * cargoItem.unitValue : 0);
                    }, 0).toLocaleString()} aUEC
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default CargoPage;
