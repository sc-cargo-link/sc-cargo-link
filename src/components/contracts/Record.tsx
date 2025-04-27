import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Camera } from 'lucide-react';
import { useDebug } from '@/contexts/DebugContext';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { contractService } from '@/lib/contractService';
import { Contract } from '@/lib/db';
import { toast } from "@/components/ui/use-toast";
import RecordsTable from '@/components/contracts/RecordsTable';
import humanId from 'human-id';
import DebugImagesViewer from '@/components/contracts/Record/DebugImagesViewer';
import CreateSessionDialog from '@/components/contracts/Record/CreateSessionDialog';
import Setup from '@/components/contracts/Record/Setup';
import CapturePeerHandler, { CapturePeerHandlerRef } from '@/components/contracts/Record/CapturePeerHandler';

const Record = () => {
  // States
  const [captureActive, setCaptureActive] = useState(false);
  const [debugImages, setDebugImages] = useState<{[key: string]: { reward: string; objective: string; }}>({});
  const [errorMessage, setErrorMessage] = useState('');
  const [extractedData, setExtractedData] = useState([]);
  const [isCreateSessionDialogOpen, setIsCreateSessionDialogOpen] = useState(false);
  const { isDebugEnabled, toggleDebug } = useDebug();
  const [sessionName, setSessionName] = useState('');
  const [sessionId, setSessionId] = useState(humanId({
    capitalize: false,
    separator: '-',
  }));
  const [zones, setZones] = useState({
    reward: { x: 0, y: 0, width: 100, height: 50 },
    objective: { x: 0, y: 0, width: 100, height: 50 }
  });

  // Refs
  const connRef = React.useRef<any>(null) as React.MutableRefObject<any>;
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const peerRef = React.useRef<any>(null) as React.MutableRefObject<any>;
  const extractedDataRef = useRef(extractedData);
  const debugImagesRef = useRef(debugImages);
  const zonesRef = useRef(zones);
  const [isSetupOpen, setIsSetupOpen] = useState(true);
  const capturePeerHandlerRef = useRef<CapturePeerHandlerRef>(null);
  
  
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
  useEffect(() => { zonesRef.current = zones; }, [zones]);

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

      <Setup
        isSetupOpen={isSetupOpen}
        setIsSetupOpen={setIsSetupOpen}
        sessionId={sessionId}
        onZonesChange={setZones}
        onCaptureActiveChange={setCaptureActive}
        videoRef={videoRef}
      />

      <DebugImagesViewer isDebugEnabled={isDebugEnabled} debugImages={debugImages} />

      <div className="holographic-panel rounded-lg p-6 border border-neon-blue/20 space-y-4">
        <h2 className="text-xl font-bold text-neon-blue">Record</h2>
        
        <div className="space-y-4">
          <div className="flex gap-2 justify-between items-center">
            <Button 
              onClick={() => capturePeerHandlerRef.current?.captureScreen()}
              disabled={!captureActive}
              className={captureActive ? "bg-green-600 hover:bg-green-700 w-full" : "bg-gray-600 hover:bg-gray-700"}
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
          
          <RecordsTable 
            records={extractedData} 
            debugImages={debugImages} 
            onUpdate={setExtractedData}
          />
        </div>
      </div>

      <CreateSessionDialog
        open={isCreateSessionDialogOpen}
        onOpenChange={setIsCreateSessionDialogOpen}
        sessionName={sessionName}
        setSessionName={setSessionName}
        handleCreateSession={handleCreateSession}
      />

      <CapturePeerHandler
        ref={capturePeerHandlerRef}
        videoRef={videoRef}
        canvasRef={canvasRef}
        zonesRef={zonesRef}
        sessionId={sessionId}
        setExtractedData={setExtractedData}
        setDebugImages={setDebugImages}
        setErrorMessage={setErrorMessage}
        isDebugEnabled={isDebugEnabled}
        extractedDataRef={extractedDataRef}
        debugImagesRef={debugImagesRef}
        connRef={connRef}
        peerRef={peerRef}
      />
    </div>
  );
};

export default Record;

