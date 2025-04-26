import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CreateSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionName: string;
  setSessionName: (name: string) => void;
  handleCreateSession: () => void;
}

const CreateSessionDialog: React.FC<CreateSessionDialogProps> = ({
  open,
  onOpenChange,
  sessionName,
  setSessionName,
  handleCreateSession
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
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
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button onClick={handleCreateSession}>
          Create
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default CreateSessionDialog; 