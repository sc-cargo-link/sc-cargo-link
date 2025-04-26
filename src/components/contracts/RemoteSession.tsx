import React, { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { QrCode, Camera } from 'lucide-react';
import { Peer } from 'peerjs';
import RecordsTable from '@/components/contracts/RecordsTable';

const RemoteSession = () => {
  const [sessionId, setSessionId] = useState('');
  const [conn, setConn] = useState(null);
  const [connected, setConnected] = useState(false);
  const [records, setRecords] = useState([]);
  const [debugImages, setDebugImages] = useState({});
  const peerRef = useRef(null);
  const [errorMessage, setErrorMessage] = useState('');

  // QR code scanning logic placeholder
  const handleScanQR = () => {
    // Implement QR code scanning and setSessionId
  };

  const handleConnect = () => {
    if (!sessionId) return;
    if (!peerRef.current) peerRef.current = new Peer();
    // if (conn) conn.close();
    const connection = peerRef.current.connect(sessionId, { reliable: true });
    setConn(connection);
    connection.on('open', () => {
      console.log("Open on remote");
      setConnected(true);
      setErrorMessage('');
    });
    connection.on('data', (data) => {
      console.log(data);
      if (data.type === 'records') {
        setRecords(data.records);
        setDebugImages(data.debugImages || {});
      }
      if (data.type === 'error') {
        setErrorMessage(data.message);
      }
    });
    connection.on('close', () => {
      console.log("Close on remote");
      setConnected(false);
    });
    peerRef.current.on('disconnected', () => {
      console.log("Disconnected on remote");
      setConnected(false);
    });
    peerRef.current.on('error', (error) => {
      console.log("Error on remote");
      console.error(error);
      setErrorMessage(error.message);
    });
    peerRef.current.on('close', (call) => {
      console.log("Close on remote");
      setConnected(false);
    });
  };

  const handleCapture = () => {
    if (conn && connected) {
      console.log("Sending capture request");
      conn.send({ type: 'capture-request' });
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 space-y-8">
      <h1 className="text-2xl font-bold text-white mb-4">Remote Session</h1>
      <div className="flex items-center space-x-2">
        <Input
          value={sessionId}
          onChange={e => setSessionId(e.target.value)}
          placeholder="Enter session ID"
          className="bg-space-medium border-neon-blue/20"
        />
        <Button onClick={handleConnect} className="bg-neon-blue text-space-dark hover:bg-neon-blue/90">
          Connect
        </Button>
        <Button variant="outline" className="border-neon-blue/50" onClick={handleScanQR}>
          <QrCode className="h-4 w-4 mr-2" />
          Scan QR
        </Button>
      </div>
      <Button
        onClick={handleCapture}
        disabled={!connected}
        className="bg-green-600 hover:bg-green-700 w-full"
      >
        <Camera className="h-4 w-4 mr-2" />
        Capture
      </Button>
      <div id="error-message" className="text-red-500">
        {errorMessage}
      </div>
      <RecordsTable records={records} debugImages={debugImages} />
    </div>
  );
};

export default RemoteSession; 