
import React, { useState, useRef } from 'react';
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
  
  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const zoneCanvasRef = useRef(null);
  const peerRef = useRef(null);
  
  // Start screen capture
  const startCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: { cursor: "always" },
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
  
  // Set zone for capture
  const setZone = (type) => {
    // In a real implementation, we'd draw on zoneCanvasRef and capture coordinates
    // For now we just simulate with random zones
    setZones(prev => ({
      ...prev,
      [type]: {
        x: Math.floor(Math.random() * 200),
        y: Math.floor(Math.random() * 200),
        width: 100 + Math.floor(Math.random() * 100),
        height: 50 + Math.floor(Math.random() * 50)
      }
    }));
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
    
    // Extract text from objective zone similarly
    const objectiveCanvas = document.createElement('canvas');
    const objectiveContext = objectiveCanvas.getContext('2d');
    objectiveCanvas.width = zones.objective.width;
    objectiveCanvas.height = zones.objective.height;
    
    objectiveContext.drawImage(
      video,
      zones.objective.x, zones.objective.y, zones.objective.width, zones.objective.height,
      0, 0, zones.objective.width, zones.objective.height
    );
    
    // In a full implementation, we would use Tesseract here to extract the text
    // For now, let's simulate with sample data
    const sampleData = {
      reward: "10,000 aUEC",
      objective: "Transport cargo to Hurston"
    };
    
    // Add to extracted data
    setExtractedData(prevData => [
      ...prevData, 
      { 
        id: nanoid(5),
        timestamp: new Date().toLocaleString(),
        reward: sampleData.reward,
        objective: sampleData.objective
      }
    ]);
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
            
            <div className="relative bg-black/30 rounded-lg overflow-hidden h-64 border border-neon-blue/30">
              <video 
                ref={videoRef} 
                autoPlay 
                className="w-full h-full object-contain" 
              />
              <canvas 
                ref={zoneCanvasRef} 
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
              />
              {captureActive && (
                <div className="absolute bottom-4 left-4 right-4 flex justify-center space-x-4">
                  <Button onClick={() => setZone('reward')} className="bg-green-600 hover:bg-green-700">
                    <Square className="h-4 w-4 mr-2" />
                    Set Reward Zone
                  </Button>
                  <Button onClick={() => setZone('objective')} className="bg-blue-600 hover:bg-blue-700">
                    <Square className="h-4 w-4 mr-2" />
                    Set Objective Zone
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
                        <TableCell className="text-green-400 font-semibold">{data.reward}</TableCell>
                        <TableCell className="text-gray-300">{data.objective}</TableCell>
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
