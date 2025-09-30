import React, { createContext, useContext, useEffect, useState } from "react";

type Cause = { id: string; name: string; summary?: string };
type Ctx = { 
  cause: Cause | null; 
  setCause: (c: Cause | null) => void; 
  clear: () => void; 
};

const CauseCtx = createContext<Ctx>({ 
  cause: null, 
  setCause: () => {}, 
  clear: () => {} 
});

export function CauseProvider({ children }: { children: React.ReactNode }) {
  const [cause, setCauseState] = useState<Cause | null>(null);
  
  useEffect(() => { 
    const raw = localStorage.getItem("selectedCause"); 
    if (raw) setCauseState(JSON.parse(raw)); 
  }, []);
  
  const setCause = (c: Cause | null) => { 
    setCauseState(c); 
    c 
      ? localStorage.setItem("selectedCause", JSON.stringify(c)) 
      : localStorage.removeItem("selectedCause"); 
  };
  
  return (
    <CauseCtx.Provider value={{ cause, setCause, clear: () => setCause(null) }}>
      {children}
    </CauseCtx.Provider>
  );
}

export const useCause = () => useContext(CauseCtx);
