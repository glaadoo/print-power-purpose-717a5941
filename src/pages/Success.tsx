import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useCause } from "../context/CauseContext";

export default function Success() {
  const [searchParams] = useSearchParams();
  const { cause, clear } = useCause();
  const [sessionId] = useState(searchParams.get("session_id"));

  useEffect(() => {
    // Clear the cause selection after successful payment
    if (sessionId) {
      const timer = setTimeout(() => clear(), 3000);
      return () => clearTimeout(timer);
    }
  }, [sessionId, clear]);

  return (
    <main className="p-6 max-w-2xl mx-auto text-center">
      <div className="bg-card border border-border rounded-lg p-8 mt-8">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-3xl font-bold text-foreground mb-3">Payment Successful!</h1>
        {cause && (
          <p className="text-lg text-muted-foreground mb-6">
            Your donation is now live for <span className="font-semibold text-foreground">{cause.name}</span>!
          </p>
        )}
        <p className="text-sm text-muted-foreground mb-8">
          Thank you for supporting a great cause through Print Power Purpose.
        </p>
        
        <a 
          href="/products" 
          className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-md font-medium hover:opacity-90 focus:ring-2 focus:ring-ring transition-opacity"
        >
          Back to Products
        </a>
      </div>
    </main>
  );
}
