import React, { useRef, useEffect, useState } from 'react';
import { data as containerData, planets } from '@/data/ContainerData';

export type ContainerData = {
  System: string;
  ObjectContainer: string;
  InternalName: string;
  Type: string;
  XCoord: number;
  YCoord: number;
  ZCoord: number;
};

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const POINT_RADIUS = 7;
const CANVAS_PADDING = 40;

const getMinMax = (data: ContainerData[], key: keyof ContainerData) => {
  const values = data.map((d) => d[key] as number);
  return { min: Math.min(...values), max: Math.max(...values) };
};

const RoutesPage = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hovered, setHovered] = useState<null | { x: number; y: number; data: ContainerData }>(null);
  const [selectedSystem, setSelectedSystem] = useState<'Stanton' | 'Pyro'>('Stanton');
  const [selectedPoints, setSelectedPoints] = useState<ContainerData[]>([]);

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    // Draw planet orbits
    if (planetObjects.length > 0 && adjustedData.length > 0) {
      // Calculate system center (now always 0,0)
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
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.2)'; // Tailwind blue-500, transparent
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.closePath();
      });
    }
    adjustedData.forEach((point) => {
      ctx.beginPath();
      ctx.arc(scaleX(point.XCoord), scaleY(point.YCoord), POINT_RADIUS, 0, 2 * Math.PI);
      // Highlight selected points
      const isSelected = selectedPoints.some(sel => sel.InternalName === point.InternalName);
      ctx.fillStyle = isSelected ? '#f59e42' : '#3b82f6'; // orange-400 or blue-500
      ctx.shadowColor = '#60a5fa'; // Tailwind blue-400
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.closePath();
    });
  }, [adjustedData, planetObjects, selectedPoints]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    let found = null;
    for (const point of adjustedData) {
      const px = scaleX(point.XCoord);
      const py = scaleY(point.YCoord);
      if (Math.hypot(mouseX - px, mouseY - py) < POINT_RADIUS + 3) {
        found = { x: px, y: py, data: point };
        break;
      }
    }
    setHovered(found);
  };

  const handleMouseLeave = () => setHovered(null);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    let clicked = null;
    for (const point of adjustedData) {
      const px = scaleX(point.XCoord);
      const py = scaleY(point.YCoord);
      if (Math.hypot(mouseX - px, mouseY - py) < POINT_RADIUS + 3) {
        clicked = point;
        break;
      }
    }
    if (clicked) {
      // Find original data for this point
      const orig = filteredData.find(d => d.InternalName === clicked.InternalName);
      if (!orig) return;
      setSelectedPoints(prev => {
        if (prev.some(sel => sel.InternalName === orig.InternalName)) {
          // Deselect if already selected
          return prev.filter(sel => sel.InternalName !== orig.InternalName);
        }
        if (prev.length === 2) {
          return [prev[1], orig];
        }
        return [...prev, orig];
      });
    }
  };

  let distance = null;
  if (selectedPoints.length === 2) {
    const [a, b] = selectedPoints;
    const dx = a.XCoord - b.XCoord;
    const dy = a.YCoord - b.YCoord;
    distance = Math.sqrt(dx * dx + dy * dy);
  }

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
            <div className="text-xs text-gray-500">({hovered.data.XCoord}, {hovered.data.YCoord})</div>
          </div>
        )}
      </div>
      <div className="mt-6 text-gray-300 text-lg font-semibold">Object Container Map</div>
      {selectedPoints.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 items-center justify-center">
          {selectedPoints.map((p, i) => (
            <span key={p.InternalName} className="inline-flex items-center px-3 py-1 rounded-full bg-orange-400 text-white font-semibold text-xs shadow">
              {p.ObjectContainer}
            </span>
          ))}
        </div>
      )}
      {distance && (
        <div className="mt-2 px-4 py-2 rounded-lg bg-blue-700 text-white font-bold text-lg shadow border border-blue-400 animate-fade-in">
          Distance: {distance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </div>
      )}
    </div>
  );
};

export default RoutesPage;
