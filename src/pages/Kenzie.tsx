import { useEffect, useState } from "react";
import { useToast } from "../ui/Toast";
import { useCause } from "../context/CauseContext";
import DonationBarometer from "../components/DonationBarometer";
import { supabase } from "@/integrations/supabase/client";

type Cause = { 
  id: string; 
  name: string; 
  summary?: string; 
  goal_cents?: number; 
  raised_cents?: number 
};

export default function Kenzie() {
  const [step, setStep] = useState<1 | 2>(1);
  const [intent, setIntent] = useState("");
  const [causes, setCauses] = useState<Cause[]>([]);
  const { setCause } = useCause();
  const { push } = useToast();

  useEffect(() => { 
    if (step === 2) { 
      supabase
        .from('causes')
        .select('*')
        .order('created_at', { ascending: false })
        .then(({ data }) => setCauses(data || []));
    } 
  }, [step]);

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <div className="text-3xl sm:text-5xl font-bold">🐾 Kenzie</div>
      
      {step === 1 && (
        <section className="mt-4">
          <h2 className="text-xl font-semibold text-foreground">What are we printing for today?</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
            {["School", "Nonprofit", "Personal mission"].map(lbl => (
              <button 
                key={lbl} 
                onClick={() => { setIntent(lbl); setStep(2); }} 
                className="px-4 py-3 rounded border border-border bg-card hover:bg-secondary focus:ring-2 focus:ring-ring transition-colors"
              >
                {lbl}
              </button>
            ))}
          </div>
        </section>
      )}
      
      {step === 2 && (
        <section className="mt-4">
          <h2 className="text-xl font-semibold mb-3 text-foreground">Pick a cause ({intent})</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {causes.map(c => (
              <article key={c.id} className="border border-border rounded p-4 bg-card shadow-sm">
                <div className="font-medium text-foreground">{c.name}</div>
                <p className="text-sm text-muted-foreground mt-1">{c.summary}</p>
                <DonationBarometer raised_cents={c.raised_cents || 0} goal_cents={c.goal_cents || 1} />
                <button
                  onClick={() => {
                    setCause({ id: c.id, name: c.name, summary: c.summary });
                    push({ title: "Nice choice!", body: `You're supporting ${c.name}.` });
                    window.location.href = "/products";
                  }}
                  className="mt-3 w-full rounded bg-primary text-primary-foreground py-2 hover:opacity-90 focus:ring-2 focus:ring-ring transition-opacity"
                >
                  Choose this cause
                </button>
              </article>
            ))}
          </div>
          <button onClick={() => setStep(1)} className="mt-6 underline text-foreground hover:opacity-70">
            Back
          </button>
        </section>
      )}
    </main>
  );
}
