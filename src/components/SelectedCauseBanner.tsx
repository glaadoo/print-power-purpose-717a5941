import { useCause } from "../context/CauseContext";

export default function SelectedCauseBanner() {
  const { cause, clear } = useCause();
  if (!cause) return null;
  
  return (
    <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-4 flex items-center justify-between">
      <div>
        <div className="text-sm">You're supporting</div>
        <div className="font-medium">{cause.name}</div>
      </div>
      <div className="space-x-2">
        <a href="/causes" className="underline text-sm">Change</a>
        <button onClick={clear} className="text-sm underline">Clear</button>
      </div>
    </div>
  );
}
