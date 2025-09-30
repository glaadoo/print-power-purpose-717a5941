import React, { createContext, useContext, useEffect, useState } from "react";

type Msg = { id?: number; title: string; body?: string };
const ToastCtx = createContext<{ push: (m: Msg) => void }>({ push: () => {} });
let counter = 1;

export function useToast() { 
  return useContext(ToastCtx); 
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Msg[]>([]);
  const push = (m: Msg) => setItems(cur => [...cur, { id: counter++, ...m }]);
  
  useEffect(() => { 
    if (!items.length) return; 
    const t = setTimeout(() => setItems(cur => cur.slice(1)), 2500); 
    return () => clearTimeout(t); 
  }, [items]);
  
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {items.map(m => (
          <div key={m.id} className="bg-black text-white rounded px-4 py-3 shadow">
            <div className="font-semibold">{m.title}</div>
            {m.body && <div className="text-sm opacity-80">{m.body}</div>}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
