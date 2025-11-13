import { useEffect, useState } from "react";

export default function KenzieBadge() {
  const [bounce, setBounce] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setBounce(true);
      setTimeout(() => setBounce(false), 1000);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div 
      className="absolute bottom-6 right-6 md:right-6 md:bottom-6 left-1/2 md:left-auto -translate-x-1/2 md:translate-x-0 z-20 group"
      title="Kenzie is here if you need help."
    >
      <div 
        className={`
          w-16 h-16 rounded-full 
          bg-gradient-to-br from-primary to-primary/80 
          shadow-lg
          flex items-center justify-center
          animate-[pulse_3s_ease-in-out_infinite]
          ${bounce ? 'animate-bounce' : ''}
          motion-reduce:animate-none
        `}
      >
        <span className="text-3xl">🐾</span>
      </div>
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-black/80 text-white text-xs px-3 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        Kenzie is here if you need help.
      </div>
    </div>
  );
}
