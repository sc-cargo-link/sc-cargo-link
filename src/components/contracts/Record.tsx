import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { Camera, Square, ArrowDown, ArrowUp, Copy } from 'lucide-react';
import { nanoid } from 'nanoid';
import Tesseract from 'tesseract.js';
import { Peer } from 'peerjs';
import { cn } from '@/lib/utils';
import { useDebug } from '@/contexts/DebugContext';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { contractService } from '@/lib/contractService';
import { Contract } from '@/lib/db';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import RecordsTable from '@/components/contracts/RecordsTable';

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
  const [errorMessage, setErrorMessage] = useState('');
  const conn = useRef(null);
  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const zoneCanvasRef = useRef(null);
  const peerRef = useRef(null);
  const extractedDataRef = useRef(extractedData);
  const debugImagesRef = useRef(debugImages);
  
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
    // setExtractedData(prevData => [
    //   ...prevData, 
    //   { 
    //     id: nanoid(5),
    //     timestamp: new Date().toLocaleString(),
    //     reward: 'test',
    //     objective: 'test'
    //   }
    // ]);
    // return ;
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
    
    // Sharpening kernel
    function sharpenCanvas(canvas) {
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      const copy = new Uint8ClampedArray(data);
      // Sharpen kernel
      const kernel = [
        0, -1,  0,
       -1,  5, -1,
        0, -1,  0
      ];
      const kSize = 3;
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          for (let c = 0; c < 3; c++) {
            let i = (y * width + x) * 4 + c;
            let sum = 0;
            let ki = 0;
            for (let ky = -1; ky <= 1; ky++) {
              for (let kx = -1; kx <= 1; kx++) {
                let ni = ((y + ky) * width + (x + kx)) * 4 + c;
                sum += copy[ni] * kernel[ki++];
              }
            }
            data[i] = Math.min(255, Math.max(0, sum));
          }
        }
      }
      ctx.putImageData(imageData, 0, 0);
    }

    // Sharpen reward and objective canvases
    sharpenCanvas(rewardCanvas);
    sharpenCanvas(objectiveCanvas);
    
    try {
      // Extract text using Tesseract
      const [rewardText, objectiveText] = await Promise.all([
        Tesseract.recognize(rewardCanvas.toDataURL(), 'eng'),
        Tesseract.recognize(objectiveCanvas.toDataURL(), 'eng')
      ]);
      const id = nanoid(5);
      if (isDebugEnabled) {
        setDebugImages(prev => {
          return {
            ...prev,
            [id]: {
              reward: rewardCanvas.toDataURL(),
              objective: objectiveCanvas.toDataURL()
            }
          };
        });
      }

      if (rewardText.data.text.trim() === '') {
        if (conn.current) {
          conn.current.send({ type: 'error', message: 'No text found in the reward zone' });
        }
        setErrorMessage('No text found in the reward zone');
        return;
      }
      if (objectiveText.data.text.trim() === '') {
        if (conn.current) {
          conn.current.send({ type: 'error', message: 'No text found in the objective zone' });
        }
        setErrorMessage('No text found in the objective zone');
        return;
      }
      setErrorMessage('');
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
      setErrorMessage(error.message);
    }
  };
  
  useEffect(() => {
    initPeer();
  }, []);

  const handleConnection = (conn) => {
    conn.current = conn;
    let interval: NodeJS.Timeout | null = null;
    console.log("Connection on record");
    // Only set up the handler once
    conn.on('data', (data) => {
      if (data.type === 'capture-request') {
        captureScreen();
      }
    });
    // Send data every 1 second
    interval = setInterval(() => {
      conn.send({
        type: 'records',
        records: extractedDataRef.current,
        debugImages: debugImagesRef.current
      });
    }, 1000);
    conn.on('close', () => {
      if (interval) clearInterval(interval);
    });
    conn.on('error', (error) => {
      setErrorMessage(error.message);
    });
  };

  // Initialize peer connection
  const initPeer = () => {
    if (!peerRef.current) {
      peerRef.current = new Peer(sessionId);
      
      peerRef.current.on('open', () => {
        console.log("Open on record");
        setErrorMessage('');
      });
      peerRef.current.on('connection', (conn) => {
        console.log("Connection on record");
        conn.on('data', (data) => {
          console.log("Received data:", data);
        });
      });
      peerRef.current.on('connection', handleConnection);
      peerRef.current.on('error', (error) => {
        setErrorMessage(error.message);
      });
    }
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

  useEffect(() => { extractedDataRef.current = extractedData; }, [extractedData]);
  useEffect(() => { debugImagesRef.current = debugImages; }, [debugImages]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Record Contract</h1>
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
            <div className="flex items-center justify-between w-full mb-2">
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
                {/* Session Info */}
                <div className="space-y-2 flex-1 max-w-xs">
                  <p className="text-sm font-medium text-gray-400">Your Session ID</p>
                  <div className="relative">
                    <Input value={sessionId} readOnly className="bg-space-medium border-neon-blue/20 pr-10" />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
                      onClick={() => {
                        navigator.clipboard.writeText(sessionId);
                        toast({ title: 'Copied!', description: 'Session ID copied to clipboard.' });
                      }}
                    >
                      <Copy className="w-4 h-4 text-neon-blue" />
                    </Button>
                  </div>
                </div>
              </div>
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
          
        </CollapsibleContent>
      </Collapsible>

      {isDebugEnabled && (() => {
        const lastEntry = Object.entries(debugImages).at(-1);
        if (!lastEntry) return (
          <div id="canvas-container" className="flex flex-col items-center my-6 text-gray-400">No debug images yet.</div>
        );
        const [id, images] = lastEntry;
        return (
          <div id="canvas-container" className="flex flex-col md:flex-row gap-6 items-center my-6">
            <div className="flex flex-col items-center">
              <span className="text-xs text-green-400 mb-1">Reward Zone (Canvas)</span>
              <canvas
                width={1}
                height={1}
                ref={el => {
                  if (el && images.reward) {
                    const img = new window.Image();
                    img.onload = () => {
                      el.width = img.width;
                      el.height = img.height;
                      const ctx = el.getContext('2d');
                      ctx.clearRect(0, 0, el.width, el.height);
                      ctx.drawImage(img, 0, 0);
                    };
                    img.src = images.reward;
                  }
                }}
                className="border border-green-400 rounded-lg max-w-xs h-auto bg-black shadow-lg"
                style={{ display: 'block' }}
              />
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xs text-blue-400 mb-1">Objective Zone (Canvas)</span>
              <canvas
                width={1}
                height={1}
                ref={el => {
                  if (el && images.objective) {
                    const img = new window.Image();
                    img.onload = () => {
                      el.width = img.width;
                      el.height = img.height;
                      const ctx = el.getContext('2d');
                      ctx.clearRect(0, 0, el.width, el.height);
                      ctx.drawImage(img, 0, 0);
                    };
                    img.src = images.objective;
                  }
                }}
                className="border border-blue-400 rounded-lg max-w-xs h-auto bg-black shadow-lg"
                style={{ display: 'block' }}
              />
            </div>
          </div>
        );
      })()}

      <div className="holographic-panel rounded-lg p-6 border border-neon-blue/20 space-y-4">
        <h2 className="text-xl font-bold text-neon-blue">Record</h2>
        
        <div className="space-y-4">
          <div className="flex gap-2 justify-between items-center">
            <Button 
              onClick={captureScreen}
              disabled={!captureActive}
              className="bg-red-600 hover:bg-red-700"
            >
              <Camera className="h-4 w-4 mr-2" />
              Capture Current Screen
            </Button>
            <Button
              onClick={handleClearRecords}
              variant="outline"
              className="border-neon-blue/50 text-neon-blue hover:bg-neon-blue/10 ml-auto"
              disabled={extractedData.length === 0 && Object.keys(debugImages).length === 0}
            >
              Clear
            </Button>
          </div>
          <div id="error-message" className="text-red-500">
            {errorMessage}
          </div>
          <canvas ref={canvasRef} className="hidden" />
          
            
            <RecordsTable records={extractedData} debugImages={debugImages} />
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

