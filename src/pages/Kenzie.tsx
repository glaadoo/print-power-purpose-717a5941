import { useEffect, useState } from "react";
import { useToast } from "../ui/Toast";
import { useCause } from "../context/CauseContext";
import DonationBarometer from "../components/DonationBarometer";
import Layout from "../components/Layout";
import GlassCard from "../components/GlassCard";

type Cause = { id:string; name:string; summary?:string; goal_cents?:number; raised_cents?:number };

export default function Kenzie() {
  const [step, setStep] = useState<1|2>(1);
  const [intent, setIntent] = useState("");
  const [causes, setCauses] = useState<Cause[]>([]);
  const { setCause } = useCause();
  const { push } = useToast();

  useEffect(()=>{ if(step===2){ fetch("/api/causes").then(r=>r.json()).then(d=>setCauses(d.causes||[])); } },[step]);

  return (
    <Layout title="Kenzie">
      <GlassCard>
        <div className="text-center">
          <div className="text-3xl sm:text-5xl font-bold">🐾 Kenzie</div>
          {step===1 && (
            <section className="mt-6">
              <h2 className="text-xl font-semibold">What are we printing for today?</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                {["School","Nonprofit","Personal mission"].map(lbl=>(
                  <button key={lbl} onClick={()=>{setIntent(lbl); setStep(2);}}
                          className="px-4 py-3 rounded border border-white/40 bg-white/20 backdrop-blur hover:bg-white/30 focus:ring-2">
                    {lbl}
                  </button>
                ))}
              </div>
            </section>
          )}
          {step===2 && (
            <section className="mt-6 text-left">
              <h2 className="text-xl font-semibold mb-3 text-center">Pick a cause ({intent})</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {causes.map(c=>(
                  <article key={c.id} className="glass card-padding">
                    <div className="font-medium">{c.name}</div>
                    <p className="text-sm text-gray-800 mt-1">{c.summary}</p>
                    <DonationBarometer raised_cents={c.raised_cents||0} goal_cents={c.goal_cents||1}/>
                    <button
                      onClick={()=>{
                        setCause({id:c.id, name:c.name, summary:c.summary});
                        push({title:"Nice choice!", body:`You're supporting ${c.name}.`});
                        window.location.href="/products";
                      }}
                      className="mt-3 w-full rounded bg-black text-white py-2 focus:ring-2"
                    >
                      Choose this cause
                    </button>
                  </article>
                ))}
              </div>
              <div className="text-center">
                <button onClick={()=>setStep(1)} className="mt-6 underline">Back</button>
              </div>
            </section>
          )}
        </div>
      </GlassCard>
    </Layout>
  );
}
