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
import { loadFromStorage, saveToStorage, removeFromStorage } from '@/lib/storage';
import { data as locationData, LocationData } from '@/data/LocationData';

const Record = () => {
  // States
  const [captureActive, setCaptureActive] = useState(false);
  const [debugImages, setDebugImages] = useState<{[key: string]: { reward: string; objective: string; }}>({});
  const [errorMessage, setErrorMessage] = useState('');
  const [extractedData, setExtractedData] = useState(() => loadFromStorage('extractedData', []));
  const [isCreateSessionDialogOpen, setIsCreateSessionDialogOpen] = useState(false);
  const { isDebugEnabled, toggleDebug } = useDebug();
  const [sessionName, setSessionName] = useState('');
  const [sessionId, setSessionId] = useState(humanId({
    capitalize: false,
    separator: '-',
  }));
  const [zones, setZones] = useState(() => loadFromStorage('userZones', {
    reward: { x: 0, y: 0, width: 100, height: 50 },
    objective: { x: 0, y: 0, width: 100, height: 50 },
    contractName: { x: 0, y: 0, width: 200, height: 30 }
  }));

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
    removeFromStorage('extractedData');
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
        objective: data.objective,
        contractName: data.contractName
      }));

      await contractService.createSession(sessionName, sessionId, contracts);
      
      toast({
        title: "Success",
        description: "Session created successfully"
      });
      
      setIsCreateSessionDialogOpen(false);
      setSessionName('');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create session",
        variant: "destructive"
      });
    }
  };

  // Function to clean station names
  const cleanStationNames = (records: any[]) => {
    // Ensure records is an array
    if (!Array.isArray(records)) {
      return [];
    }
    
    return records.map(record => ({
      ...record,
      objective: record.objective.map((obj: any) => ({
        ...obj,
        location: cleanLocationName(obj.location),
        deliveries: obj.deliveries?.map((del: any) => ({
          ...del,
          location: cleanLocationName(del.location)
        })) || []
      }))
    }));
  };

  // Function to search for location in LocationData
  const findLocationInLocationData = (locationName: string): LocationData | null => {
    const normalizedName = locationName.toLowerCase().trim();
    
    // Try exact match first
    let match = locationData.find(item => 
      item.PoiName.toLowerCase() === normalizedName
    );
    
    // If no exact match, try partial match
    if (!match) {
      match = locationData.find(item => 
        item.PoiName.toLowerCase().includes(normalizedName) ||
        normalizedName.includes(item.PoiName.toLowerCase())
      );
    }
    
    return match || null;
  };

  // Function to clean individual location names
  const cleanLocationName = (locationName: string): string => {
    if (!locationName) return locationName;
    
    let cleaned = locationName.trim();
    
    // Remove " above" and everything after it
    // e.g., "Seraphim Station above Crusader" => "Seraphim Station"
    const aboveIndex = cleaned.indexOf(' above');
    if (aboveIndex !== -1) {
      cleaned = cleaned.substring(0, aboveIndex);
    }
    
    // Remove " at" and everything after it
    // e.g., "Beautiful Glen Station at Crusader's L5 Lagrange point" => "Beautiful Glen Station"
    const atIndex = cleaned.indexOf(' at');
    if (atIndex !== -1) {
      cleaned = cleaned.substring(0, atIndex);
    }
    
    // Remove XXX-L\d pattern at the beginning
    // e.g., "CRU-L1 Ambitious Dream Station" => "Ambitious Dream Station"
    cleaned = cleaned.replace(/^[A-Z]{3}-L.\s+/, '');
    
    // If the cleaned name is empty or very short, try to find it in LocationData
    if (cleaned.length < 3) {
      const locationMatch = findLocationInLocationData(locationName);
      if (locationMatch) {
        cleaned = locationMatch.PoiName;
      }
    }
    
    return cleaned.trim();
  };

  const handleUpdateRecords = (updatedRecords: any) => {
    // Ensure we have valid records data
    if (!updatedRecords) {
      return;
    }
    
    // Clean station names before saving
    const cleanedRecords = cleanStationNames(updatedRecords);
    setExtractedData(_ => cleanedRecords);
  };

  // Setter function for CapturePeerHandler that handles both single records and full arrays
  const handleSetExtractedData = (dataOrUpdater: any) => {
    if (typeof dataOrUpdater === 'function') {
      // It's a setter function, call it with current data
      setExtractedData(prevData => {
        const newData = dataOrUpdater(prevData);
        // Clean the new data before setting
        return cleanStationNames(newData);
      });
    } else {
      // It's direct data, clean and set it
      const cleanedData = cleanStationNames(dataOrUpdater);
      setExtractedData(_ => cleanedData);
    }
  };

  useEffect(() => { extractedDataRef.current = extractedData; }, [extractedData]);
  useEffect(() => { debugImagesRef.current = debugImages; }, [debugImages]);
  useEffect(() => { zonesRef.current = zones; }, [zones]);

  // Persist extracted records to localStorage whenever they change
  useEffect(() => {
    saveToStorage('extractedData', extractedData);
  }, [extractedData]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h4 className="text-xl font-bold text-white">Record Contract</h4>
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
            onUpdate={handleUpdateRecords}
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
        setExtractedData={handleSetExtractedData}
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

