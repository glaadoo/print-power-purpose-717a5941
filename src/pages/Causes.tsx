import { useEffect, useState } from "react";
import DonationBarometer from "../components/DonationBarometer";
import { useCause } from "../context/CauseContext";
import { useToast } from "../ui/Toast";
import { supabase } from "@/lib/supabaseClient";

type Cause = { 
  id: string; 
  name: string; 
  summary?: string; 
  goal_cents?: number; 
  raised_cents?: number 
};

export default function Causes() {
  const [causes, setCauses] = useState<Cause[]>([]);
  const { setCause } = useCause();
  const { push } = useToast();
  
  useEffect(() => { 
    supabase
      .from('causes')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => setCauses(data || []));
  }, []);
  
  return (
    <main className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4 text-foreground">Choose a Cause</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {causes.map(c => (
          <article key={c.id} className="border border-border rounded p-4 bg-card shadow-sm">
            <div className="font-medium text-foreground">{c.name}</div>
            <p className="text-sm text-muted-foreground mt-1">{c.summary}</p>
            <DonationBarometer raised_cents={c.raised_cents || 0} goal_cents={c.goal_cents || 1} />
            <button 
              className="mt-3 w-full rounded bg-primary text-primary-foreground py-2 hover:opacity-90 focus:ring-2 focus:ring-ring transition-opacity"
              onClick={() => { 
                setCause({ id: c.id, name: c.name, summary: c.summary }); 
                push({ title: "Selected", body: c.name }); 
                window.location.href = "/products"; 
              }}
            >
              Support this cause
            </button>
          </article>
        ))}
      </div>
    </main>
  );
}
