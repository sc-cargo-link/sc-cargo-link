import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { loadFromStorage, saveToStorage } from '@/lib/storage';

interface VideoZoneSelectorProps {
  captureActive: boolean;
  onZonesChange?: (zones: any) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
}

const VideoZoneSelector: React.FC<VideoZoneSelectorProps> = ({ captureActive, onZonesChange, videoRef }) => {
  const [zones, setZones] = useState(() => loadFromStorage('userZones', {
    reward: { x: 0, y: 0, width: 100, height: 50 },
    objective: { x: 0, y: 0, width: 100, height: 50 },
    contractName: { x: 0, y: 0, width: 200, height: 30 }
  }));
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentZoneType, setCurrentZoneType] = useState<string | null>(null);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [videoScale, setVideoScale] = useState({ scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panningZone, setPanningZone] = useState<string | null>(null);
  const [panStartPoint, setPanStartPoint] = useState({ x: 0, y: 0 });
  const zoneCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => { if (onZonesChange) onZonesChange(zones); }, [zones]);
  
  // Save zones to localStorage when they change
  useEffect(() => {
    saveToStorage('userZones', zones);
  }, [zones]);

  const startDrawing = (type: string) => {
    setCurrentZoneType(type);
    if (zoneCanvasRef.current) {
      zoneCanvasRef.current.style.pointerEvents = 'auto';
    }
  };

  const updateCanvasAndVideoScale = () => {
    if (!videoRef.current || !zoneCanvasRef.current) return;
    const video = videoRef.current;
    const canvas = zoneCanvasRef.current;
    const videoRect = video.getBoundingClientRect();
    canvas.width = videoRect.width;
    canvas.height = videoRect.height;
    const videoAspect = video.videoWidth / video.videoHeight;
    const containerAspect = canvas.width / canvas.height;
    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;
    if (containerAspect > videoAspect) {
      scale = canvas.height / video.videoHeight;
      offsetX = (canvas.width - (video.videoWidth * scale)) / 2;
    } else {
      scale = canvas.width / video.videoWidth;
      offsetY = (canvas.height - (video.videoHeight * scale)) / 2;
    }
    setVideoScale({ scaleX: scale, scaleY: scale, offsetX, offsetY });
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.lineWidth = 2;
    Object.entries(zones).forEach(([type, zone]) => {
      let strokeColor, fillColor;
      if (type === 'reward') {
        strokeColor = '#22c55e';
        fillColor = '#22c55e33';
      } else if (type === 'objective') {
        strokeColor = '#3b82f6';
        fillColor = '#3b82f633';
      } else if (type === 'contractName') {
        strokeColor = '#a855f7';
        fillColor = '#a855f733';
      }
      context.strokeStyle = strokeColor;
      context.fillStyle = fillColor;
      const scaledX = zone.x * scale + offsetX;
      const scaledY = zone.y * scale + offsetY;
      const scaledWidth = zone.width * scale;
      const scaledHeight = zone.height * scale;
      context.fillRect(scaledX, scaledY, scaledWidth, scaledHeight);
      context.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);
    });
  };

  useEffect(() => {
    if (videoRef.current && zoneCanvasRef.current) {
      const video = videoRef.current;
      const handleVideoMetadata = () => { updateCanvasAndVideoScale(); };
      video.addEventListener('loadedmetadata', handleVideoMetadata);
      const resizeObserver = new ResizeObserver(updateCanvasAndVideoScale);
      resizeObserver.observe(video);
      return () => {
        video.removeEventListener('loadedmetadata', handleVideoMetadata);
        resizeObserver.disconnect();
      };
    }
  }, [zones]);

  const canvasToVideoCoordinates = (canvasX: number, canvasY: number) => {
    const { scaleX, scaleY, offsetX, offsetY } = videoScale;
    return {
      x: Math.round((canvasX - offsetX) / scaleX),
      y: Math.round((canvasY - offsetY) / scaleY)
    };
  };

  const isPointInZone = (point: { x: number; y: number }, zone: { x: number; y: number; width: number; height: number }) => {
    return point.x >= zone.x && 
           point.x <= zone.x + zone.width && 
           point.y >= zone.y && 
           point.y <= zone.y + zone.height;
  };

  const findZoneAtPoint = (point: { x: number; y: number }) => {
    for (const [type, zone] of Object.entries(zones)) {
      if (isPointInZone(point, zone)) {
        return type;
      }
    }
    return null;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!videoRef.current) return;
    const canvas = zoneCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const videoCoords = canvasToVideoCoordinates(x, y);
    
    // Check if we're clicking on an existing zone for panning
    const clickedZone = findZoneAtPoint(videoCoords);
    
    if (clickedZone && !currentZoneType) {
      // Start panning the existing zone
      setIsPanning(true);
      setPanningZone(clickedZone);
      setPanStartPoint(videoCoords);
    } else if (currentZoneType) {
      // Start drawing a new zone
      setStartPoint(videoCoords);
      setIsDrawing(true);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!videoRef.current) return;
    const canvas = zoneCanvasRef.current!;
    const context = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    const currentVideoCoords = canvasToVideoCoordinates(currentX, currentY);
    
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.lineWidth = 2;
    
    if (isPanning && panningZone) {
      // Handle panning - move the zone
      const deltaX = currentVideoCoords.x - panStartPoint.x;
      const deltaY = currentVideoCoords.y - panStartPoint.y;
      
      const updatedZones = { ...zones };
      const zone = updatedZones[panningZone];
      updatedZones[panningZone] = {
        ...zone,
        x: zone.x + deltaX,
        y: zone.y + deltaY
      };
      
      // Render all zones with the updated position
      Object.entries(updatedZones).forEach(([type, zone]) => {
        let strokeColor, fillColor;
        if (type === 'reward') {
          strokeColor = '#22c55e';
          fillColor = '#22c55e33';
        } else if (type === 'objective') {
          strokeColor = '#3b82f6';
          fillColor = '#3b82f633';
        } else if (type === 'contractName') {
          strokeColor = '#a855f7';
          fillColor = '#a855f733';
        }
        context.strokeStyle = strokeColor;
        context.fillStyle = fillColor;
        const { scaleX, scaleY, offsetX, offsetY } = videoScale;
        const scaledX = zone.x * scaleX + offsetX;
        const scaledY = zone.y * scaleY + offsetY;
        const scaledWidth = zone.width * scaleX;
        const scaledHeight = zone.height * scaleY;
        context.fillRect(scaledX, scaledY, scaledWidth, scaledHeight);
        context.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);
      });
      
      setPanStartPoint(currentVideoCoords);
    } else if (isDrawing && currentZoneType) {
      // Handle drawing - show preview of new zone
      Object.entries(zones).forEach(([type, zone]) => {
        if (type !== currentZoneType) {
          let strokeColor, fillColor;
          if (type === 'reward') {
            strokeColor = '#22c55e';
            fillColor = '#22c55e33';
          } else if (type === 'objective') {
            strokeColor = '#3b82f6';
            fillColor = '#3b82f633';
          } else if (type === 'contractName') {
            strokeColor = '#a855f7';
            fillColor = '#a855f733';
          }
          context.strokeStyle = strokeColor;
          context.fillStyle = fillColor;
          const { scaleX, scaleY, offsetX, offsetY } = videoScale;
          const scaledX = zone.x * scaleX + offsetX;
          const scaledY = zone.y * scaleY + offsetY;
          const scaledWidth = zone.width * scaleX;
          const scaledHeight = zone.height * scaleY;
          context.fillRect(scaledX, scaledY, scaledWidth, scaledHeight);
          context.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);
        }
      });
      let strokeColor, fillColor;
      if (currentZoneType === 'reward') {
        strokeColor = '#22c55e';
        fillColor = '#22c55e33';
      } else if (currentZoneType === 'objective') {
        strokeColor = '#3b82f6';
        fillColor = '#3b82f633';
      } else if (currentZoneType === 'contractName') {
        strokeColor = '#a855f7';
        fillColor = '#a855f733';
      }
      context.strokeStyle = strokeColor;
      context.fillStyle = fillColor;
      const { scaleX, scaleY, offsetX, offsetY } = videoScale;
      const width = currentVideoCoords.x - startPoint.x;
      const height = currentVideoCoords.y - startPoint.y;
      const scaledX = startPoint.x * scaleX + offsetX;
      const scaledY = startPoint.y * scaleY + offsetY;
      const scaledWidth = width * scaleX;
      const scaledHeight = height * scaleY;
      context.fillRect(scaledX, scaledY, scaledWidth, scaledHeight);
      context.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);
    } else {
      // Just render existing zones
      Object.entries(zones).forEach(([type, zone]) => {
        let strokeColor, fillColor;
        if (type === 'reward') {
          strokeColor = '#22c55e';
          fillColor = '#22c55e33';
        } else if (type === 'objective') {
          strokeColor = '#3b82f6';
          fillColor = '#3b82f633';
        } else if (type === 'contractName') {
          strokeColor = '#a855f7';
          fillColor = '#a855f733';
        }
        context.strokeStyle = strokeColor;
        context.fillStyle = fillColor;
        const { scaleX, scaleY, offsetX, offsetY } = videoScale;
        const scaledX = zone.x * scaleX + offsetX;
        const scaledY = zone.y * scaleY + offsetY;
        const scaledWidth = zone.width * scaleX;
        const scaledHeight = zone.height * scaleY;
        context.fillRect(scaledX, scaledY, scaledWidth, scaledHeight);
        context.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);
      });
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!videoRef.current) return;
    
    if (isPanning && panningZone) {
      // Finish panning - update the zone position
      const canvas = zoneCanvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const endX = e.clientX - rect.left;
      const endY = e.clientY - rect.top;
      const endVideoCoords = canvasToVideoCoordinates(endX, endY);
      
      const deltaX = endVideoCoords.x - panStartPoint.x;
      const deltaY = endVideoCoords.y - panStartPoint.y;
      
      setZones(prev => ({
        ...prev,
        [panningZone]: {
          ...prev[panningZone],
          x: prev[panningZone].x + deltaX,
          y: prev[panningZone].y + deltaY
        }
      }));
      
      setIsPanning(false);
      setPanningZone(null);
    } else if (isDrawing && currentZoneType) {
      // Finish drawing - create new zone
      const canvas = zoneCanvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const endX = e.clientX - rect.left;
      const endY = e.clientY - rect.top;
      const endVideoCoords = canvasToVideoCoordinates(endX, endY);
      const newZone = {
        x: Math.min(startPoint.x, endVideoCoords.x),
        y: Math.min(startPoint.y, endVideoCoords.y),
        width: Math.abs(endVideoCoords.x - startPoint.x),
        height: Math.abs(endVideoCoords.y - startPoint.y)
      };
      setZones(prev => ({
        ...prev,
        [currentZoneType!]: newZone
      }));
      setIsDrawing(false);
      setCurrentZoneType(null);
    }
  };

  return (
    <div className="relative bg-black/30 rounded-lg overflow-hidden border border-neon-blue/30 w-full aspect-video">
      <video 
        ref={videoRef} 
        autoPlay 
        className="w-full h-full object-contain" 
      />
      <canvas 
        ref={zoneCanvasRef} 
        className="absolute top-0 left-0 w-full h-full"
        style={{ cursor: currentZoneType ? 'crosshair' : (isPanning ? 'grabbing' : 'grab') }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      {captureActive && (
        <div className="absolute bottom-4 left-4 right-4 flex justify-center space-x-4">
          <Button 
            onClick={() => startDrawing('reward')} 
            className={cn(
              "bg-green-600 hover:bg-green-700 relative",
              currentZoneType === 'reward' && "ring-2 ring-white"
            )}
          >
            <Square className="h-4 w-4 mr-2" />
            Set Reward Zone
            {zones.reward.width > 0 && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full" />
            )}
          </Button>
          <Button 
            onClick={() => startDrawing('objective')} 
            className={cn(
              "bg-blue-600 hover:bg-blue-700 relative",
              currentZoneType === 'objective' && "ring-2 ring-white"
            )}
          >
            <Square className="h-4 w-4 mr-2" />
            Set Objective Zone
            {zones.objective.width > 0 && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full" />
            )}
          </Button>
          <Button 
            onClick={() => startDrawing('contractName')} 
            className={cn(
              "bg-purple-600 hover:bg-purple-700 relative",
              currentZoneType === 'contractName' && "ring-2 ring-white"
            )}
          >
            <Square className="h-4 w-4 mr-2" />
            Set Contract Name Zone
            {zones.contractName.width > 0 && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full" />
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default VideoZoneSelector; 