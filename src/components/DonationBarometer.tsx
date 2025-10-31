export default function DonationBarometer({ 
  raised_cents, 
  goal_cents 
}: { 
  raised_cents: number; 
  goal_cents: number 
}) {
  const pct = Math.max(0, Math.min(100, Math.round((raised_cents / Math.max(1, goal_cents)) * 100)));
  const raised = (raised_cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });
  const goal = (goal_cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 });
  
  return (
    <div>
      <div className="flex justify-between items-baseline mb-2">
        <div className="text-2xl font-bold text-white">{raised}</div>
        <div className="text-sm text-white/70">raised of {goal} goal</div>
      </div>
      <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
        <div 
          className="h-2 bg-green-500 rounded-full transition-[width] duration-700 ease-out" 
          style={{ width: `${pct}%` }} 
          role="progressbar" 
          aria-valuemin={0} 
          aria-valuemax={100} 
          aria-valuenow={pct}
        />
      </div>
      <div className="text-xs text-white/60 mt-2">{pct}% funded</div>
    </div>
  );
}
