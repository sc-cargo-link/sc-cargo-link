import React from 'react';

interface DebugImagesViewerProps {
  isDebugEnabled: boolean;
  debugImages: { [key: string]: { reward: string; objective: string; contractName: string } };
}

const DebugImagesViewer: React.FC<DebugImagesViewerProps> = ({ isDebugEnabled, debugImages }) => {
  if (!isDebugEnabled) return null;
  const lastEntry = Object.entries(debugImages).at(-1);
  if (!lastEntry) {
    return (
      <div id="canvas-container" className="flex flex-col items-center my-6 text-gray-400">No debug images yet.</div>
    );
  }
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
      <div className="flex flex-col items-center">
        <span className="text-xs text-purple-400 mb-1">Contract Name Zone (Canvas)</span>
        <canvas
          width={1}
          height={1}
          ref={el => {
            if (el && images.contractName) {
              const img = new window.Image();
              img.onload = () => {
                el.width = img.width;
                el.height = img.height;
                const ctx = el.getContext('2d');
                ctx.clearRect(0, 0, el.width, el.height);
                ctx.drawImage(img, 0, 0);
              };
              img.src = images.contractName;
            }
          }}
          className="border border-purple-400 rounded-lg max-w-xs h-auto bg-black shadow-lg"
          style={{ display: 'block' }}
        />
      </div>
    </div>
  );
};

export default DebugImagesViewer; 