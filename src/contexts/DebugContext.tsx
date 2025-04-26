import React, { createContext, useContext, useState } from 'react';

interface DebugContextType {
  isDebugEnabled: boolean;
  toggleDebug: () => void;
}

const DebugContext = createContext<DebugContextType | undefined>(undefined);

export function DebugProvider({ children }: { children: React.ReactNode }) {
  const [isDebugEnabled, setIsDebugEnabled] = useState(false);

  const toggleDebug = () => {
    setIsDebugEnabled(prev => !prev);
  };

  return (
    <DebugContext.Provider value={{ isDebugEnabled, toggleDebug }}>
      {children}
    </DebugContext.Provider>
  );
}

export function useDebug() {
  const context = useContext(DebugContext);
  if (context === undefined) {
    throw new Error('useDebug must be used within a DebugProvider');
  }
  return context;
} 