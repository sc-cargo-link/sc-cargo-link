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
import { contractService } from '@/lib/contractService';
import { Contract } from '@/lib/db';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";

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
  const [videoScale, setVideoScale] = useState({ scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 });
  const [isCreateSessionDialogOpen, setIsCreateSessionDialogOpen] = useState(false);
  const [sessionName, setSessionName] = useState('');
  
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

  const updateCanvasAndVideoScale = () => {
    if (!videoRef.current || !zoneCanvasRef.current) return;

    const video = videoRef.current;
    const canvas = zoneCanvasRef.current;
    const videoRect = video.getBoundingClientRect();
    
    // Set canvas size to match container
    canvas.width = videoRect.width;
    canvas.height = videoRect.height;

    // Calculate video scaling
    const videoAspect = video.videoWidth / video.videoHeight;
    const containerAspect = canvas.width / canvas.height;
    
    let scale = 1;
    let offsetX = 0;
    let offsetY = 0;

    if (containerAspect > videoAspect) {
      // Container is wider than video
      scale = canvas.height / video.videoHeight;
      offsetX = (canvas.width - (video.videoWidth * scale)) / 2;
    } else {
      // Container is taller than video
      scale = canvas.width / video.videoWidth;
      offsetY = (canvas.height - (video.videoHeight * scale)) / 2;
    }

    setVideoScale({
      scaleX: scale,
      scaleY: scale,
      offsetX,
      offsetY
    });

    // Redraw zones
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
      
      const handleVideoMetadata = () => {
        updateCanvasAndVideoScale();
      };

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

  const handleMouseDown = (e) => {
    if (!currentZoneType || !videoRef.current) return;
    
    const canvas = zoneCanvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const videoCoords = canvasToVideoCoordinates(x, y);
    setStartPoint(videoCoords);
    setIsDrawing(true);
  };

  const handleMouseMove = (e) => {
    if (!isDrawing || !currentZoneType || !videoRef.current) return;
    
    const canvas = zoneCanvasRef.current;
    const context = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    
    const currentVideoCoords = canvasToVideoCoordinates(currentX, currentY);
    
    // Clear previous drawing
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.lineWidth = 2;
    
    // Draw all existing zones
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
    
    // Draw current zone
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

  const handleMouseUp = (e) => {
    if (!isDrawing || !currentZoneType || !videoRef.current) return;
    
    const canvas = zoneCanvasRef.current;
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
      [currentZoneType]: newZone
    }));
    
    setIsDrawing(false);
    setCurrentZoneType(null);
  };

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

  const handleClearRecords = () => {
    setExtractedData([]);
    setDebugImages({});
  };

  const handleCreateSession = async () => {
    if (!sessionName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a session name",
        variant: "destructive"
      });
      return;
    }

    try {
      const contracts: Contract[] = extractedData.map(data => ({
        id: data.id,
        timestamp: data.timestamp,
        reward: data.reward,
        objective: data.objective
      }));

      await contractService.createSession(sessionName, sessionId, contracts);
      
      toast({
        title: "Success",
        description: "Session created successfully"
      });
      
      setIsCreateSessionDialogOpen(false);
      setSessionName('');
    } catch (error) {
      console.error('Error creating session:', error);
      toast({
        title: "Error",
        description: "Failed to create session",
        variant: "destructive"
      });
    }
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
          
          <div className="grid grid-cols-2 gap-6">
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
              <>
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
                <div className="flex justify-end space-x-4 mt-4">
                  <Button
                    variant="outline"
                    className="border-red-500/50 text-red-500 hover:bg-red-500/10"
                    onClick={handleClearRecords}
                  >
                    Clear Records
                  </Button>
                  <Button
                    className="bg-neon-blue text-space-dark hover:bg-neon-blue/90"
                    onClick={() => setIsCreateSessionDialogOpen(true)}
                  >
                    Create Session
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-gray-400 text-center py-8">No data captured yet. Use the capture button to extract information.</p>
            )}
          </div>
        </div>
      </div>

      <Dialog open={isCreateSessionDialogOpen} onOpenChange={setIsCreateSessionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Session</DialogTitle>
            <DialogDescription>
              Give your session a name to save it. This will store all captured contracts.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="session-name">Session Name</Label>
            <Input
              id="session-name"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              placeholder="Enter session name"
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateSessionDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateSession}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Record;
