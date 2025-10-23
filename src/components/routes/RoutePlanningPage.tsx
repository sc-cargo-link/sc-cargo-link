import React, { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, MapPin, Package, Calculator, Route } from 'lucide-react';
import { data as containerData, ContainerData } from '@/data/ContainerData';
import { data as locationData, LocationData } from '@/data/LocationData';
import { loadFromStorage } from '@/lib/storage';
import { routeOptimizationService, FlattenedContract, OptimizedRoute, RouteStep, OptimizationType } from '@/lib/routeOptimizationService';

type ExtractedRecord = {
  id: string;
  timestamp: string;
  reward: number;
  objective: Array<{
    item: string;
    location: string;
    deliveries?: Array<{ location: string; quantity: number }>;
  }>;
};


const RoutePlanningPage = () => {
  const [startingLocationQuery, setStartingLocationQuery] = useState('');
  const [storageSCU, setStorageSCU] = useState<number>(0);
  const [optimizationType, setOptimizationType] = useState<'distance' | 'min-stops'>('distance');
  const [optimizedRoute, setOptimizedRoute] = useState<OptimizedRoute | null>(null);
  const [records, setRecords] = useState<ExtractedRecord[]>([]);
  const [debugInfo, setDebugInfo] = useState<{
    unmatchedLocations: string[];
    matchedContracts: string[];
    totalContracts: number;
    processedContracts: number;
  } | null>(null);

  // Load contracts from storage
  useEffect(() => {
    const loadedRecords = loadFromStorage<ExtractedRecord[]>('extractedData', []);
    setRecords(loadedRecords);
  }, []);

  // Flatten contracts similar to ContractsPage
  const flattenedContracts = useMemo<FlattenedContract[]>(() => {
    const list: FlattenedContract[] = [];
    for (const rec of records) {
      rec.objective.forEach((obj, objIdx) => {
        (obj.deliveries || []).forEach((del, delIdx) => {
          const id = `${rec.id}|${objIdx}|${delIdx}`;
          list.push({
            id,
            recordId: rec.id,
            item: obj.item,
            source: obj.location,
            destination: del.location,
            quantity: del.quantity,
            reward: rec.reward,
            timestamp: rec.timestamp,
            status: 'pending',
          });
        });
      });
    }
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [records]);

  // Find approximate location matches
  const findLocationMatches = (query: string): ContainerData[] => {
    if (!query.trim()) return [];
    
    const normalizedQuery = query.toLowerCase().trim();
    return containerData
      .filter(item => 
        item.ObjectContainer.toLowerCase().includes(normalizedQuery) ||
        item.InternalName.toLowerCase().includes(normalizedQuery) ||
        item.System.toLowerCase().includes(normalizedQuery)
      )
      .slice(0, 10); // Limit to 10 results
  };

  const locationMatches = useMemo(() => 
    findLocationMatches(startingLocationQuery), 
    [startingLocationQuery]
  );

  const selectedStartingLocation = useMemo(() => 
    locationMatches[0] || null,
    [locationMatches]
  );

  const generateRoutePlans = () => {
    if (!selectedStartingLocation) {
      alert('Please select a starting location from the search results.');
      return;
    }

    // Generate optimized route using the service
    const optimized = routeOptimizationService.generateOptimizedRoute(
      flattenedContracts, 
      selectedStartingLocation, 
      storageSCU,
      optimizationType
    );
    setOptimizedRoute(optimized);

    // Track debug info for unmatched locations
    const unmatchedLocations: string[] = [];
    const matchedContracts: string[] = [];

    for (const contract of flattenedContracts) {
      // Use a simple check since we can't access private methods
      const sourceCoords = containerData.find(item => 
        item.ObjectContainer.toLowerCase().includes(contract.source.toLowerCase()) ||
        item.InternalName.toLowerCase().includes(contract.source.toLowerCase())
      ) || locationData.find(item => 
        item.PoiName.toLowerCase().includes(contract.source.toLowerCase())
      );
      
      const destCoords = containerData.find(item => 
        item.ObjectContainer.toLowerCase().includes(contract.destination.toLowerCase()) ||
        item.InternalName.toLowerCase().includes(contract.destination.toLowerCase())
      ) || locationData.find(item => 
        item.PoiName.toLowerCase().includes(contract.destination.toLowerCase())
      );

      if (!sourceCoords || !destCoords) {
        if (!sourceCoords) unmatchedLocations.push(`Source: ${contract.source}`);
        if (!destCoords) unmatchedLocations.push(`Destination: ${contract.destination}`);
        continue;
      }

      matchedContracts.push(`${contract.item}: ${contract.source} → ${contract.destination}`);
    }
    
    // Store debug info for display
    setDebugInfo({
      unmatchedLocations,
      matchedContracts,
      totalContracts: flattenedContracts.length,
      processedContracts: matchedContracts.length
    });
  };

  const clearPlans = () => {
    setOptimizedRoute(null);
    setStartingLocationQuery('');
    setStorageSCU(0);
    setDebugInfo(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Route Planning</h1>
          <p className="text-gray-400 mt-1">Plan optimal routes for your hauling contracts</p>
        </div>
      </div>

      {/* Input Section - Top */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Route Configuration */}
        <Card className="bg-space-medium border-neon-blue/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Route className="h-5 w-5 text-neon-blue" />
              Plan Route
            </CardTitle>
            <CardDescription className="text-gray-400">
              Configure your route parameters for all contracts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Contract Count Display */}
            <div className="p-3 bg-space-dark/50 border border-neon-blue/20 rounded-lg">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-neon-blue" />
                <span className="text-white font-medium">Available Contracts</span>
              </div>
              <div className="text-2xl font-bold text-neon-blue mt-1">{flattenedContracts.length}</div>
              <div className="text-xs text-gray-400">Routes will be generated for all contracts</div>
            </div>

            {/* Starting Location */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Starting Location</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search for location..."
                  className="pl-10 bg-space-dark border-neon-blue/20 focus:border-neon-blue"
                  value={startingLocationQuery}
                  onChange={(e) => setStartingLocationQuery(e.target.value)}
                />
              </div>
              {locationMatches.length > 0 && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {locationMatches.map((location, index) => (
                    <div
                      key={index}
                      className="p-2 bg-space-dark/50 border border-neon-blue/20 rounded cursor-pointer hover:bg-neon-blue/10"
                      onClick={() => {
                        setStartingLocationQuery(location.ObjectContainer);
                      }}
                    >
                      <div className="text-white text-sm font-medium">{location.ObjectContainer}</div>
                      <div className="text-gray-400 text-xs">{location.System} • {location.Type}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Storage SCU */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Storage SCU</label>
              <Input
                type="number"
                placeholder="Enter storage capacity..."
                className="bg-space-dark border-neon-blue/20 focus:border-neon-blue"
                value={storageSCU || ''}
                onChange={(e) => setStorageSCU(Number(e.target.value))}
                min="0"
              />
            </div>

            {/* Optimization Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Optimization Type</label>
              <Select value={optimizationType} onValueChange={(v) => setOptimizationType(v as 'distance' | 'min-stops')}>
                <SelectTrigger className="bg-space-dark border-neon-blue/20 focus:border-neon-blue">
                  <SelectValue placeholder="Select optimization type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="distance">Optimize for Distance</SelectItem>
                  <SelectItem value="min-stops">Optimize for Minimum Stops</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                onClick={generateRoutePlans}
                className="bg-neon-blue text-space-dark hover:bg-neon-blue/90 flex-1"
                disabled={!startingLocationQuery || storageSCU <= 0}
              >
                <Calculator className="mr-2 h-4 w-4" />
                Generate All Routes
              </Button>
              <Button 
                onClick={clearPlans}
                variant="outline"
                className="border-neon-blue/40 text-neon-blue hover:bg-neon-blue/10"
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Debug Info Panel */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="bg-yellow-500/5 border-yellow-500/20">
            <CardHeader>
              <CardTitle className="text-yellow-300 text-sm">Debug Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-xs">
                <div className="text-yellow-300 font-medium mb-2">Debug Info:</div>
                <div>Starting Location Query: "{startingLocationQuery}"</div>
                <div>Location Matches: {locationMatches.length}</div>
                <div>Selected Starting Location: {selectedStartingLocation?.ObjectContainer || 'None'}</div>
                <div>Available Contracts: {flattenedContracts.length}</div>
                <div>Optimized Route: {optimizedRoute ? 'Generated' : 'Not Generated'}</div>
                
                {debugInfo && (
                  <div className="mt-3 pt-2 border-t border-yellow-500/20">
                    <div className="text-yellow-300 font-medium mb-1">Processing Results:</div>
                    <div>Total Contracts: {debugInfo.totalContracts}</div>
                    <div>Processed Contracts: {debugInfo.processedContracts}</div>
                    <div>Skipped Contracts: {debugInfo.totalContracts - debugInfo.processedContracts}</div>
                    
                    {debugInfo.unmatchedLocations.length > 0 && (
                      <div className="mt-2">
                        <div className="text-red-300 font-medium">Unmatched Locations:</div>
                        <div className="max-h-20 overflow-y-auto">
                          {debugInfo.unmatchedLocations.map((location, index) => (
                            <div key={index} className="text-red-200">• {location}</div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {debugInfo.matchedContracts.length > 0 && (
                      <div className="mt-2">
                        <div className="text-green-300 font-medium">Matched Contracts:</div>
                        <div className="max-h-20 overflow-y-auto">
                          {debugInfo.matchedContracts.map((contract, index) => (
                            <div key={index} className="text-green-200">• {contract}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Optimized TSP Route Display - Bottom */}
      {optimizedRoute && (
        <Card className="bg-space-medium border-green-500/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Route className="h-5 w-5 text-green-400" />
              Optimized TSP Route
            </CardTitle>
            <CardDescription className="text-gray-400">
              Traveling Salesman optimized route for maximum efficiency
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Route Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-space-dark/50 border border-green-500/20 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {optimizedRoute.totalDistance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                  <div className="text-xs text-gray-400">Total Distance (m)</div>
                </div>
                <div className="p-3 bg-space-dark/50 border border-green-500/20 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-400">{optimizedRoute.totalFuel}</div>
                  <div className="text-xs text-gray-400">Est. Fuel</div>
                </div>
                <div className="p-3 bg-space-dark/50 border border-green-500/20 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-400">{optimizedRoute.totalTime}</div>
                  <div className="text-xs text-gray-400">Est. Time (min)</div>
                </div>
                <div className="p-3 bg-space-dark/50 border border-green-500/20 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-400">{optimizedRoute.totalReward.toLocaleString()}</div>
                  <div className="text-xs text-gray-400">Total Reward (aUEC)</div>
                </div>
              </div>

              {/* Cargo Utilization */}
              <div className="p-3 bg-space-dark/50 border border-green-500/20 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white font-medium">Cargo Utilization</span>
                  <span className="text-green-400 font-bold">{optimizedRoute.cargoUtilization.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-green-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(optimizedRoute.cargoUtilization, 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Route Steps with Boxes and Arrows - Vertical Flow */}
              <div className="space-y-4">
                <h4 className="text-white font-medium">Route Steps:</h4>
                <div className="flex flex-col items-center gap-4">
                  {optimizedRoute.route.map((step, index) => (
                    <React.Fragment key={index}>
                      {/* Route Step Box */}
                      <div className={`w-full max-w-md p-4 rounded-lg border-2 ${
                        step.action === 'start' ? 'bg-blue-500/10 border-blue-500/30' :
                        step.action === 'pickup' ? 'bg-green-500/10 border-green-500/30' : 
                        'bg-orange-500/10 border-orange-500/30'
                      }`}>
                        {/* Location Header */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-4 h-4 rounded-full ${
                            step.action === 'start' ? 'bg-blue-500' :
                            step.action === 'pickup' ? 'bg-green-500' : 'bg-orange-500'
                          }`}></div>
                          <div className="text-white font-medium text-sm">
                            {step.location.ObjectContainer}
                          </div>
                        </div>
                        
                        {/* Action */}
                        <div className="flex items-center justify-between p-2 bg-black/20 rounded">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              step.action === 'start' ? 'bg-blue-400' :
                              step.action === 'pickup' ? 'bg-green-400' : 'bg-orange-400'
                            }`}></div>
                            <div className="text-xs font-medium uppercase tracking-wide text-gray-300">
                              {step.action === 'start' ? 'START' :
                               step.action === 'pickup' ? 'PICKUP' : 'DELIVER'}
                            </div>
                          </div>
                          
                          {step.contract && (
                            <div className="text-right text-xs text-gray-300">
                              <div>{step.contract.item}</div>
                              <div>{step.contract.quantity} SCU</div>
                            </div>
                          )}
                        </div>
                        
                        {/* Step Summary */}
                        <div className="mt-3 pt-2 border-t border-white/10 text-xs text-gray-400">
                          <div className="flex justify-between">
                            <span>Cargo: {step.cargoOnBoard} SCU</span>
                            <span>Distance: {step.cumulativeDistance.toLocaleString(undefined, { maximumFractionDigits: 0 })}m</span>
                          </div>
                          {step.contract && (
                            <div className="mt-1">
                              Reward: {step.contract.reward.toLocaleString()} aUEC
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Arrow between steps */}
                      {index < optimizedRoute.route.length - 1 && (
                        <div className="flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full bg-neon-blue/20 flex items-center justify-center">
                            <div className="w-0 h-0 border-t-[6px] border-t-neon-blue border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent"></div>
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RoutePlanningPage;
