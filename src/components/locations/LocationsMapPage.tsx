import React, { useRef, useEffect, useState, useMemo } from 'react';
import { data as containerData, planets } from '@/data/ContainerData';
import { data as locationData } from '@/data/LocationData';
import { loadFromStorage } from '@/lib/storage';

export type ContainerData = {
  System: string;
  ObjectContainer: string;
  InternalName: string;
  Type: string;
  XCoord: number;
  YCoord: number;
  ZCoord: number;
};

type ExtractedRecord = {
  id: string;
  timestamp: string;
  reward: number;
  contractName?: string;
  objective: Array<{
    item: string;
    location: string; // source
    deliveries?: Array<{ location: string; quantity: number }>;
  }>;
};

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const POINT_RADIUS = 7;
const CANVAS_PADDING = 40;

const getMinMax = (data: ContainerData[], key: keyof ContainerData) => {
  const values = data.map((d) => d[key] as number);
  return { min: Math.min(...values), max: Math.max(...values) };
};

const LocationsMapPage = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hovered, setHovered] = useState<null | { x: number; y: number; data: ContainerData; type: 'pickup' | 'dropoff' }>(null);
  const [selectedSystem, setSelectedSystem] = useState<'Stanton' | 'Pyro'>('Stanton');
  const [selectedStation, setSelectedStation] = useState<string | null>(null);
  const [records, setRecords] = useState<ExtractedRecord[]>(() => loadFromStorage('extractedData', []));

  // Update records from storage
  useEffect(() => {
    const sub = setInterval(() => {
      const latest = loadFromStorage<ExtractedRecord[]>('extractedData', []);
      setRecords(latest);
    }, 1000);
    return () => clearInterval(sub);
  }, []);

  const filteredData = containerData.filter((d) => d.System === selectedSystem);

  // Find the star (origin)
  const star = filteredData.find((d) => d.Type === 'Star');
  const originX = star ? star.XCoord : 0;
  const originY = star ? star.YCoord : 0;

  // Adjusted data with origin at star
  const adjustedData = filteredData.map((d) => ({
    ...d,
    XCoord: d.XCoord - originX,
    YCoord: d.YCoord - originY,
  }));

  // For planets
  const planetObjects = adjustedData.filter((obj) => obj.Type === 'Planet');

  // Calculate scaling
  const xRange = getMinMax(adjustedData, 'XCoord');
  const yRange = getMinMax(adjustedData, 'YCoord');

  const scaleX = (x: number) => {
    if (xRange.max === xRange.min) return CANVAS_WIDTH / 2;
    return ((x - xRange.min) / (xRange.max - xRange.min)) * (CANVAS_WIDTH - 2 * CANVAS_PADDING) + CANVAS_PADDING;
  };
  const scaleY = (y: number) => {
    if (yRange.max === yRange.min) return CANVAS_HEIGHT / 2;
    return ((y - yRange.min) / (yRange.max - yRange.min)) * (CANVAS_HEIGHT - 2 * CANVAS_PADDING) + CANVAS_PADDING;
  };

  // Create location mapping for contract locations
  const locationMapping = useMemo(() => {
    const mapping = new Map<string, ContainerData>();
    
    // Add ContainerData locations
    containerData.forEach(item => {
      mapping.set(item.ObjectContainer.toLowerCase(), item);
      mapping.set(item.InternalName.toLowerCase(), item);
    });

    // Add LocationData locations converted to ContainerData format
    locationData.forEach(item => {
      const containerData: ContainerData = {
        System: item.System,
        ObjectContainer: item.PoiName,
        InternalName: item.PoiName,
        Type: item.Type,
        XCoord: item.XCoord,
        YCoord: item.YCoord,
        ZCoord: item.ZCoord,
      };
      
      mapping.set(item.PoiName.toLowerCase(), containerData);
    });

    return mapping;
  }, []);

  // Extract pickup and dropoff locations from contracts
  const contractLocations = useMemo(() => {
    const pickups = new Set<string>();
    const dropoffs = new Set<string>();

    records.forEach(record => {
      record.objective.forEach(obj => {
        // Add pickup location
        pickups.add(obj.location);
        
        // Add dropoff locations
        obj.deliveries?.forEach(delivery => {
          dropoffs.add(delivery.location);
        });
      });
    });

    return { pickups: Array.from(pickups), dropoffs: Array.from(dropoffs) };
  }, [records]);

  // Get coordinates for contract locations
  const getLocationCoordinates = (locationName: string): ContainerData | null => {
    return locationMapping.get(locationName.toLowerCase()) || null;
  };

  // Filter locations that have coordinates and are in the selected system
  const pickupLocations = contractLocations.pickups
    .map(loc => getLocationCoordinates(loc))
    .filter((loc): loc is ContainerData => loc !== null && loc.System === selectedSystem)
    .map(loc => ({
      ...loc,
      XCoord: loc.XCoord - originX,
      YCoord: loc.YCoord - originY,
    }));

  const dropoffLocations = contractLocations.dropoffs
    .map(loc => getLocationCoordinates(loc))
    .filter((loc): loc is ContainerData => loc !== null && loc.System === selectedSystem)
    .map(loc => ({
      ...loc,
      XCoord: loc.XCoord - originX,
      YCoord: loc.YCoord - originY,
    }));

  // Get all unique locations for highlighting
  const allContractLocations = [...pickupLocations, ...dropoffLocations];
  const uniqueLocations = Array.from(
    new Map(allContractLocations.map(loc => [loc.InternalName, loc])).values()
  );

  // Filter locations based on selected station
  const highlightedLocations = selectedStation 
    ? uniqueLocations.filter(loc => loc.InternalName === selectedStation)
    : [];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw planet orbits
    if (planetObjects.length > 0 && adjustedData.length > 0) {
      const centerX = scaleX(0);
      const centerY = scaleY(0);
      planetObjects.forEach((planet) => {
        const px = scaleX(planet.XCoord);
        const py = scaleY(planet.YCoord);
        const dx = px - centerX;
        const dy = py - centerY;
        const orbitRadius = Math.sqrt(dx * dx + dy * dy);
        ctx.beginPath();
        ctx.arc(centerX, centerY, orbitRadius, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.2)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.closePath();
      });
    }

    // Draw only planet orbits for reference, not individual system objects

    // Draw pickup locations (green)
    pickupLocations.forEach((point) => {
      const isHighlighted = highlightedLocations.some(hl => hl.InternalName === point.InternalName);
      ctx.beginPath();
      ctx.arc(scaleX(point.XCoord), scaleY(point.YCoord), POINT_RADIUS + 2, 0, 2 * Math.PI);
      ctx.fillStyle = isHighlighted ? '#f59e42' : '#10b981'; // orange-400 or emerald-500
      ctx.shadowColor = isHighlighted ? '#f59e42' : '#34d399'; // orange-400 or emerald-400
      ctx.shadowBlur = isHighlighted ? 12 : 8;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.closePath();
    });

    // Draw dropoff locations (red)
    dropoffLocations.forEach((point) => {
      const isHighlighted = highlightedLocations.some(hl => hl.InternalName === point.InternalName);
      ctx.beginPath();
      ctx.arc(scaleX(point.XCoord), scaleY(point.YCoord), POINT_RADIUS + 2, 0, 2 * Math.PI);
      ctx.fillStyle = isHighlighted ? '#f59e42' : '#ef4444'; // orange-400 or red-500
      ctx.shadowColor = isHighlighted ? '#f59e42' : '#f87171'; // orange-400 or red-400
      ctx.shadowBlur = isHighlighted ? 12 : 8;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.closePath();
    });
  }, [adjustedData, planetObjects, pickupLocations, dropoffLocations, highlightedLocations]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    let found = null;

    // Check pickup locations
    for (const point of pickupLocations) {
      const px = scaleX(point.XCoord);
      const py = scaleY(point.YCoord);
      if (Math.hypot(mouseX - px, mouseY - py) < POINT_RADIUS + 3) {
        found = { x: px, y: py, data: point, type: 'pickup' as const };
        break;
      }
    }

    // Check dropoff locations if no pickup found
    if (!found) {
      for (const point of dropoffLocations) {
        const px = scaleX(point.XCoord);
        const py = scaleY(point.YCoord);
        if (Math.hypot(mouseX - px, mouseY - py) < POINT_RADIUS + 3) {
          found = { x: px, y: py, data: point, type: 'dropoff' as const };
          break;
        }
      }
    }

    // Only check contract locations, no system objects

    setHovered(found);
  };

  const handleMouseLeave = () => setHovered(null);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    let clicked = null;

    // Check pickup locations
    for (const point of pickupLocations) {
      const px = scaleX(point.XCoord);
      const py = scaleY(point.YCoord);
      if (Math.hypot(mouseX - px, mouseY - py) < POINT_RADIUS + 3) {
        clicked = point;
        break;
      }
    }

    // Check dropoff locations if no pickup found
    if (!clicked) {
      for (const point of dropoffLocations) {
        const px = scaleX(point.XCoord);
        const py = scaleY(point.YCoord);
        if (Math.hypot(mouseX - px, mouseY - py) < POINT_RADIUS + 3) {
          clicked = point;
          break;
        }
      }
    }

    // Only check contract locations, no system objects

    if (clicked) {
      setSelectedStation(clicked.InternalName);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 p-4">
      <div className="mb-6 w-full max-w-md flex justify-center">
        <select
          value={selectedSystem}
          onChange={(e) => setSelectedSystem(e.target.value as 'Stanton' | 'Pyro')}
          className="px-4 py-2 rounded-lg border border-gray-700 bg-gray-800 text-gray-200 shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
        >
          <option value="Stanton">Stanton</option>
          <option value="Pyro">Pyro</option>
        </select>
      </div>
      
      <div className="relative max-w-full overflow-x-auto rounded-lg shadow-lg border border-gray-700 bg-gray-900">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="block max-w-full h-auto bg-gray-800 rounded-lg cursor-pointer"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleCanvasClick}
        />
        {hovered && (
          <div
            className="absolute z-10 pointer-events-none px-4 py-2 rounded-lg shadow-lg bg-white text-gray-900 text-sm font-semibold border border-blue-400 animate-fade-in"
            style={{
              left:
                hovered.x > CANVAS_WIDTH * 0.7
                  ? hovered.x - 160
                  : hovered.x + 20,
              top:
                hovered.y > CANVAS_HEIGHT * 0.7
                  ? hovered.y - 70
                  : hovered.y + 20,
              minWidth: 120,
              maxWidth: 220,
            }}
          >
            <div className="mb-1 text-blue-600 font-bold">{hovered.data.ObjectContainer}</div>
            <div className="text-xs text-gray-600">{hovered.data.InternalName}</div>
            <div className="text-xs text-gray-500">
              {hovered.type === 'pickup' ? '🟢 Pickup' : '🔴 Dropoff'}
            </div>
            <div className="text-xs text-gray-500">({hovered.data.XCoord}, {hovered.data.YCoord})</div>
          </div>
        )}
      </div>
      
      <div className="mt-6 text-gray-300 text-lg font-semibold">Contract Locations Map</div>
      
      <div className="mt-4 flex flex-wrap gap-4 items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
          <span className="text-sm text-gray-300">Pickup Locations ({pickupLocations.length})</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-sm text-gray-300">Dropoff Locations ({dropoffLocations.length})</span>
        </div>
      </div>

      {selectedStation && (
        <div className="mt-4 px-4 py-2 rounded-lg bg-orange-700 text-white font-bold text-lg shadow border border-orange-400 animate-fade-in">
          Selected: {selectedStation}
        </div>
      )}
    </div>
  );
};

export default LocationsMapPage;
