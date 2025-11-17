import { useLocation } from "react-router-dom";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function DebugPageIndicator() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="fixed bottom-4 left-4 z-[9999] font-mono text-xs">
      <div className="bg-yellow-400 text-black rounded-lg shadow-xl border-2 border-yellow-600 overflow-hidden">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full px-3 py-2 flex items-center justify-between gap-2 hover:bg-yellow-300 transition-colors"
        >
          <span className="font-bold">🐛 DEBUG</span>
          {collapsed ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
        </button>
        
        {!collapsed && (
          <div className="px-3 py-2 bg-yellow-300 border-t-2 border-yellow-600 space-y-1">
            <div>
              <span className="font-bold">Route:</span>
              <span className="ml-2 bg-yellow-100 px-2 py-0.5 rounded">
                {location.pathname}
              </span>
            </div>
            
            {location.search && (
              <div>
                <span className="font-bold">Query:</span>
                <span className="ml-2 bg-yellow-100 px-2 py-0.5 rounded">
                  {location.search}
                </span>
              </div>
            )}
            
            {location.hash && (
              <div>
                <span className="font-bold">Hash:</span>
                <span className="ml-2 bg-yellow-100 px-2 py-0.5 rounded">
                  {location.hash}
                </span>
              </div>
            )}
            
            <div className="pt-1 border-t border-yellow-600 mt-2">
              <span className="font-bold">ppp_access:</span>
              <span className="ml-2 bg-yellow-100 px-2 py-0.5 rounded">
                {typeof window !== "undefined" 
                  ? localStorage.getItem("ppp_access") || "❌ not set"
                  : "N/A"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
