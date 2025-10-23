import React, { useRef, useEffect, useState, useCallback } from 'react';
import { data as allEntitiesData, locationTypes, AllEntities } from '@/data/AllEntities';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { loadFromStorage } from '@/lib/storage';
import { cleanStationNameForMatching, cleanLocationName } from '@/lib/locationUtils';
import { InventoryManager, type InventoryItem } from '@/lib/InventoryManager';
import Navbar from '@/components/layout/Navbar';

// Canvas height will be calculated dynamically based on viewport
const POINT_RADIUS = 6;
const CANVAS_PADDING = 50;
const MIN_ZOOM = 0.001;
const MAX_ZOOM = Infinity;
const ZOOM_SPEED = 0.3;
const CLUSTER_DISTANCE = 50; // pixels

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

type ContractRoute = {
  contract: ContractDisplay;
  sourceEntity: AllEntities | null;
  deliveryEntities: AllEntities[];
};

const RoutesPage = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [flashLocation, setFlashLocation] = useState<{ x: number; y: number; timestamp: number } | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [showContracts, setShowContracts] = useState(true);
  const [contracts, setContracts] = useState<ContractDisplay[]>([]);
  const [contractRoutes, setContractRoutes] = useState<ContractRoute[]>([]);
  const [contractStationIds, setContractStationIds] = useState<Set<number>>(new Set());
  const [contractLocationTypes, setContractLocationTypes] = useState<Map<number, 'pickup' | 'dropoff' | 'both'>>(new Map());
  const [locationError, setLocationError] = useState<string | null>(null);
  
  // Route planning state
  const [currentLocation, setCurrentLocation] = useState<string>('');
  const [cargoSpace, setCargoSpace] = useState<number>(0);
  const [routeStops, setRouteStops] = useState<string[]>(['']);
  const [plannedRoute, setPlannedRoute] = useState<Array<{ location: string; entity: AllEntities | null }>>([]);
  
  
  // Ship inventory state - tracks what cargo is currently on the ship
  const [shipInventory, setShipInventory] = useState<Map<string, InventoryItem>>(new Map());
  
  // Inventory manager instance
  const inventoryManager = useRef(new InventoryManager());
  
  // Update inventory manager when shipInventory changes
  useEffect(() => {
    inventoryManager.current.setInventory(shipInventory);
  }, [shipInventory]);
  
  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  // Location type toggle states
  const [locationTypeToggles, setLocationTypeToggles] = useState({
    0: true, // star
    1: true, // planet
    2: true, // planet_moon
    4: true, // lagrangian_points
    6: true, // unknown type (4 entities)
    7: true, // unknown type (167 entities)
    8: true, // stations
    9: true, // unknown type (19 entities)
    10: true, // unknown type (402 entities)
    11: true, // unknown type (151 entities)
  });

  // Filter entities by location type toggles
  const stantonData = allEntitiesData.filter((entity) => {
    return locationTypeToggles[entity.location_type as keyof typeof locationTypeToggles] === true;
  });

  // Find Stanton star (center) from all entities
  const stantonStar = allEntitiesData.find((entity) => entity.location_type === 0);
  const starX = stantonStar ? stantonStar.g_coord_x : 0;
  const starY = stantonStar ? stantonStar.g_coord_y : 0;


  // Adjust coordinates relative to star for all entities
  const adjustedData = allEntitiesData.map((entity) => ({
    ...entity,
    g_coord_x: entity.g_coord_x - starX,
    g_coord_y: entity.g_coord_y - starY,
  }));

  // Separate by location types with toggle filtering
  const star = adjustedData.filter((entity) => entity.location_type === 0 && locationTypeToggles[0]);
  const planets = adjustedData.filter((entity) => entity.location_type === 1 && locationTypeToggles[1]);
  const planetMoons = adjustedData.filter((entity) => entity.location_type === 2 && locationTypeToggles[2]);
  const lagrangianPoints = adjustedData.filter((entity) => entity.location_type === 4 && locationTypeToggles[4]);
  const type6 = adjustedData.filter((entity) => entity.location_type === 6 && locationTypeToggles[6]);
  const type7 = adjustedData.filter((entity) => entity.location_type === 7 && locationTypeToggles[7]);
  const stations = adjustedData.filter((entity) => entity.location_type === 8 && locationTypeToggles[8]);
  const type9 = adjustedData.filter((entity) => entity.location_type === 9 && locationTypeToggles[9]);
  const type10 = adjustedData.filter((entity) => entity.location_type === 10 && locationTypeToggles[10]);
  const type11 = adjustedData.filter((entity) => entity.location_type === 11 && locationTypeToggles[11]);

    // // log when allEntitiesData changes
    // useEffect(() => {
    //   console.log('allEntitiesData changed', allEntitiesData.length);
    //   console.log('Stanton data count:', stantonData.length);
    //   console.log('Star count:', star.length);
    //   console.log('Planets count:', planets.length);
    //   console.log('Moons count:', planetMoons.length);
    //   console.log('Lagrangian count:', lagrangianPoints.length);
    //   console.log('Type 6 count:', type6.length);
    //   console.log('Type 7 count:', type7.length);
    //   console.log('Stations count:', stations.length);
    //   console.log('Type 9 count:', type9.length);
    //   console.log('Type 10 count:', type10.length);
    //   console.log('Type 11 count:', type11.length);
    //   console.log('Cities in stantonData:', stantonData.filter(e => e.location_type === 5).length);
    //   console.log('Cities in allEntitiesData:', allEntitiesData.filter(e => e.location_type === 5).length);
    //   console.log('All location types in Stanton:', [...new Set(stantonData.map(e => e.location_type))]);
    
    // }, [allEntitiesData, stantonData, star, planets, planetMoons, lagrangianPoints, type6, type7, stations, type9, type10, type11]);
  
  // Debug logging

  // Calculate scaling
  const allX = adjustedData.map((d) => d.g_coord_x);
  const allY = adjustedData.map((d) => d.g_coord_y);
  const xRange = { min: Math.min(...allX), max: Math.max(...allX) };
  const yRange = { min: Math.min(...allY), max: Math.max(...allY) };

  const scaleX = useCallback((x: number) => {
    if (xRange.max === xRange.min) return canvasSize.width / 2;
    return ((x - xRange.min) / (xRange.max - xRange.min)) * (canvasSize.width - 2 * CANVAS_PADDING) + CANVAS_PADDING;
  }, [xRange, canvasSize.width]);

  const scaleY = useCallback((y: number) => {
    if (yRange.max === yRange.min) return canvasSize.height / 2;
    return ((y - yRange.min) / (yRange.max - yRange.min)) * (canvasSize.height - 2 * CANVAS_PADDING) + CANVAS_PADDING;
  }, [yRange, canvasSize.height]);

  // Get clustered labels based on zoom level and proximity
  const getClusteredLabels = useCallback(() => {
    const allEntities = [...star, ...planets, ...planetMoons, ...lagrangianPoints, ...type6, ...type7, ...stations, ...type9, ...type10, ...type11];
    const labels: Array<{ entity: AllEntities; priority: number; screenX: number; screenY: number; contractLocations: string[] }> = [];
    
    // Define minimum zoom thresholds for different entity types (lower number = higher priority)
    const minZoomThresholds = {
      0: 0.1,  // stars - always show
      1: 0.5,  // planets - show when zoomed in
      2: 1,    // moons - show when zoomed in more
      4: 0.2,  // lagrangian - show when zoomed in
      6: 2,    // type 6 - show when zoomed in
      7: 3,    // type 7 - show when zoomed in
      8: 1,    // stations - show when zoomed in
      9: 2.5,  // type 9 - show when zoomed in
      10: 4,   // type 10 - show when zoomed in
      11: 3.5, // type 11 - show when zoomed in
    };
    
    // Filter entities that should show labels at current zoom (show when zoomed in enough)
    const visibleEntities = allEntities.filter(entity => 
      zoom >= (minZoomThresholds[entity.location_type as keyof typeof minZoomThresholds] || 0.1)
    );
    
    // Group nearby entities into clusters
    const clusters: Array<AllEntities[]> = [];
    const processed = new Set<number>();
    const CLUSTER_DISTANCE = 50; // pixels
    
    visibleEntities.forEach(entity => {
      if (processed.has(entity.id)) return;
      
      const px = scaleX(entity.g_coord_x) * zoom + pan.x;
      const py = scaleY(entity.g_coord_y) * zoom + pan.y;
      
      // Skip if not visible on screen
      if (px < 0 || px > canvasSize.width || py < 0 || py > canvasSize.height) return;
      
      const cluster = [entity];
      processed.add(entity.id);
      
      // Find nearby entities
      visibleEntities.forEach(other => {
        if (processed.has(other.id)) return;
        
        const otherPx = scaleX(other.g_coord_x) * zoom + pan.x;
        const otherPy = scaleY(other.g_coord_y) * zoom + pan.y;
        
        const distance = Math.sqrt(Math.pow(px - otherPx, 2) + Math.pow(py - otherPy, 2));
        
        if (distance < CLUSTER_DISTANCE) {
          cluster.push(other);
          processed.add(other.id);
        }
      });
      
      clusters.push(cluster);
    });
    
    // For each cluster, select the highest priority entity (lowest location_type number)
    clusters.forEach(cluster => {
      const highestPriorityEntity = cluster.reduce((highest, current) => 
        current.location_type < highest.location_type ? current : highest
      );
      
      const px = scaleX(highestPriorityEntity.g_coord_x) * zoom + pan.x;
      const py = scaleY(highestPriorityEntity.g_coord_y) * zoom + pan.y;
      
      // Find contract locations for entities in this cluster
      const contractLocationNames = new Set<string>();
      cluster.forEach(entity => {
        // Check if this entity is involved in any contracts
        const entityContracts = contractRoutes.filter(route => 
          route.sourceEntity?.id === entity.id || 
          route.deliveryEntities.some(delivery => delivery.id === entity.id)
        );
        
        entityContracts.forEach(route => {
          if (route.sourceEntity?.id === entity.id) {
            contractLocationNames.add(cleanLocationName(route.sourceEntity.name));
          }
          route.deliveryEntities.forEach(delivery => {
            if (delivery.id === entity.id) {
              contractLocationNames.add(cleanLocationName(delivery.name));
            }
          });
        });
      });
      
      // Convert set to array (automatically removes duplicates)
      const uniqueContractLocations = Array.from(contractLocationNames);
      
      labels.push({
        entity: highestPriorityEntity,
        priority: highestPriorityEntity.location_type,
        screenX: px,
        screenY: py,
        contractLocations: uniqueContractLocations
      });
    });
    
    return labels.sort((a, b) => a.priority - b.priority);
  }, [star, planets, planetMoons, lagrangianPoints, type6, type7, stations, type9, type10, type11, zoom, pan, scaleX, scaleY, canvasSize, contractRoutes]);

  // Handle canvas resize
  const handleResize = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCanvasSize({ width: rect.width, height: rect.height });
    }
  }, []);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  // Add wheel event listener with proper configuration to prevent passive behavior
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheelEvent = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Calculate zoom factor based on wheel direction
      const zoomFactor = e.deltaY > 0 ? 1 - ZOOM_SPEED : 1 + ZOOM_SPEED;
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * zoomFactor));
      
      if (newZoom !== zoom) {
        // Calculate the world position of the mouse cursor before zoom
        const worldX = (mouseX - pan.x) / zoom;
        const worldY = (mouseY - pan.y) / zoom;
        
        // Calculate new pan to keep the mouse cursor at the same world position
        const newPan = {
          x: mouseX - worldX * newZoom,
          y: mouseY - worldY * newZoom,
        };
        
        setZoom(newZoom);
        setPan(newPan);
      }
    };

    // Add event listener with { passive: false } to allow preventDefault
    canvas.addEventListener('wheel', handleWheelEvent, { passive: false });
    
    return () => {
      canvas.removeEventListener('wheel', handleWheelEvent);
    };
  }, [zoom, pan, ZOOM_SPEED, MIN_ZOOM, MAX_ZOOM]);

  // Load contracts from storage
  useEffect(() => {
    const loadContracts = () => {
      try {
        const records = loadFromStorage('extractedData', []);
        const statusMap = loadFromStorage('contractStatusMap', {});
        
        const contractList: ContractDisplay[] = [];
        records.forEach((rec: any) => {
          rec.objective.forEach((obj: any, objIdx: number) => {
            const id = `${rec.id}|${objIdx}`;
            const status = statusMap[id] ?? 'pending';
            contractList.push({
              id,
              recordId: rec.id,
              item: obj.item,
              source: obj.location,
              deliveries: obj.deliveries || [],
              reward: rec.reward,
              contractName: rec.contractName,
              timestamp: rec.timestamp,
              status,
            });
          });
        });
        
        setContracts(contractList);
      } catch (error) {
        console.error('Error loading contracts:', error);
      }
    };

    loadContracts();
    const interval = setInterval(loadContracts, 1000); // Update every second
    return () => clearInterval(interval);
  }, []);

  // Match contract locations with entities
  useEffect(() => {
    const matchContractRoutes = () => {
      const routes: ContractRoute[] = [];
      const stationIds = new Set<number>();
      const locationTypes = new Map<number, 'pickup' | 'dropoff' | 'both'>();
      
      contracts.forEach(contract => {
        // Clean the source location name before matching
        const cleanedSource = cleanStationNameForMatching(contract.source);
        
        // Find source location
        const sourceEntity = allEntitiesData.find(entity => 
          entity.name.toLowerCase().includes(cleanedSource.toLowerCase()) ||
          entity.key.toLowerCase().includes(cleanedSource.toLowerCase()) ||
          cleanedSource.toLowerCase().includes(entity.name.toLowerCase())
        ) || null;
        
        // Find delivery locations
        const deliveryEntities = contract.deliveries.map(delivery => {
          const cleanedDelivery = cleanStationNameForMatching(delivery.location);
          const entity = allEntitiesData.find(entity => 
            entity.name.toLowerCase().includes(cleanedDelivery.toLowerCase()) ||
            entity.key.toLowerCase().includes(cleanedDelivery.toLowerCase()) ||
            cleanedDelivery.toLowerCase().includes(entity.name.toLowerCase())
          );
          return entity;
        }).filter(Boolean) as AllEntities[];
        
        // Collect station IDs and types from contract locations
        if (sourceEntity && sourceEntity.location_type === 8) {
          stationIds.add(sourceEntity.id);
          const currentType = locationTypes.get(sourceEntity.id);
          if (currentType === 'dropoff') {
            locationTypes.set(sourceEntity.id, 'both');
          } else {
            locationTypes.set(sourceEntity.id, 'pickup');
          }
        }
        
        deliveryEntities.forEach(entity => {
          if (entity.location_type === 8) {
            stationIds.add(entity.id);
            const currentType = locationTypes.get(entity.id);
            if (currentType === 'pickup') {
              locationTypes.set(entity.id, 'both');
            } else {
              locationTypes.set(entity.id, 'dropoff');
            }
          }
        });
        
        if (sourceEntity || deliveryEntities.length > 0) {
          routes.push({
            contract,
            sourceEntity,
            deliveryEntities
          });
        }
      });
      
      setContractRoutes(routes);
      setContractStationIds(stationIds);
      setContractLocationTypes(locationTypes);
          };

    matchContractRoutes();
  }, [contracts, allEntitiesData]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;

    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    // Performance optimization: only draw elements that are visible
    const visibleBounds = {
      left: -pan.x / zoom,
      top: -pan.y / zoom,
      right: (canvasSize.width - pan.x) / zoom,
      bottom: (canvasSize.height - pan.y) / zoom,
    };

    // Draw planet orbits (only if zoomed out enough to see them) - outside zoom transformation for consistent alignment
    if (zoom < 5) {
      const centerX = scaleX(0) * zoom + pan.x;
      const centerY = scaleY(0) * zoom + pan.y;
      
      planets.forEach((planet) => {
        const px = scaleX(planet.g_coord_x) * zoom + pan.x;
        const py = scaleY(planet.g_coord_y) * zoom + pan.y;
        const dx = px - centerX;
        const dy = py - centerY;
        const orbitRadius = Math.sqrt(dx * dx + dy * dy);
        
        // Only draw if orbit is visible
        if (orbitRadius > 0 && orbitRadius < Math.max(canvasSize.width, canvasSize.height)) {
          ctx.beginPath();
          ctx.arc(centerX, centerY, orbitRadius, 0, 2 * Math.PI);
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
          ctx.lineWidth = 1;
          ctx.setLineDash([8, 8]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      });
    }

    // Draw flash arrow if active
    if (flashLocation) {
      const timeSinceFlash = Date.now() - flashLocation.timestamp;
      const flashDuration = 2000; // 2 seconds
      const alpha = Math.max(0, 1 - (timeSinceFlash / flashDuration));
      
      if (alpha > 0) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ff6b35';
        ctx.strokeStyle = '#ff6b35';
        ctx.lineWidth = 3;
        
        // Draw arrow pointing down
        const arrowSize = 20;
        const x = flashLocation.x;
        const y = flashLocation.y;
        
        ctx.beginPath();
        ctx.moveTo(x, y - arrowSize);
        ctx.lineTo(x - arrowSize/2, y);
        ctx.lineTo(x + arrowSize/2, y);
        ctx.closePath();
        ctx.fill();
        
        // Draw pulsing circle
        const pulseRadius = arrowSize + (timeSinceFlash / flashDuration) * 30;
        ctx.beginPath();
        ctx.arc(x, y, pulseRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
      }
    }

    // Draw planned route lines with arrows
    if (plannedRoute.length > 1) {
      ctx.save();
      ctx.lineWidth = 1;
      ctx.setLineDash([10, 5]); // Dashed line
      
      for (let i = 0; i < plannedRoute.length - 1; i++) {
        const currentItem = plannedRoute[i];
        const nextItem = plannedRoute[i + 1];
        
        if (currentItem.entity && nextItem.entity) {
          const currentEntity = adjustedData.find(e => e.id === currentItem.entity!.id) || currentItem.entity;
          const nextEntity = adjustedData.find(e => e.id === nextItem.entity!.id) || nextItem.entity;
          
          const currentPx = scaleX(currentEntity.g_coord_x) * zoom + pan.x;
          const currentPy = scaleY(currentEntity.g_coord_y) * zoom + pan.y;
          const nextPx = scaleX(nextEntity.g_coord_x) * zoom + pan.x;
          const nextPy = scaleY(nextEntity.g_coord_y) * zoom + pan.y;
          
          // Create gradient for this line segment
          const gradient = ctx.createLinearGradient(currentPx, currentPy, nextPx, nextPy);
          gradient.addColorStop(0, 'rgba(59, 130, 246, 0.8)'); // Dark blue at start
          gradient.addColorStop(1, 'rgba(59, 130, 246, 0.2)'); // Light blue at end
          
          // Always draw route lines regardless of visibility
          // Draw line with gradient
          ctx.strokeStyle = gradient;
          ctx.beginPath();
          ctx.moveTo(currentPx, currentPy);
          ctx.lineTo(nextPx, nextPy);
          ctx.stroke();
          
          // Draw arrow at the end of the line
          const angle = Math.atan2(nextPy - currentPy, nextPx - currentPx);
          const arrowLength = 15;
          const arrowAngle = Math.PI / 6; // 30 degrees
          
          const arrowX = nextPx - Math.cos(angle) * arrowLength;
          const arrowY = nextPy - Math.sin(angle) * arrowLength;
          
          // Use lighter color for arrows to match gradient end
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.2)';
          ctx.beginPath();
          ctx.moveTo(nextPx, nextPy);
          ctx.lineTo(arrowX - Math.cos(angle - arrowAngle) * 8, arrowY - Math.sin(angle - arrowAngle) * 8);
          ctx.moveTo(nextPx, nextPy);
          ctx.lineTo(arrowX - Math.cos(angle + arrowAngle) * 8, arrowY - Math.sin(angle + arrowAngle) * 8);
          ctx.stroke();
          
          // Draw route index number at the midpoint
          const midX = (currentPx + nextPx) / 2;
          const midY = (currentPy + nextPy) / 2;
          
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
          ctx.lineWidth = 1;
          ctx.font = 'bold 10px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          // Draw background circle for the number
          ctx.beginPath();
          ctx.arc(midX, midY, 10, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
          
          // Draw the number
          ctx.fillStyle = 'rgba(59, 130, 246, 0.8)';
          ctx.fillText((i + 1).toString(), midX, midY);
        }
      }
      
      ctx.restore();
    }

    // Draw route points (always visible)
    plannedRoute.forEach((routeItem, index) => {
      if (routeItem.entity) {
        const adjustedEntity = adjustedData.find(e => e.id === routeItem.entity!.id) || routeItem.entity;
        const px = scaleX(adjustedEntity.g_coord_x) * zoom + pan.x;
        const py = scaleY(adjustedEntity.g_coord_y) * zoom + pan.y;
        
        // Always draw route points regardless of visibility
        ctx.save();
        
        // Draw route point circle
        ctx.beginPath();
        ctx.arc(px, py, 8, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(59, 130, 246, 0.8)'; // blue with opacity
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();
        
        // Draw route number
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((index + 1).toString(), px, py);
        
        ctx.restore();
      }
    });

    // Draw Stanton star (center) - outside zoom transformation for consistent size
    star.forEach((entity) => {
      const px = scaleX(entity.g_coord_x) * zoom + pan.x;
      const py = scaleY(entity.g_coord_y) * zoom + pan.y;
      
      // Only draw if visible
      if (px >= 0 && px <= canvasSize.width && py >= 0 && py <= canvasSize.height) {
        const radius = POINT_RADIUS + 2;
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, 2 * Math.PI);
        ctx.fillStyle = '#6b7280'; // gray-500
        ctx.shadowColor = '#6b7280';
        ctx.shadowBlur = 15;
        ctx.fill();
        ctx.shadowBlur = 0;
        
      }
    });

    // Draw planets - outside zoom transformation for consistent size
    planets.forEach((entity) => {
      const px = scaleX(entity.g_coord_x) * zoom + pan.x;
      const py = scaleY(entity.g_coord_y) * zoom + pan.y;
      
      // Only draw if visible
      if (px >= 0 && px <= canvasSize.width && py >= 0 && py <= canvasSize.height) {
        const isSelected = false;
        const radius = POINT_RADIUS;
        
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, 2 * Math.PI);
        ctx.fillStyle = '#6b7280'; // gray-500
        ctx.shadowColor = '#6b7280';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
        
      }
    });

    // Draw planet moons - outside zoom transformation for consistent size
    planetMoons.forEach((entity) => {
      const px = scaleX(entity.g_coord_x) * zoom + pan.x;
      const py = scaleY(entity.g_coord_y) * zoom + pan.y;
      
      // Only draw if visible
      if (px >= 0 && px <= canvasSize.width && py >= 0 && py <= canvasSize.height) {
        const isSelected = false;
        const radius = POINT_RADIUS - 2;
        
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, 2 * Math.PI);
        ctx.fillStyle = '#6b7280'; // gray-500
        ctx.shadowColor = '#6b7280';
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
        
      }
    });

    // Draw lagrangian points - outside zoom transformation for consistent size
    lagrangianPoints.forEach((entity) => {
      const px = scaleX(entity.g_coord_x) * zoom + pan.x;
      const py = scaleY(entity.g_coord_y) * zoom + pan.y;
      
      // Only draw if visible
      if (px >= 0 && px <= canvasSize.width && py >= 0 && py <= canvasSize.height) {
        const isSelected = false;
        const radius = POINT_RADIUS - 1;
        
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, 2 * Math.PI);
        ctx.fillStyle = '#6b7280'; // gray-500
        ctx.shadowColor = '#6b7280';
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
        
      }
    });


    // Draw contract stations separately - always visible regardless of toggle state
    const contractStations = allEntitiesData.filter(entity => 
      entity.location_type === 8 && contractStationIds.has(entity.id)
    );
    
    
    contractStations.forEach((entity) => {
      // Use adjusted coordinates (relative to star) like other entities
      const adjustedEntity = adjustedData.find(e => e.id === entity.id) || entity;
      const px = scaleX(adjustedEntity.g_coord_x) * zoom + pan.x;
      const py = scaleY(adjustedEntity.g_coord_y) * zoom + pan.y;
      
      // Only draw if visible
      if (px >= 0 && px <= canvasSize.width && py >= 0 && py <= canvasSize.height) {
        const isContractStation = contractStationIds.has(entity.id);
        const contractType = contractLocationTypes.get(entity.id);
        
        const radius = POINT_RADIUS + 2; // Make contract stations larger
        
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, 2 * Math.PI);
        
        // Highlight contract stations with different colors based on type
        if (isContractStation) {
          if (contractType === 'both') {
            // Draw half red, half green for both pickup and dropoff
            ctx.fillStyle = '#ef4444'; // red-500
            ctx.fill();
            ctx.beginPath();
            ctx.arc(px, py, radius, Math.PI / 2, (3 * Math.PI) / 2);
            ctx.fillStyle = '#10b981'; // emerald-500
            ctx.fill();
          } else if (contractType === 'pickup') {
            ctx.fillStyle = '#10b981'; // emerald-500
            ctx.shadowColor = '#10b981';
            ctx.shadowBlur = 20;
          } else if (contractType === 'dropoff') {
            ctx.fillStyle = '#ef4444'; // red-500
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 20;
          }
        } else {
          ctx.fillStyle = '#ffffff'; // white
          ctx.shadowColor = '#ffffff';
          ctx.shadowBlur = 6;
        }
        
        if (!isContractStation || contractType !== 'both') {
          ctx.fill();
        }
        ctx.shadowBlur = 0;
        
        // Add contract station indicator ring - always visible
        if (isContractStation) {
          if (contractType === 'both') {
            // Draw half green, half red ring
            ctx.beginPath();
            ctx.arc(px, py, radius + 3, -Math.PI / 2, Math.PI / 2); // Top half (green)
            ctx.strokeStyle = '#10b981'; // emerald-500
            ctx.lineWidth = 3;
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(px, py, radius + 3, Math.PI / 2, (3 * Math.PI) / 2); // Bottom half (red)
            ctx.strokeStyle = '#ef4444'; // red-500
            ctx.lineWidth = 3;
            ctx.stroke();
          } else {
            // Draw single color ring
            ctx.beginPath();
            ctx.arc(px, py, radius + 3, 0, 2 * Math.PI);
            ctx.strokeStyle = contractType === 'pickup' ? '#10b981' : '#ef4444';
            ctx.lineWidth = 3;
            ctx.stroke();
          }
        }
      }
    });

    // Draw stations - outside zoom transformation for consistent size
    stations.forEach((entity) => {
      // Skip contract stations as they're drawn separately
      if (contractStationIds.has(entity.id)) {
        return;
      }
      
      const px = scaleX(entity.g_coord_x) * zoom + pan.x;
      const py = scaleY(entity.g_coord_y) * zoom + pan.y;
      
      // Only draw if visible
      if (px >= 0 && px <= canvasSize.width && py >= 0 && py <= canvasSize.height) {
        const radius = POINT_RADIUS - 1;
        
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, 2 * Math.PI);
        ctx.fillStyle = '#6b7280'; // gray-500
        ctx.shadowColor = '#6b7280';
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    // Draw type6 entities - outside zoom transformation for consistent size
    type6.forEach((entity) => {
      const px = scaleX(entity.g_coord_x) * zoom + pan.x;
      const py = scaleY(entity.g_coord_y) * zoom + pan.y;
      
      // Only draw if visible
      if (px >= 0 && px <= canvasSize.width && py >= 0 && py <= canvasSize.height) {
        const radius = POINT_RADIUS - 1;
        
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, 2 * Math.PI);
        ctx.fillStyle = '#6b7280'; // gray-500
        ctx.shadowColor = '#6b7280';
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    // Draw type7 entities - outside zoom transformation for consistent size
    type7.forEach((entity) => {
      const px = scaleX(entity.g_coord_x) * zoom + pan.x;
      const py = scaleY(entity.g_coord_y) * zoom + pan.y;
      
      // Only draw if visible
      if (px >= 0 && px <= canvasSize.width && py >= 0 && py <= canvasSize.height) {
        const radius = POINT_RADIUS - 1;
        
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, 2 * Math.PI);
        ctx.fillStyle = '#6b7280'; // gray-500
        ctx.shadowColor = '#6b7280';
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    // Draw type9 entities - outside zoom transformation for consistent size
    type9.forEach((entity) => {
      const px = scaleX(entity.g_coord_x) * zoom + pan.x;
      const py = scaleY(entity.g_coord_y) * zoom + pan.y;
      
      // Only draw if visible
      if (px >= 0 && px <= canvasSize.width && py >= 0 && py <= canvasSize.height) {
        const radius = POINT_RADIUS - 1;
        
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, 2 * Math.PI);
        ctx.fillStyle = '#6b7280'; // gray-500
        ctx.shadowColor = '#6b7280';
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    // Draw type10 entities - outside zoom transformation for consistent size
    type10.forEach((entity) => {
      const px = scaleX(entity.g_coord_x) * zoom + pan.x;
      const py = scaleY(entity.g_coord_y) * zoom + pan.y;
      
      // Only draw if visible
      if (px >= 0 && px <= canvasSize.width && py >= 0 && py <= canvasSize.height) {
        const radius = POINT_RADIUS - 1;
        
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, 2 * Math.PI);
        ctx.fillStyle = '#6b7280'; // gray-500
        ctx.shadowColor = '#6b7280';
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    // Draw type11 entities - outside zoom transformation for consistent size
    type11.forEach((entity) => {
      const px = scaleX(entity.g_coord_x) * zoom + pan.x;
      const py = scaleY(entity.g_coord_y) * zoom + pan.y;
      
      // Only draw if visible
      if (px >= 0 && px <= canvasSize.width && py >= 0 && py <= canvasSize.height) {
        const radius = POINT_RADIUS - 1;
        
        ctx.beginPath();
        ctx.arc(px, py, radius, 0, 2 * Math.PI);
        ctx.fillStyle = '#6b7280'; // gray-500
        ctx.shadowColor = '#6b7280';
        ctx.shadowBlur = 6;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    // Draw clustered labels
    const clusteredLabels = getClusteredLabels();
    clusteredLabels.forEach(({ entity, screenX, screenY, contractLocations }) => {
      const radius = entity.location_type === 0 ? POINT_RADIUS + 2 : 
                   entity.location_type === 1 ? POINT_RADIUS :
                   entity.location_type === 2 ? POINT_RADIUS - 2 :
                   entity.location_type === 4 ? POINT_RADIUS - 1 :
                   entity.location_type === 6 ? POINT_RADIUS - 1 :
                   entity.location_type === 7 ? POINT_RADIUS - 1 :
                   entity.location_type === 8 ? POINT_RADIUS - 1 :
                   entity.location_type === 9 ? POINT_RADIUS - 1 :
                   entity.location_type === 10 ? POINT_RADIUS - 1 :
                   entity.location_type === 11 ? POINT_RADIUS - 1 :
                   POINT_RADIUS - 1; // default
      
      // Set label color to neutral gray for all entity types
      const labelColors = {
        0: '#6b7280', // stars - gray
        1: '#6b7280', // planets - gray
        2: '#6b7280', // moons - gray
        4: '#6b7280', // lagrangian - gray
        6: '#6b7280', // type 6 - gray
        7: '#6b7280', // type 7 - gray
        8: '#6b7280', // stations - gray
        9: '#6b7280', // type 9 - gray
        10: '#6b7280', // type 10 - gray
        11: '#6b7280', // type 11 - gray
      };
      
      const fontSize = entity.location_type === 0 ? '14px' :
                      entity.location_type === 1 ? '12px' :
                      entity.location_type === 2 ? '11px' :
                      entity.location_type === 4 ? '10px' :
                      entity.location_type === 6 ? '10px' :
                      entity.location_type === 7 ? '10px' :
                      entity.location_type === 8 ? '10px' :
                      entity.location_type === 9 ? '10px' :
                      entity.location_type === 10 ? '10px' :
                      entity.location_type === 11 ? '10px' :
                      '10px'; // default
      
      const contractFontSize = '9px';
      const lineHeight = 14;
      
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      
      // Draw main entity name
      ctx.fillStyle = labelColors[entity.location_type as keyof typeof labelColors] || '#6b7280';
      ctx.font = fontSize + ' Arial';
      ctx.fillText(cleanLocationName(entity.name), screenX, screenY + radius + 12);
      
      // Draw contract locations if any
      if (contractLocations.length > 0) {
        ctx.font = contractFontSize + ' Arial';
        ctx.fillStyle = '#9ca3af'; // lighter gray for contract info
        
        contractLocations.forEach((contractLocation, index) => {
          const yOffset = screenY + radius + 12 + (parseInt(fontSize) + 6) + (index * lineHeight);
          ctx.fillText(contractLocation, screenX, yOffset);
        });
      }
    });

  }, [adjustedData, star, planets, planetMoons, lagrangianPoints, type6, type7, stations, type9, type10, type11, scaleX, scaleY, canvasSize, pan, zoom, contractStationIds, contractLocationTypes, flashLocation, getClusteredLabels, plannedRoute]);

  // Convert screen coordinates to world coordinates
  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    return {
      x: (screenX - pan.x) / zoom,
      y: (screenY - pan.y) / zoom,
    };
  }, [pan, zoom]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    if (isDragging) {
      const deltaX = mouseX - lastMousePos.x;
      const deltaY = mouseY - lastMousePos.y;
      setPan(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY,
      }));
      setLastMousePos({ x: mouseX, y: mouseY });
      return;
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button === 0) { // Left mouse button
      setIsDragging(true);
      setLastMousePos({ x: e.clientX - e.currentTarget.getBoundingClientRect().left, y: e.clientY - e.currentTarget.getBoundingClientRect().top });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };



  const flashLocationOnMap = (locationName: string) => {
    // Clean the location name before matching
    const cleanedLocation = cleanStationNameForMatching(locationName);
    
    const entity = stantonData.find(entity => 
      entity.name.toLowerCase().includes(cleanedLocation.toLowerCase()) ||
      entity.key.toLowerCase().includes(cleanedLocation.toLowerCase()) ||
      cleanedLocation.toLowerCase().includes(entity.name.toLowerCase())
    );
    
    if (entity) {
      const adjustedEntity = adjustedData.find(e => e.id === entity.id);
      if (adjustedEntity) {
        const px = scaleX(adjustedEntity.g_coord_x) * zoom + pan.x;
        const py = scaleY(adjustedEntity.g_coord_y) * zoom + pan.y;
        
        // Flash arrow at location
        setFlashLocation({ x: px, y: py, timestamp: Date.now() });
        
        // Clear flash after 2 seconds
        setTimeout(() => {
          setFlashLocation(null);
        }, 2000);
        
        // Clear any previous error
        setLocationError(null);
      }
    } else {
      // Show error message if location not found
      setLocationError(`Location "${locationName}" not found in Stanton system`);
      
      // Auto-hide error after 5 seconds
      setTimeout(() => {
        setLocationError(null);
      }, 5000);
    }
  };

  // Route planning functions
  const findEntityByName = (locationName: string): AllEntities | null => {
    const cleanedLocation = cleanStationNameForMatching(locationName);
    return allEntitiesData.find(entity => 
      entity.name.toLowerCase().includes(cleanedLocation.toLowerCase()) ||
      entity.key.toLowerCase().includes(cleanedLocation.toLowerCase()) ||
      cleanedLocation.toLowerCase().includes(entity.name.toLowerCase())
    ) || null;
  };

  const updatePlannedRoute = () => {
    const route: Array<{ location: string; entity: AllEntities | null }> = [];
    
    // Add current location if specified
    if (currentLocation.trim()) {
      route.push({ location: currentLocation, entity: findEntityByName(currentLocation) });
    }
    
    // Add route stops
    routeStops.forEach(stop => {
      if (stop.trim()) {
        route.push({ location: stop, entity: findEntityByName(stop) });
      }
    });
    
    setPlannedRoute(route);
  };

  const addRouteStop = () => {
    setRouteStops(prev => [...prev, '']);
  };

  const removeRouteStop = (index: number) => {
    setRouteStops(prev => prev.filter((_, i) => i !== index));
  };

  const updateRouteStop = (index: number, value: string) => {
    setRouteStops(prev => prev.map((stop, i) => i === index ? value : stop));
  };


  // Get cargo information for a location
  const getCargoForLocation = (locationName: string) => {
    const cleanedLocation = cleanStationNameForMatching(locationName);
    const cargo = { pickup: [] };
    
    contractRoutes.forEach(route => {
      // Check if this location is a pickup point
      if (route.sourceEntity && 
          (route.sourceEntity.name.toLowerCase().includes(cleanedLocation.toLowerCase()) ||
           cleanedLocation.toLowerCase().includes(route.sourceEntity.name.toLowerCase()))) {
        // Calculate total SCU for pickup from all deliveries
        const totalSCU = route.contract.deliveries.reduce((sum, delivery) => sum + delivery.quantity, 0);
        cargo.pickup.push({
          item: route.contract.item,
          quantity: 1, // Assuming 1 unit per contract for now
          scu: totalSCU
        });
      }
    });
    
    return cargo;
  };

  // Calculate SCU usage and automatically maintain ship inventory
  const calculateSCUUsage = () => {
    return inventoryManager.current.calculateSCUUsage(routeStops, cargoSpace, getCargoForLocation);
  };

  const getCurrentShipSCU = () => {
    return inventoryManager.current.getCurrentShipSCU();
  };

  // Cargo selection management functions
  const getCargoSelection = (location: string) => {
    return inventoryManager.current.getCargoSelection(location, getCargoForLocation);
  };

  const toggleCargoSelection = (location: string, item: string, type: 'pickup') => {
    inventoryManager.current.toggleCargoSelection(location, item, type);
  };


  // Drag and drop functions
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      const newRouteStops = [...routeStops];
      const draggedItem = newRouteStops[draggedIndex];
      
      // Remove the dragged item
      newRouteStops.splice(draggedIndex, 1);
      
      // Insert at new position
      const adjustedDropIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
      newRouteStops.splice(adjustedDropIndex, 0, draggedItem);
      
      setRouteStops(newRouteStops);
    }
    
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Update planned route when dependencies change
  useEffect(() => {
    updatePlannedRoute();
  }, [currentLocation, routeStops, allEntitiesData]);

  // Get all available locations for autocomplete
  const getAllLocations = () => {
    return allEntitiesData.map(entity => cleanLocationName(entity.name));
  };

  // Get contract locations for autocomplete
  const getContractLocations = () => {
    const locations = new Set<string>();
    contractRoutes.forEach(route => {
      if (route.sourceEntity) {
        locations.add(cleanLocationName(route.sourceEntity.name));
      }
      route.deliveryEntities.forEach(entity => {
        locations.add(cleanLocationName(entity.name));
      });
    });
    return Array.from(locations);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800">
      <Navbar />
      <div className="flex w-full h-[calc(100vh-5rem)] overflow-hidden">
        {/* Route Planning Sidebar */}
        <div className="w-80 bg-gray-800/50 backdrop-blur-sm border-r border-gray-700 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 border-b border-gray-700">
              <h2 className="text-lg font-bold text-white mb-4">Route Planner</h2>
              
              {/* Current Location */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">Current Location</label>
                <input
                  type="text"
                  value={currentLocation}
                  onChange={(e) => setCurrentLocation(e.target.value)}
                  placeholder="Enter current location..."
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  list="all-locations"
                />
                <datalist id="all-locations">
                  {getAllLocations().map((location, index) => (
                    <option key={index} value={location} />
                  ))}
                </datalist>
              </div>

              {/* Cargo Space */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">Cargo Space (SCU)</label>
                <input
                  type="number"
                  value={cargoSpace}
                  onChange={(e) => setCargoSpace(Number(e.target.value))}
                  placeholder="0"
                  min="0"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Ship Inventory */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-300">Initial Ship Inventory</label>
                  <span className="text-xs text-gray-400">
                    {getCurrentShipSCU()}/{cargoSpace} SCU
                  </span>
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {Array.from(shipInventory.entries()).map(([item, data]) => (
                    <div key={item} className="bg-gray-700/50 rounded p-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-white">{item}</span>
                        <span className="text-xs text-gray-400">({data.scu} SCU each)</span>
                      </div>
                      <div className="text-xs text-gray-300">Qty: {data.quantity}</div>
                    </div>
                  ))}
                  {shipInventory.size === 0 && (
                    <div className="text-center text-gray-400 text-xs py-2">
                      No initial cargo on ship
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Route Stops */}
            <div className="p-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Route Stops</label>
              <div className="space-y-3">
                {routeStops.map((stop, index) => {
                  const scuUsage = calculateSCUUsage();
                  const currentStopCargo = scuUsage[index] || { 
                    current: 0, 
                    total: cargoSpace, 
                    pickup: [], 
                    beforePickup: 0, 
                    beforeStop: 0, 
                    inventoryAtStop: new Map() 
                  };
                  
                  return (
                    <div 
                      key={index} 
                      className={`p-3 rounded-lg transition-colors ${
                        draggedIndex === index ? 'bg-blue-600/20 opacity-50' : 
                        dragOverIndex === index ? 'bg-blue-500/20' : 
                        'bg-gray-700/50 hover:bg-gray-700/70'
                      }`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                    >
                      {/* Top row: Drag handle, route number, input, remove button */}
                      <div className="flex items-center gap-2 mb-2">
                        {/* Drag Handle */}
                        <div className="flex flex-col cursor-move text-gray-400 hover:text-gray-300">
                          <div className="w-1 h-1 bg-current rounded-full"></div>
                          <div className="w-1 h-1 bg-current rounded-full"></div>
                          <div className="w-1 h-1 bg-current rounded-full"></div>
                          <div className="w-1 h-1 bg-current rounded-full"></div>
                        </div>
                        
                        {/* Route Number */}
                        <div className="flex items-center justify-center w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full">
                          {index + 1}
                        </div>
                        
                        {/* Input Field */}
                        <input
                          type="text"
                          value={stop}
                          onChange={(e) => updateRouteStop(index, e.target.value)}
                          placeholder="Enter destination..."
                          className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          list={`contract-locations-${index}`}
                        />
                        <datalist id={`contract-locations-${index}`}>
                          {getContractLocations().map((location, idx) => (
                            <option key={idx} value={location} />
                          ))}
                        </datalist>
                        
                        {/* Remove Button */}
                        {routeStops.length > 1 && (
                          <button
                            onClick={() => removeRouteStop(index)}
                            className="px-2 py-1 text-red-400 hover:text-red-300 transition-colors"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      
                      {/* Cargo Information */}
                      <div className="ml-8 space-y-1">
                        {/* SCU Usage */}
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-gray-400">SCU:</span>
                          <span className={`font-medium ${
                            currentStopCargo.current > currentStopCargo.total ? 'text-red-400' : 'text-green-400'
                          }`}>
                            {currentStopCargo.current}/{currentStopCargo.total}
                          </span>
                          {currentStopCargo.beforePickup !== undefined && currentStopCargo.beforePickup !== currentStopCargo.current && (
                            <span className="text-gray-500">
                              (was {currentStopCargo.beforePickup})
                            </span>
                          )}
                        </div>
                        
                        {/* Available Pickup Cargo */}
                        {getCargoForLocation(stop).pickup.length > 0 && (
                          <div className="text-xs">
                            <span className="text-green-400">📦 Available Pickup:</span>
                            <div className="ml-2 space-y-0.5">
                              {getCargoForLocation(stop).pickup.map((item, itemIndex) => {
                                const selections = getCargoSelection(stop);
                                const isSelected = selections.pickup.get(item.item) || false;
                                
                                return (
                                  <div key={itemIndex} className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleCargoSelection(stop, item.item, 'pickup')}
                                      className="w-3 h-3 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500 focus:ring-1"
                                    />
                                    <span className="text-xs text-gray-300">
                                      {item.item} ({item.scu} SCU) - Pickup {item.quantity}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        
                        {/* Pickup Cargo */}
                        {currentStopCargo.pickup.length > 0 && (
                          <div className="text-xs">
                            <span className="text-green-400">📦 Pickup:</span>
                            <div className="ml-2 space-y-0.5">
                              {currentStopCargo.pickup.map((item, itemIndex) => (
                                <div key={itemIndex} className="flex items-center gap-2">
                                  <span className="text-xs text-gray-300">
                                    {item.item} ({item.quantity} SCU)
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Inventory After This Stop */}
                        {currentStopCargo.inventoryAtStop && currentStopCargo.inventoryAtStop.size > 0 && (
                          <div className="text-xs">
                            <span className="text-blue-400">📋 Inventory After:</span>
                            <div className="ml-2 space-y-0.5">
                              {Array.from(currentStopCargo.inventoryAtStop.entries()).map(([item, data]) => (
                                <div key={item} className="text-gray-300">
                                  {item}: {data.quantity} SCU
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <button
                  onClick={addRouteStop}
                  className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  + Add Stop
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Contracts Sidebar */}
        <div className="w-80 bg-gray-800/50 backdrop-blur-sm border-r border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-bold text-white mb-2">Contracts</h2>
            <div className="text-sm text-gray-300">
              {contracts.length} active contracts
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {(() => {
              // Group contracts by their record ID (extract from contract.id)
              const groupedContracts = contracts.reduce((groups, contract) => {
                const recordId = contract.id.split('|')[0]; // Extract record ID from "recordId|objIdx" format
                if (!groups[recordId]) {
                  groups[recordId] = [];
                }
                groups[recordId].push(contract);
                return groups;
              }, {} as { [key: string]: typeof contracts });

              return Object.entries(groupedContracts).map(([recordId, contractGroup]) => {
                const firstContract = contractGroup[0];
                const totalReward = firstContract.reward;
                const totalSCU = contractGroup.reduce((total, contract) => {
                  const contractSCU = contract.deliveries.reduce((sum, delivery) => {
                    return sum + delivery.quantity;
                  }, 0);
                  return total + contractSCU;
                }, 0);

                return (
                  <div key={recordId} className="bg-gray-700/50 rounded-lg p-3 border border-gray-600">
                    {/* Group Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {firstContract.contractName && (
                          <span className="text-white font-medium text-xs">{firstContract.contractName}</span>
                        )}
                        <span className="text-green-400 font-semibold text-xs">
                          {totalReward >= 1000 ? `${Math.round(totalReward / 1000)}k` : totalReward} aUEC
                        </span>
                        <span className="text-blue-400 font-semibold text-xs">{totalSCU} SCU</span>
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                          firstContract.status === 'pending' ? 'bg-yellow-600 text-yellow-100' :
                          firstContract.status === 'in-progress' ? 'bg-blue-600 text-blue-100' :
                          firstContract.status === 'completed' ? 'bg-green-600 text-green-100' :
                          'bg-red-600 text-red-100'
                        }`}>
                          {firstContract.status}
                        </span>
                      </div>
                    </div>
                    
                    {/* All contracts in this group */}
                    <div className="space-y-2">
                      {contractGroup.map((contract) => (
                        <div key={contract.id} className="text-xs text-gray-300">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            <span 
                              className="cursor-pointer hover:text-emerald-400 transition-colors"
                              onClick={() => flashLocationOnMap(contract.source)}
                            >
                              Pickup: {contract.source}
                            </span>
                          </div>
                          {/* Pickup Items */}
                          <div className="ml-4 mb-1">
                            <span className="text-emerald-400 font-medium">📦 {contract.item} ({contract.deliveries.reduce((sum, delivery) => sum + delivery.quantity, 0)} SCU)</span>
                          </div>
                          {contract.deliveries.map((delivery, idx) => (
                            <div key={idx}>
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                <span 
                                  className="cursor-pointer hover:text-red-400 transition-colors"
                                  onClick={() => flashLocationOnMap(delivery.location)}
                                >
                                  Dropoff: {delivery.location}
                                </span>
                              </div>
                              {/* Dropoff Items */}
                              <div className="ml-4">
                                <span className="text-red-400 font-medium">🚚 {contract.item} ({delivery.quantity} SCU)</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              });
            })()}
            {contracts.length === 0 && (
              <div className="text-center text-gray-400 py-8">
                No contracts available
              </div>
            )}
          </div>
        </div>
        
        {/* Main Map Area */}
        <div className="flex-1 flex flex-col">
          {/* Error Message */}
          {locationError && (
            <div className="flex-shrink-0 p-3 bg-red-600/90 backdrop-blur-sm border-b border-red-500">
              <div className="flex items-center justify-center">
                <div className="flex items-center gap-2 text-white">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">{locationError}</span>
                </div>
                <button
                  onClick={() => setLocationError(null)}
                  className="ml-4 text-red-200 hover:text-white transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          )}
      <div className="flex-shrink-0 p-4 text-center bg-gray-900/50 backdrop-blur-sm">
        <h1 className="text-2xl font-bold text-white mb-2">Stanton System Map</h1>
        <div className="flex items-center justify-center gap-4 mb-2">
          <button
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
            className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors duration-200"
          >
            Reset View
          </button>
          <div className="text-xs text-gray-300">
            Zoom: {(zoom * 100).toFixed(0)}% | Pan: ({pan.x.toFixed(0)}, {pan.y.toFixed(0)})
          </div>
        </div>
        <div className="flex flex-wrap gap-4 justify-center text-xs text-gray-300">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={locationTypeToggles[0]}
              onChange={() => setLocationTypeToggles(prev => ({ ...prev, 0: !prev[0] }))}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
            />
            <span>Star</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={locationTypeToggles[1]}
              onChange={() => setLocationTypeToggles(prev => ({ ...prev, 1: !prev[1] }))}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
            />
            <span>Planets</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={locationTypeToggles[2]}
              onChange={() => setLocationTypeToggles(prev => ({ ...prev, 2: !prev[2] }))}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
            />
            <span>Moons</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={locationTypeToggles[4]}
              onChange={() => setLocationTypeToggles(prev => ({ ...prev, 4: !prev[4] }))}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
            />
            <span>Lagrangian</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={locationTypeToggles[5]}
              onChange={() => setLocationTypeToggles(prev => ({ ...prev, 5: !prev[5] }))}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
            />
            <span>Cities</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={locationTypeToggles[8]}
              onChange={() => setLocationTypeToggles(prev => ({ ...prev, 8: !prev[8] }))}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
            />
            <span>Stations</span>
          </label>
        </div>
      </div>
      
      <div 
        ref={containerRef}
        className="flex-1 relative w-full h-full overflow-hidden bg-gray-900"
      >
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className="block w-full h-full bg-gray-800 cursor-grab active:cursor-grabbing"
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        />
      </div>
      
        </div>
      </div>
      <Toaster />
      <Sonner />
    </div>
  );
};

export default RoutesPage;
