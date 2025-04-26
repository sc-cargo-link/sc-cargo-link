import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Square } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoZoneSelectorProps {
  captureActive: boolean;
  onZonesChange?: (zones: any) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
}

const VideoZoneSelector: React.FC<VideoZoneSelectorProps> = ({ captureActive, onZonesChange, videoRef }) => {
  const [zones, setZones] = useState({
    reward: { x: 0, y: 0, width: 100, height: 50 },
    objective: { x: 0, y: 0, width: 100, height: 50 }
  });
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentZoneType, setCurrentZoneType] = useState<string | null>(null);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [videoScale, setVideoScale] = useState({ scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 });
  const zoneCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => { if (onZonesChange) onZonesChange(zones); }, [zones]);

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
      context.strokeStyle = type === 'reward' ? '#00ff00' : '#0000ff';
      context.fillStyle = type === 'reward' ? 'rgba(0, 255, 0, 0.1)' : 'rgba(0, 0, 255, 0.1)';
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

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!currentZoneType || !videoRef.current) return;
    const canvas = zoneCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const videoCoords = canvasToVideoCoordinates(x, y);
    setStartPoint(videoCoords);
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentZoneType || !videoRef.current) return;
    const canvas = zoneCanvasRef.current!;
    const context = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    const currentVideoCoords = canvasToVideoCoordinates(currentX, currentY);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.lineWidth = 2;
    Object.entries(zones).forEach(([type, zone]) => {
      if (type !== currentZoneType) {
        context.strokeStyle = type === 'reward' ? '#00ff00' : '#0000ff';
        context.fillStyle = type === 'reward' ? 'rgba(0, 255, 0, 0.1)' : 'rgba(0, 0, 255, 0.1)';
        const { scaleX, scaleY, offsetX, offsetY } = videoScale;
        const scaledX = zone.x * scaleX + offsetX;
        const scaledY = zone.y * scaleY + offsetY;
        const scaledWidth = zone.width * scaleX;
        const scaledHeight = zone.height * scaleY;
        context.fillRect(scaledX, scaledY, scaledWidth, scaledHeight);
        context.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);
      }
    });
    context.strokeStyle = currentZoneType === 'reward' ? '#00ff00' : '#0000ff';
    context.fillStyle = currentZoneType === 'reward' ? 'rgba(0, 255, 0, 0.1)' : 'rgba(0, 0, 255, 0.1)';
    const { scaleX, scaleY, offsetX, offsetY } = videoScale;
    const width = currentVideoCoords.x - startPoint.x;
    const height = currentVideoCoords.y - startPoint.y;
    const scaledX = startPoint.x * scaleX + offsetX;
    const scaledY = startPoint.y * scaleY + offsetY;
    const scaledWidth = width * scaleX;
    const scaledHeight = height * scaleY;
    context.fillRect(scaledX, scaledY, scaledWidth, scaledHeight);
    context.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentZoneType || !videoRef.current) return;
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
        style={{ cursor: currentZoneType ? 'crosshair' : 'default' }}
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
        </div>
      )}
    </div>
  );
};

export default VideoZoneSelector; 