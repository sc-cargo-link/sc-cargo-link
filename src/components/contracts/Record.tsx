import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Camera, QrCode, Square, ArrowDown, ArrowUp } from 'lucide-react';
import { nanoid } from 'nanoid';
import Tesseract from 'tesseract.js';
import { Peer } from 'peerjs';
import { cn } from '@/lib/utils';
import { useDebug } from '@/contexts/DebugContext';
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const Record = () => {
  // States
  const [isSetupOpen, setIsSetupOpen] = useState(true);
  const [sessionId, setSessionId] = useState(nanoid(10));
  const [captureActive, setCaptureActive] = useState(false);
  const [connectId, setConnectId] = useState('');
  const [extractedData, setExtractedData] = useState([]);
  const [zones, setZones] = useState({
    reward: { x: 0, y: 0, width: 100, height: 50 },
    objective: { x: 0, y: 0, width: 100, height: 50 }
  });
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentZoneType, setCurrentZoneType] = useState(null);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [debugImages, setDebugImages] = useState<{[key: string]: { reward: string; objective: string; }}>({});
  const { isDebugEnabled, toggleDebug } = useDebug();
  
  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const zoneCanvasRef = useRef(null);
  const peerRef = useRef(null);
  
  // Start screen capture
  const startCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: true, // Remove the cursor property as it's not supported
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
  
  // Stop screen capture
  const stopCapture = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setCaptureActive(false);
    }
  };
  
  // Drawing functions
  const startDrawing = (type) => {
    setCurrentZoneType(type);
    const canvas = zoneCanvasRef.current;
    canvas.style.pointerEvents = 'auto';
  };

  const handleMouseDown = (e) => {
    if (!currentZoneType) return;
    
    const canvas = zoneCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDrawing(true);
    setStartPoint({ x, y });
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !currentZoneType) return;
    
    const canvas = zoneCanvasRef.current;
    const context = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    // Clear previous drawing
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.lineWidth = 2;
    
    // Draw all existing zones
    Object.entries(zones).forEach(([type, zone]) => {
      if (type !== currentZoneType) {
        context.strokeStyle = type === 'reward' ? '#00ff00' : '#0000ff';
        context.fillStyle = type === 'reward' ? 'rgba(0, 255, 0, 0.1)' : 'rgba(0, 0, 255, 0.1)';
        context.fillRect(zone.x, zone.y, zone.width, zone.height);
        context.strokeRect(zone.x, zone.y, zone.width, zone.height);
      }
    });
    
    // Draw current zone
    context.strokeStyle = currentZoneType === 'reward' ? '#00ff00' : '#0000ff';
    context.fillStyle = currentZoneType === 'reward' ? 'rgba(0, 255, 0, 0.1)' : 'rgba(0, 0, 255, 0.1)';
    const width = currentX - startPoint.x;
    const height = currentY - startPoint.y;
    context.fillRect(startPoint.x, startPoint.y, width, height);
    context.strokeRect(startPoint.x, startPoint.y, width, height);
  };

  const handleMouseUp = (e) => {
    if (!isDrawing || !currentZoneType) return;
    
    const canvas = zoneCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;
    
    const newZone = {
      x: Math.min(startPoint.x, endX),
      y: Math.min(startPoint.y, endY),
      width: Math.abs(endX - startPoint.x),
      height: Math.abs(endY - startPoint.y)
    };
    
    setZones(prev => ({
      ...prev,
      [currentZoneType]: newZone
    }));
    
    setIsDrawing(false);
    setCurrentZoneType(null);
    canvas.style.pointerEvents = 'none';
  };

  useEffect(() => {
    if (zoneCanvasRef.current && videoRef.current) {
      const canvas = zoneCanvasRef.current;
      const video = videoRef.current;
      
      const updateCanvasSize = () => {
        const rect = video.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        
        // Redraw zones after resize
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.lineWidth = 2;
        Object.entries(zones).forEach(([type, zone]) => {
          context.strokeStyle = type === 'reward' ? '#00ff00' : '#0000ff';
          context.fillStyle = type === 'reward' ? 'rgba(0, 255, 0, 0.1)' : 'rgba(0, 0, 255, 0.1)';
          context.fillRect(zone.x, zone.y, zone.width, zone.height);
          context.strokeRect(zone.x, zone.y, zone.width, zone.height);
        });
      };
      
      updateCanvasSize();
      const resizeObserver = new ResizeObserver(updateCanvasSize);
      resizeObserver.observe(video);
      return () => resizeObserver.disconnect();
    }
  }, [zones]);

  // Capture the current screen
  const captureScreen = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Extract text from reward zone
    const rewardCanvas = document.createElement('canvas');
    const rewardContext = rewardCanvas.getContext('2d');
    rewardCanvas.width = zones.reward.width;
    rewardCanvas.height = zones.reward.height;
    
    rewardContext.drawImage(
      video,
      zones.reward.x, zones.reward.y, zones.reward.width, zones.reward.height,
      0, 0, zones.reward.width, zones.reward.height
    );
    
    // Extract text from objective zone
    const objectiveCanvas = document.createElement('canvas');
    const objectiveContext = objectiveCanvas.getContext('2d');
    objectiveCanvas.width = zones.objective.width;
    objectiveCanvas.height = zones.objective.height;
    
    objectiveContext.drawImage(
      video,
      zones.objective.x, zones.objective.y, zones.objective.width, zones.objective.height,
      0, 0, zones.objective.width, zones.objective.height
    );
    
    try {
      // Extract text using Tesseract
      const [rewardText, objectiveText] = await Promise.all([
        Tesseract.recognize(rewardCanvas.toDataURL(), 'eng'),
        Tesseract.recognize(objectiveCanvas.toDataURL(), 'eng')
      ]);

      const id = nanoid(5);
      
      if (isDebugEnabled) {
        setDebugImages(prev => ({
          ...prev,
          [id]: {
            reward: rewardCanvas.toDataURL(),
            objective: objectiveCanvas.toDataURL()
          }
        }));
      }

      // Add to extracted data
      setExtractedData(prevData => [
        ...prevData, 
        { 
          id,
          timestamp: new Date().toLocaleString(),
          reward: rewardText.data.text.trim(),
          objective: objectiveText.data.text.trim()
        }
      ]);
    } catch (error) {
      console.error('Error extracting text:', error);
    }
  };
  
  // Initialize peer connection
  const initPeer = () => {
    if (!peerRef.current) {
      peerRef.current = new Peer(sessionId);
      
      peerRef.current.on('connection', (conn) => {
        conn.on('open', () => {
          console.log("Connected to remote peer");
          conn.on('data', (data) => {
            console.log("Received data:", data);
            // Handle incoming data
          });
        });
      });
    }
  };
  
  // Connect to remote peer
  const connectToPeer = () => {
    if (!peerRef.current || !connectId) return;
    
    const conn = peerRef.current.connect(connectId);
    conn.on('open', () => {
      console.log("Connected to peer: " + connectId);
      conn.send("Hello from " + sessionId);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Record Contract</h1>
          <p className="text-gray-400 mt-1">Document a new hauling contract</p>
        </div>
        <div className="flex items-center space-x-2">
          <Switch id="debug-mode" checked={isDebugEnabled} onCheckedChange={toggleDebug} />
          <Label htmlFor="debug-mode">Debug Mode</Label>
        </div>
      </div>

      <Collapsible
        open={isSetupOpen}
        onOpenChange={setIsSetupOpen}
        className="holographic-panel rounded-lg p-6 border border-neon-blue/20 space-y-4"
      >
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-neon-blue">Setup</h2>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              {isSetupOpen ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
        </div>
        
        <CollapsibleContent className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Screen Capture</h3>
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
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Session Information</h3>
            <div className="flex items-center space-x-4">
              <div className="space-y-2 flex-1">
                <p className="text-sm font-medium text-gray-400">Your Session ID</p>
                <div className="flex space-x-2">
                  <Input value={sessionId} readOnly className="bg-space-medium border-neon-blue/20" />
                  <Button onClick={() => setSessionId(nanoid(10))} variant="outline" className="border-neon-blue/50">
                    Generate New
                  </Button>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg">
                {/* This would be a QR code component in production */}
                <QrCode className="h-24 w-24 text-black" />
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Connect to Remote Session</h3>
            <div className="flex space-x-2">
              <Input 
                value={connectId} 
                onChange={(e) => setConnectId(e.target.value)}
                placeholder="Enter session ID" 
                className="bg-space-medium border-neon-blue/20" 
              />
              <Button 
                onClick={connectToPeer}
                className="bg-neon-blue text-space-dark hover:bg-neon-blue/90"
              >
                Connect
              </Button>
            </div>
            <Button variant="outline" className="w-full border-neon-blue/50 text-neon-blue hover:bg-neon-blue/10">
              <QrCode className="h-4 w-4 mr-2" />
              Scan QR Code
            </Button>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="holographic-panel rounded-lg p-6 border border-neon-blue/20 space-y-4">
        <h2 className="text-xl font-bold text-neon-blue">Record</h2>
        
        <div className="space-y-4">
          <Button 
            onClick={captureScreen}
            disabled={!captureActive}
            className="bg-red-600 hover:bg-red-700"
          >
            <Camera className="h-4 w-4 mr-2" />
            Capture Current Screen
          </Button>
          
          <canvas ref={canvasRef} className="hidden" />
          
          <div className="bg-black/30 rounded-lg p-4 border border-neon-blue/30">
            <h3 className="text-lg font-semibold text-white mb-4">Extracted Information</h3>
            
            {extractedData.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-neon-blue">Time</TableHead>
                      <TableHead className="text-neon-blue">Reward</TableHead>
                      <TableHead className="text-neon-blue">Objective</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {extractedData.map((data) => (
                      <TableRow key={data.id}>
                        <TableCell className="text-gray-300">{data.timestamp}</TableCell>
                        <TableCell className="text-green-400 font-semibold">
                          {isDebugEnabled && debugImages[data.id] ? (
                            <HoverCard>
                              <HoverCardTrigger asChild>
                                <span className="cursor-help underline decoration-dotted">
                                  {data.reward}
                                </span>
                              </HoverCardTrigger>
                              <HoverCardContent className="w-fit">
                                <img 
                                  src={debugImages[data.id].reward} 
                                  alt="Reward Zone" 
                                  className="border border-green-500"
                                />
                              </HoverCardContent>
                            </HoverCard>
                          ) : (
                            data.reward
                          )}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {isDebugEnabled && debugImages[data.id] ? (
                            <HoverCard>
                              <HoverCardTrigger asChild>
                                <span className="cursor-help underline decoration-dotted">
                                  {data.objective}
                                </span>
                              </HoverCardTrigger>
                              <HoverCardContent className="w-fit">
                                <img 
                                  src={debugImages[data.id].objective} 
                                  alt="Objective Zone" 
                                  className="border border-blue-500"
                                />
                              </HoverCardContent>
                            </HoverCard>
                          ) : (
                            data.objective
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">No data captured yet. Use the capture button to extract information.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Record;
