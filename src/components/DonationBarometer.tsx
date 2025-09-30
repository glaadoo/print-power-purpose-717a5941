export default function DonationBarometer({ 
  raised_cents, 
  goal_cents 
}: { 
  raised_cents: number; 
  goal_cents: number 
}) {
  const pct = Math.max(0, Math.min(100, Math.round((raised_cents / Math.max(1, goal_cents)) * 100)));
  
  return (
    <div className="mt-2">
      <div className="h-2 w-full bg-gray-200 rounded">
        <div 
          className="h-2 bg-green-600 rounded transition-[width] duration-700 ease-out" 
          style={{ width: `${pct}%` }} 
          role="progressbar" 
          aria-valuemin={0} 
          aria-valuemax={100} 
          aria-valuenow={pct}
        />
      </div>
      <div className="text-xs text-gray-600 mt-1">{pct}% funded</div>
    </div>
  );
}
