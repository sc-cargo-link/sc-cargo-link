import React, { useEffect, useImperativeHandle, forwardRef, useRef } from 'react';
import { nanoid } from 'nanoid';
import Tesseract from 'tesseract.js';
import { Peer } from 'peerjs';
import { objectiveParser, rewardParser } from '@/lib/parser';

function sharpenCanvas(canvas: HTMLCanvasElement) {
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

export interface CapturePeerHandlerRef {
  captureScreen: () => void;
}

interface CapturePeerHandlerProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  zonesRef: React.RefObject<any>;
  sessionId: string;
  setExtractedData: React.Dispatch<any>;
  setDebugImages: React.Dispatch<any>;
  setErrorMessage: React.Dispatch<any>;
  isDebugEnabled: boolean;
  extractedDataRef: React.RefObject<any>;
  debugImagesRef: React.RefObject<any>;
  connRef: React.MutableRefObject<any>;
  peerRef: React.MutableRefObject<any>;
}

const CapturePeerHandler = forwardRef<CapturePeerHandlerRef, CapturePeerHandlerProps>(({
  videoRef,
  canvasRef,
  zonesRef,
  sessionId,
  setExtractedData,
  setDebugImages,
  setErrorMessage,
  isDebugEnabled,
  extractedDataRef,
  debugImagesRef,
  connRef,
  peerRef
}, ref) => {
  const schedulerRef = useRef<any>(null);
  const workersRef = useRef<any[]>([]);
  const jobCountRef = useRef<number>(0);
  const reinitPromiseRef = useRef<Promise<void> | null>(null);

  const initScheduler = async () => {
    const scheduler = Tesseract.createScheduler();
    const workers = [];
    for (let i = 0; i < 2; i++) {
      const worker = await Tesseract.createWorker('eng');
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ-/.',
        preserve_interword_spaces: '1'
      })
      await worker.reinitialize('eng');
      scheduler.addWorker(worker);
      workers.push(worker);
    }
    schedulerRef.current = scheduler;
    workersRef.current = workers;
    jobCountRef.current = 0;
  };

  const terminateScheduler = async () => {
    console.log("terminateScheduler");
    if (schedulerRef.current) {
      await schedulerRef.current.terminate();
      schedulerRef.current = null;
    }
    if (workersRef.current.length > 0) {
      workersRef.current = [];
    }
  };

  useEffect(() => {
    let isMounted = true;
    reinitPromiseRef.current = initScheduler();
    return () => {
      isMounted = false;
      terminateScheduler();
    };
  }, []);

  const ensureScheduler = async () => {
    if (reinitPromiseRef.current) {
      await reinitPromiseRef.current;
    }
  };

  const captureScreen = async () => {
    await ensureScheduler();
    if (!videoRef.current || !canvasRef.current || !schedulerRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    // Extract text from reward zone
    const rewardCanvas = document.createElement('canvas');
    const rewardContext = rewardCanvas.getContext('2d');
    rewardCanvas.width = zonesRef.current.reward.width;
    rewardCanvas.height = zonesRef.current.reward.height;
    rewardContext.drawImage(
      video,
      zonesRef.current.reward.x, zonesRef.current.reward.y, zonesRef.current.reward.width, zonesRef.current.reward.height,
      0, 0, zonesRef.current.reward.width, zonesRef.current.reward.height
    );
    // Extract text from objective zone
    const objectiveCanvas = document.createElement('canvas');
    const objectiveContext = objectiveCanvas.getContext('2d');
    objectiveCanvas.width = zonesRef.current.objective.width;
    objectiveCanvas.height = zonesRef.current.objective.height;
    objectiveContext.drawImage(
      video,
      zonesRef.current.objective.x, zonesRef.current.objective.y, zonesRef.current.objective.width, zonesRef.current.objective.height,
      0, 0, zonesRef.current.objective.width, zonesRef.current.objective.height
    );
    // Sharpen reward and objective canvases
    sharpenCanvas(rewardCanvas);
    sharpenCanvas(objectiveCanvas);
    try {
      // Restart scheduler after 100 jobs
      jobCountRef.current += 2;
      if (jobCountRef.current > 100) {
        if (!reinitPromiseRef.current) {
          reinitPromiseRef.current = (async () => {
            await terminateScheduler();
            await initScheduler();
            reinitPromiseRef.current = null;
          })();
        }
        await reinitPromiseRef.current;
      }
      const scheduler = schedulerRef.current;
      const [rewardText, objectiveText] = await Promise.all([
        scheduler.addJob('recognize', rewardCanvas.toDataURL(), 'eng'),
        scheduler.addJob('recognize', objectiveCanvas.toDataURL(), 'eng')
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
        if (connRef.current) {
          connRef.current.send({ type: 'error', message: 'No text found in the reward zone' });
        }
        setErrorMessage('No text found in the reward zone');
        return;
      }
      if (objectiveText.data.text.trim() === '') {
        if (connRef.current) {
          connRef.current.send({ type: 'error', message: 'No text found in the objective zone' });
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
          reward: rewardParser(rewardText.data.text.trim()),
          objective: objectiveParser(objectiveText.data.text.trim())
        }
      ]);
    } catch (error) {
      console.error('Error extracting text:', error);
      setErrorMessage(error.message);
    }
  };

  // Handle peer connection
  const handleConnection = (conn) => {
    connRef.current = conn;
    let interval = null;
    conn.on('data', (data) => {
      console.log("data", data);
      if (data.type === 'capture-request') {
        captureScreen();
      }
      if (data.type === 'records-update') {
        setExtractedData(data.records);
      }
    });
    interval = setInterval(() => {
      conn.send({
        type: 'records',
        records: extractedDataRef.current,
        debugImages: debugImagesRef.current
      });
    }, 300);
    conn.on('close', () => {
      if (interval) clearInterval(interval);
    });
    conn.on('error', (error) => {
      setErrorMessage(error.message);
    });
  };

  // Initialize peer
  const initPeer = () => {
    if (!peerRef.current) {
      peerRef.current = new Peer(sessionId);
      peerRef.current.on('open', () => {
        setErrorMessage('');
      });
      peerRef.current.on('connection', handleConnection);
      peerRef.current.on('error', (error) => {
        setErrorMessage(error.message);
      });
    }
  };

  // Peer handling
  useEffect(() => {
    initPeer();
  }, [sessionId]);

  useImperativeHandle(ref, () => ({
    captureScreen
  }));

  return null;
});

export default CapturePeerHandler; 