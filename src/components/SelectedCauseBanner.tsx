import { useCause } from "../context/CauseContext";

export default function SelectedCauseBanner() {
  const { cause, nonprofit, clear, clearAll } = useCause();
  
  if (!cause && !nonprofit) return null;
  
  return (
    <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-4 flex items-center justify-between">
      <div>
        <div className="text-sm text-gray-700">You're supporting</div>
        {cause && <div className="font-medium text-gray-900">{cause.name}</div>}
        {nonprofit && (
          <div className="font-medium text-gray-900">
            {nonprofit.name}
            {nonprofit.ein && <span className="text-sm text-gray-600 ml-2">(EIN: {nonprofit.ein})</span>}
          </div>
        )}
      </div>
      <div className="space-x-2">
        <a href="/causes" className="underline text-sm text-gray-700 hover:text-gray-900">Change</a>
        <button onClick={clearAll} className="text-sm underline text-gray-700 hover:text-gray-900">Clear</button>
      </div>
    </div>
  );
}
