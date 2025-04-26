import React, { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { QrCode, Camera } from 'lucide-react';
import { Peer } from 'peerjs';
import RecordsTable from '@/components/contracts/RecordsTable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { log } from 'console';

const RemoteSession = () => {
  const [sessionId, setSessionId] = useState('');
  const [conn, setConn] = useState(null);
  const [connected, setConnected] = useState(false);
  const [records, setRecords] = useState([]);
  const [debugImages, setDebugImages] = useState({});
  const peerRef = useRef(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const qrScannerRef = useRef(null);
  const qrRegionId = 'qr-reader-region';

  const handleScanQR = () => {
    setQrDialogOpen(true);
  };

  const handleQrDialogOpenChange = (open) => {
    setQrDialogOpen(open);
  };

  React.useEffect(() => {
    if (qrDialogOpen) {
      // Delay scanner initialization until the DOM is ready
      setTimeout(() => {
        if (!qrScannerRef.current && document.getElementById(qrRegionId)) {
          qrScannerRef.current = new Html5QrcodeScanner(
            qrRegionId,
            { fps: 10, qrbox: { width: 250, height: 250 } },
            false
          );
          qrScannerRef.current.render(
            (decodedText) => {
              setSessionId(_ => decodedText);
              setQrDialogOpen(false);
              setTimeout(() => {
                handleConnect(decodedText);
              }, 0);
            },
            (error) => {
              // Optionally handle scan errors
            }
          );
        }
      }, 0);
    } else {
      if (qrScannerRef.current) {
        qrScannerRef.current.clear().then(() => {
          qrScannerRef.current = null;
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrDialogOpen]);

  const createAndBindConnection = (peerInstance, sessionId) => {
    if (conn) {
      conn.close();
      setConn(null);
      setConnected(false);
    }
    const connection = peerInstance.connect(sessionId, { reliable: true });
    setConn(connection);
    connection.on('open', () => {
      setConnected(true);
      setErrorMessage('');
      setLoading(false);
    });
    connection.on('data', (data) => {
      console.log("data", data);
      if (data.type === 'records') {
        setRecords(data.records);
        setDebugImages(data.debugImages || {});
      }
      if (data.type === 'error') {
        setErrorMessage(data.message);
      }
    });
    connection.on('close', () => {
      setConnected(false);
      setLoading(false);
    });
  };

  const handleConnect = (id = undefined) => {
    const connectId = id || sessionId;
    console.log("handleConnect", connectId);
    if (!connectId) return;
    setLoading(true);
    if (!peerRef.current || peerRef.current.disconnected) {
      peerRef.current = new Peer();
      peerRef.current.on('open', () => {
        createAndBindConnection(peerRef.current, connectId);
      });
      peerRef.current.on('disconnected', () => {
        setConnected(false);
        setLoading(false);
      });
      peerRef.current.on('error', (error) => {
        setErrorMessage(error.message);
        setLoading(false);
      });
      peerRef.current.on('close', () => {
        setConnected(false);
        setLoading(false);
      });
    } else {
      createAndBindConnection(peerRef.current, connectId);
    }
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
        <Button onClick={() => handleConnect()} className="bg-neon-blue text-space-dark hover:bg-neon-blue/90" disabled={loading || connected}>
          {loading ? (
            <svg className="animate-spin h-4 w-4 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
          ) : 'Connect'}
        </Button>
        <Dialog open={qrDialogOpen} onOpenChange={handleQrDialogOpenChange}>
          <DialogTrigger asChild>
            <Button variant="outline" className="border-neon-blue/50" onClick={handleScanQR}>
              <QrCode className="h-4 w-4 mr-2" />
              Scan QR
            </Button>
          </DialogTrigger>
          <DialogContent className="flex flex-col items-center gap-4 bg-white !text-gray-900 shadow-lg rounded-xl max-w-md w-full">
            <DialogHeader>
              <DialogTitle>Scan Session QR Code</DialogTitle>
            </DialogHeader>
            <div id={qrRegionId} className="w-full flex justify-center items-center min-h-[320px]" />
            <div className="text-xs text-gray-400 text-center">Point your camera at a session QR code</div>
          </DialogContent>
        </Dialog>
      </div>
      <Button
        onClick={handleCapture}
        disabled={!connected}
        className={connected ? "bg-green-600 hover:bg-green-700 w-full" : "bg-gray-600 hover:bg-gray-700 w-full"}
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