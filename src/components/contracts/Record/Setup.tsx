import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, Square, ArrowDown, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import SessionInfo from '@/components/contracts/Record/SessionInfo';
import VideoZoneSelector from '@/components/contracts/Record/VideoZoneSelector';
import { loadFromStorage } from '@/lib/storage';

interface SetupProps {
  isSetupOpen: boolean;
  setIsSetupOpen: (open: boolean) => void;
  sessionId: string;
  onZonesChange?: (zones: any) => void;
  onCaptureActiveChange?: (active: boolean) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
}

const Setup: React.FC<SetupProps> = ({
  isSetupOpen,
  setIsSetupOpen,
  sessionId,
  onZonesChange,
  onCaptureActiveChange,
  videoRef
}) => {
  const [captureActive, setCaptureActive] = useState(false);
  const [zones, setZones] = useState(() => loadFromStorage('userZones', {
    reward: { x: 0, y: 0, width: 100, height: 50 },
    objective: { x: 0, y: 0, width: 100, height: 50 },
    contractName: { x: 0, y: 0, width: 200, height: 30 }
  }));

  useEffect(() => { if (onZonesChange) onZonesChange(zones); }, [zones]);
  useEffect(() => { if (onCaptureActiveChange) onCaptureActiveChange(captureActive); }, [captureActive]);

  const startCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: true,
        audio: false
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCaptureActive(true);
      }
    } catch (err) {
      console.error("Error starting capture: ", err);
    }
  };

  const stopCapture = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setCaptureActive(false);
    }
  };

  return (
    <div className="holographic-panel rounded-lg p-6 border border-neon-blue/20 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-neon-blue">Setup</h2>
        <Button variant="ghost" size="sm" onClick={() => setIsSetupOpen(!isSetupOpen)}>
          {isSetupOpen ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
        </Button>
      </div>
      
      {/* Controls always visible */}
      <div className="flex items-center justify-between w-full">
        <div className="flex space-x-2">
          <Button 
            onClick={startCapture} 
            disabled={captureActive}
            className="bg-neon-blue text-space-dark hover:bg-neon-blue/90"
          >
            <Camera className="h-4 w-4 mr-2" />
            Start Capture
          </Button>
          <Button 
            onClick={stopCapture} 
            disabled={!captureActive}
            variant="outline"
            className="border-neon-blue/50 text-neon-blue hover:bg-neon-blue/10"
          >
            Stop Capture
          </Button>
        </div>
        <div className="flex-1 flex justify-end">
          <SessionInfo sessionId={sessionId} />
        </div>
      </div>

      {/* Video preview - always in DOM but hidden with max-height for smooth collapse */}
      <div 
        className={cn(
          "transition-all duration-300 overflow-hidden",
          isSetupOpen ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <VideoZoneSelector captureActive={captureActive} onZonesChange={setZones} videoRef={videoRef} />
      </div>
    </div>
  );
};

export default Setup; 