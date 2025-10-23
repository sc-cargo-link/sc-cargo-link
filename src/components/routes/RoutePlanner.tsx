import React, { useState, useEffect, useMemo } from 'react';
import { data as allEntitiesData, AllEntities } from '@/data/AllEntities';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, GripVertical, Plus, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { cleanStationNameForMatching } from '@/lib/locationUtils';
import { loadFromStorage, saveToStorage } from '@/lib/storage';
import { RoutePlannerState, RouteStop, CargoItem } from '@/types/routePlanner';
import { StationInventoryManager, ShipInventoryManager } from '@/lib/inventoryManagers';

type ContractDisplay = {
  id: string;
  recordId: string;
  item: string;
  source: string;
  deliveries: Array<{ location: string; quantity: number }>;
  reward: number;
  contractName?: string;
  timestamp: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
};

interface RoutePlannerProps {
  contracts: ContractDisplay[];
  onRouteChange?: (stops: RouteStop[], startingLocationId: number | null) => void;
}

const STORAGE_KEY = 'routePlannerState';

const RoutePlanner: React.FC<RoutePlannerProps> = ({ contracts, onRouteChange }) => {
  const [startingLocation, setStartingLocation] = useState('');
  const [startingLocationId, setStartingLocationId] = useState<number | null>(null);
  const [cargoSpace, setCargoSpace] = useState(100);
  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
  const [openStartingLocation, setOpenStartingLocation] = useState(false);
  const [openAddStation, setOpenAddStation] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Initialize inventory managers
  const stationManager = useMemo(() => new StationInventoryManager(), []);
  const shipManager = useMemo(() => new ShipInventoryManager(cargoSpace), [cargoSpace]);

  // Get unique contract locations
  const contractLocations = useMemo(() => {
    const locationSet = new Set<string>();
    const locationMap = new Map<string, { name: string; entityId: number | null }>();

    contracts.forEach(contract => {
      const cleanedSource = cleanStationNameForMatching(contract.source);
      const sourceEntity = allEntitiesData.find(entity =>
        entity.name.toLowerCase().includes(cleanedSource.toLowerCase()) ||
        entity.key.toLowerCase().includes(cleanedSource.toLowerCase()) ||
        cleanedSource.toLowerCase().includes(entity.name.toLowerCase())
      );

      if (sourceEntity) {
        locationMap.set(contract.source, { name: contract.source, entityId: sourceEntity.id });
      }

      contract.deliveries.forEach(delivery => {
        const cleanedDelivery = cleanStationNameForMatching(delivery.location);
        const deliveryEntity = allEntitiesData.find(entity =>
          entity.name.toLowerCase().includes(cleanedDelivery.toLowerCase()) ||
          entity.key.toLowerCase().includes(cleanedDelivery.toLowerCase()) ||
          cleanedDelivery.toLowerCase().includes(entity.name.toLowerCase())
        );

        if (deliveryEntity) {
          locationMap.set(delivery.location, { name: delivery.location, entityId: deliveryEntity.id });
        }
      });
    });

    return Array.from(locationMap.values());
  }, [contracts]);

  // Initialize station inventory from contracts
  useEffect(() => {
    const contractsData = contracts.map(contract => {
      const cleanedSource = cleanStationNameForMatching(contract.source);
      const sourceEntity = allEntitiesData.find(entity =>
        entity.name.toLowerCase().includes(cleanedSource.toLowerCase()) ||
        entity.key.toLowerCase().includes(cleanedSource.toLowerCase()) ||
        cleanedSource.toLowerCase().includes(entity.name.toLowerCase())
      );

      return {
        id: contract.id,
        source: contract.source,
        sourceEntityId: sourceEntity?.id || null,
        item: contract.item,
        deliveries: contract.deliveries.map(delivery => {
          const cleanedDelivery = cleanStationNameForMatching(delivery.location);
          const deliveryEntity = allEntitiesData.find(entity =>
            entity.name.toLowerCase().includes(cleanedDelivery.toLowerCase()) ||
            entity.key.toLowerCase().includes(cleanedDelivery.toLowerCase()) ||
            cleanedDelivery.toLowerCase().includes(entity.name.toLowerCase())
          );

          return {
            location: delivery.location,
            entityId: deliveryEntity?.id || null,
            quantity: delivery.quantity
          };
        })
      };
    });

    stationManager.initializeFromContracts(contractsData);
  }, [contracts, stationManager]);

  // Load state from localStorage
  useEffect(() => {
    const savedState = loadFromStorage<any>(STORAGE_KEY, null);
    if (savedState) {
      setStartingLocation(savedState.startingLocation || '');
      setStartingLocationId(savedState.startingLocationId || null);
      setCargoSpace(savedState.cargoSpace || 100);
      
      if (savedState.routeStops && Array.isArray(savedState.routeStops)) {
        const restoredStops = savedState.routeStops.map((stop: any) => ({
          ...stop,
          pickupSelections: new Map(Object.entries(stop.pickupSelections || {}))
        }));
        setRouteStops(restoredStops);
      }
    }
  }, []);

  // Save state to localStorage and notify parent
  useEffect(() => {
    const stateToSave = {
      startingLocation,
      startingLocationId,
      cargoSpace,
      routeStops: routeStops.map(stop => ({
        ...stop,
        pickupSelections: Object.fromEntries(stop.pickupSelections)
      }))
    };
    saveToStorage(STORAGE_KEY, stateToSave);
    
    // Notify parent of route changes
    if (onRouteChange) {
      onRouteChange(routeStops, startingLocationId);
    }
  }, [startingLocation, startingLocationId, cargoSpace, routeStops, onRouteChange]);

  // Recalculate when cargo space changes
  useEffect(() => {
    if (routeStops.length > 0) {
      const calculatedStops = recalculateRoute(routeStops);
      // Only update if something actually changed
      const hasChanges = calculatedStops.some((stop, idx) => {
        const oldStop = routeStops[idx];
        return stop.currentSCU !== oldStop.currentSCU ||
               stop.availablePickups.length !== oldStop.availablePickups.length ||
               stop.dropoffs.length !== oldStop.dropoffs.length ||
               stop.inventoryAfter.length !== oldStop.inventoryAfter.length;
      });
      if (hasChanges) {
        setRouteStops(calculatedStops);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargoSpace]);

  const recalculateRoute = (stopsToCalculate: RouteStop[] = routeStops) => {
    if (stopsToCalculate.length === 0) return stopsToCalculate;
    
    const stationManagerCopy = stationManager.clone();
    const shipManagerCopy = new ShipInventoryManager(cargoSpace);

    const updatedStops = stopsToCalculate.map(stop => {
      const availablePickups = stationManagerCopy.getAvailableItems(stop.stationId);
      const dropoffs: CargoItem[] = [];

      // Calculate required dropoffs at this station based on contracts
      const requiredDropoffs = new Map<string, number>();
      
      contracts.forEach(contract => {
        contract.deliveries.forEach(delivery => {
          const cleanedDelivery = cleanStationNameForMatching(delivery.location);
          const deliveryEntity = allEntitiesData.find(entity =>
            entity.name.toLowerCase().includes(cleanedDelivery.toLowerCase()) ||
            entity.key.toLowerCase().includes(cleanedDelivery.toLowerCase()) ||
            cleanedDelivery.toLowerCase().includes(entity.name.toLowerCase())
          );
          
          if (deliveryEntity?.id === stop.stationId) {
            const currentRequired = requiredDropoffs.get(contract.item) || 0;
            requiredDropoffs.set(contract.item, currentRequired + delivery.quantity);
          }
        });
      });

      // Process dropoffs based on what's required and what we have
      requiredDropoffs.forEach((requiredQuantity, itemName) => {
        const onShip = shipManagerCopy.getItemQuantity(itemName);
        if (onShip > 0) {
          const dropoffQuantity = Math.min(onShip, requiredQuantity);
          dropoffs.push({ itemName, quantity: dropoffQuantity });
        }
      });

      // Process dropoffs first
      dropoffs.forEach(dropoff => {
        shipManagerCopy.dropoff(dropoff.itemName, dropoff.quantity);
        stationManagerCopy.addDropoff(stop.stationId, dropoff.itemName, dropoff.quantity);
      });

      // Process pickups based on selections
      availablePickups.forEach(pickup => {
        const isSelected = stop.pickupSelections.get(pickup.itemName) || false;
        if (isSelected && shipManagerCopy.canPickup(pickup.itemName, pickup.quantity)) {
          shipManagerCopy.pickup(pickup.itemName, pickup.quantity);
          stationManagerCopy.consumePickup(stop.stationId, pickup.itemName, pickup.quantity);
        }
      });

      const inventoryAfter = shipManagerCopy.getInventory();
      const currentSCU = shipManagerCopy.getCurrentSCU();

      return {
        ...stop,
        availablePickups,
        dropoffs,
        inventoryAfter,
        currentSCU
      };
    });

    return updatedStops;
  };

  const handleAddStation = (locationName: string, entityId: number | null) => {
    if (!entityId) return;

    const newStop: RouteStop = {
      id: `${entityId}-${Date.now()}`,
      stationId: entityId,
      stationName: locationName,
      pickupSelections: new Map(),
      availablePickups: [],
      dropoffs: [],
      inventoryAfter: [],
      currentSCU: 0
    };

    const stopsWithNew = [...routeStops, newStop];
    const calculatedStops = recalculateRoute(stopsWithNew);
    setRouteStops(calculatedStops);
    setOpenAddStation(false);
  };

  const handleRemoveStation = (stopId: string) => {
    setRouteStops(routeStops.filter(stop => stop.id !== stopId));
  };

  const handlePickupToggle = (stopId: string, itemName: string, checked: boolean) => {
    const stopsWithUpdatedSelection = routeStops.map(stop => {
      if (stop.id === stopId) {
        const newSelections = new Map(stop.pickupSelections);
        newSelections.set(itemName, checked);
        return { ...stop, pickupSelections: newSelections };
      }
      return stop;
    });
    
    const calculatedStops = recalculateRoute(stopsWithUpdatedSelection);
    setRouteStops(calculatedStops);
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newStops = [...routeStops];
    const draggedItem = newStops[draggedIndex];
    newStops.splice(draggedIndex, 1);
    newStops.splice(index, 0, draggedItem);

    const calculatedStops = recalculateRoute(newStops);
    setRouteStops(calculatedStops);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const filteredStations = allEntitiesData.filter(entity => entity.location_type === 8);

  return (
    <div className="w-96 bg-gray-800/50 backdrop-blur-sm border-l border-gray-700 flex flex-col flex-shrink-0">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-bold text-white mb-4">Route Planner</h2>
        
        {/* Starting Location */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Starting Location
          </label>
          <Popover open={openStartingLocation} onOpenChange={setOpenStartingLocation}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openStartingLocation}
                className="w-full justify-between bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
              >
                {startingLocation || "Select location..."}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="start">
              <Command className="bg-gray-800 border-gray-700">
                <CommandInput placeholder="Search locations..." className="text-white" />
                <CommandList>
                  <CommandEmpty>No location found.</CommandEmpty>
                  <CommandGroup>
                    <ScrollArea className="h-72">
                      {filteredStations.map((entity) => (
                        <CommandItem
                          key={entity.id}
                          value={entity.name}
                          onSelect={() => {
                            setStartingLocation(entity.name);
                            setStartingLocationId(entity.id);
                            setOpenStartingLocation(false);
                          }}
                          className="text-white hover:bg-gray-700"
                        >
                          {entity.name}
                        </CommandItem>
                      ))}
                    </ScrollArea>
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {/* Cargo Space */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Cargo Space (SCU)
          </label>
          <Input
            type="number"
            value={cargoSpace}
            onChange={(e) => setCargoSpace(Math.max(1, parseInt(e.target.value) || 100))}
            className="bg-gray-700 border-gray-600 text-white"
            min="1"
          />
        </div>
      </div>

      {/* Route Stops */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {routeStops.map((stop, index) => (
              <div
                key={stop.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={cn(
                  "bg-gray-700/50 rounded-lg p-3 border border-gray-600 cursor-move",
                  draggedIndex === index && "opacity-50"
                )}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-start gap-2 flex-1">
                    <GripVertical className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium text-sm">{stop.stationName}</div>
                      <div className="text-gray-400 text-xs">
                        SCU: {stop.currentSCU}/{cargoSpace}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveStation(stop.id)}
                    className="h-6 w-6 p-0 text-gray-400 hover:text-red-400"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Pickup Section */}
                {stop.availablePickups.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs font-semibold text-gray-300 mb-2">📦 Pickup:</div>
                    <div className="space-y-2 ml-4">
                      {stop.availablePickups.map((pickup) => (
                        <div key={pickup.itemName} className="flex items-center gap-2">
                          <Checkbox
                            id={`${stop.id}-${pickup.itemName}`}
                            checked={stop.pickupSelections.get(pickup.itemName) || false}
                            onCheckedChange={(checked) => 
                              handlePickupToggle(stop.id, pickup.itemName, checked as boolean)
                            }
                            className="border-gray-500"
                          />
                          <label
                            htmlFor={`${stop.id}-${pickup.itemName}`}
                            className="text-xs text-gray-300 cursor-pointer"
                          >
                            {pickup.itemName} ({pickup.quantity} SCU)
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dropoff Section */}
                {stop.dropoffs.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs font-semibold text-gray-300 mb-2">🚚 Dropoff:</div>
                    <div className="space-y-1 ml-4">
                      {stop.dropoffs.map((dropoff) => (
                        <div key={dropoff.itemName} className="text-xs text-gray-300">
                          {dropoff.itemName}: {dropoff.quantity} SCU
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Inventory After */}
                {stop.inventoryAfter.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-gray-300 mb-2">📋 Inventory After:</div>
                    <div className="space-y-1 ml-4">
                      {stop.inventoryAfter.map((item) => (
                        <div key={item.itemName} className="text-xs text-gray-300">
                          {item.itemName}: {item.quantity} SCU
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          
          {/* Add Station Button */}
          <div className="mt-3">
            <Popover open={openAddStation} onOpenChange={setOpenAddStation}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-center bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add station to route
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0" align="start">
                <Command className="bg-gray-800 border-gray-700">
                  <CommandInput placeholder="Search stations..." className="text-white" />
                  <CommandList>
                    <CommandEmpty>No station found.</CommandEmpty>
                    <CommandGroup>
                      <ScrollArea className="h-72">
                        {contractLocations.map((location, idx) => (
                          <CommandItem
                            key={`${location.name}-${idx}`}
                            value={location.name}
                            onSelect={() => handleAddStation(location.name, location.entityId)}
                            className="text-white hover:bg-gray-700"
                          >
                            <MapPin className="w-4 h-4 mr-2" />
                            {location.name}
                          </CommandItem>
                        ))}
                      </ScrollArea>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default RoutePlanner;

