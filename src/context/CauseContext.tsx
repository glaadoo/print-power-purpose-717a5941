import React, { createContext, useContext, useEffect, useState } from "react";

type Cause = { id: string; name: string; summary?: string };
type Nonprofit = { id: string; name: string; ein?: string; city?: string; state?: string };

type Ctx = { 
  cause: Cause | null; 
  setCause: (c: Cause | null) => void;
  nonprofit: Nonprofit | null;
  setNonprofit: (n: Nonprofit | null) => void;
  clear: () => void;
  clearAll: () => void;
};

const CauseCtx = createContext<Ctx>({ 
  cause: null, 
  setCause: () => {},
  nonprofit: null,
  setNonprofit: () => {},
  clear: () => {},
  clearAll: () => {}
});

export function CauseProvider({ children }: { children: React.ReactNode }) {
  const [cause, setCauseState] = useState<Cause | null>(null);
  const [nonprofit, setNonprofitState] = useState<Nonprofit | null>(null);
  
  useEffect(() => { 
    const causeRaw = localStorage.getItem("selectedCause"); 
    const nonprofitRaw = localStorage.getItem("selectedNonprofit");
    if (causeRaw) setCauseState(JSON.parse(causeRaw)); 
    if (nonprofitRaw) setNonprofitState(JSON.parse(nonprofitRaw));
  }, []);
  
  const setCause = (c: Cause | null) => { 
    setCauseState(c); 
    c 
      ? localStorage.setItem("selectedCause", JSON.stringify(c)) 
      : localStorage.removeItem("selectedCause"); 
  };

  const setNonprofit = (n: Nonprofit | null) => {
    setNonprofitState(n);
    n
      ? localStorage.setItem("selectedNonprofit", JSON.stringify(n))
      : localStorage.removeItem("selectedNonprofit");
  };

  const clearAll = () => {
    setCause(null);
    setNonprofit(null);
  };
  
  return (
    <CauseCtx.Provider value={{ 
      cause, 
      setCause, 
      nonprofit,
      setNonprofit,
      clear: () => setCause(null),
      clearAll
    }}>
      {children}
    </CauseCtx.Provider>
  );
}

export const useCause = () => useContext(CauseCtx);
