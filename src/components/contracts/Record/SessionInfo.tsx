import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Copy, QrCode } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import QRCode from 'react-qr-code';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

interface SessionInfoProps {
  sessionId: string;
}

const SessionInfo: React.FC<SessionInfoProps> = ({ sessionId }) => (
  <div className="space-y-2 flex-1 max-w-xs">
    <p className="text-sm font-medium text-gray-400">Your Session ID</p>
    <div className="relative">
      <Input value={sessionId} readOnly className="bg-space-medium border-neon-blue/20 pr-20" />
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
      <Dialog>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="absolute right-10 top-1/2 -translate-y-1/2 p-1"
                aria-label="Show QR Code"
              >
                <QrCode className="w-5 h-5 text-neon-blue" />
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>Show QR code for this session</TooltipContent>
        </Tooltip>
        <DialogContent className="flex flex-col items-center gap-4 bg-white !text-gray-900 shadow-lg rounded-xl">
          <DialogHeader>
            <DialogTitle>Session QR Code</DialogTitle>
          </DialogHeader>
          <QRCode value={sessionId} size={300} className="rounded-lg w-full max-w-xs md:max-w-md mx-auto" />
          <div className="text-xs text-gray-400 break-all">{sessionId}</div>
        </DialogContent>
      </Dialog>
    </div>
  </div>
);

export default SessionInfo; 