import { useState, useEffect } from 'react';
import { Palette } from 'lucide-react';

const COLOR_OPTIONS = [
  { id: 'cream', value: '#FDF4E3', name: 'Light Cream' },
  { id: 'beige', value: '#FCE7C8', name: 'Warm Beige' },
  { id: 'tan', value: '#E1D5C0', name: 'Soft Tan' },
];

export default function ColorSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState(COLOR_OPTIONS[0].value);

  useEffect(() => {
    // Load saved color from localStorage
    const savedColor = localStorage.getItem('siteBackgroundColor');
    if (savedColor) {
      setSelectedColor(savedColor);
      applyColor(savedColor);
    }
  }, []);

  const applyColor = (color: string) => {
    document.documentElement.style.setProperty('background', color, 'important');
    document.body.style.setProperty('background', color, 'important');
    document.body.style.transition = 'background 0.5s ease';
    console.log('Color applied:', color);
  };

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
    applyColor(color);
    localStorage.setItem('siteBackgroundColor', color);
    setIsOpen(false);
  };

  return (
    <div className="fixed top-20 right-4 z-[100]">
      <div className="relative">
        {/* Toggle Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-white/95 backdrop-blur-sm rounded-full shadow-xl border-2 border-gray-300 hover:bg-white hover:border-gray-400 transition-all duration-200"
          aria-label="Change background color"
        >
          <Palette size={20} className="text-gray-700" />
          <span className="text-sm font-medium text-gray-700">Colors</span>
        </button>

        {/* Color Options Dropdown */}
        {isOpen && (
          <div className="absolute top-full right-0 mt-2 bg-white/95 backdrop-blur-sm rounded-lg shadow-xl border border-gray-200 p-3 min-w-[200px]">
            <p className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wide">
              Select Background
            </p>
            <div className="space-y-2">
              {COLOR_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleColorChange(option.value)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors duration-150 group"
                >
                  <div
                    className="w-8 h-8 rounded-full border-2 border-gray-300 group-hover:border-gray-400 transition-all duration-150"
                    style={{ backgroundColor: option.value }}
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {option.name}
                  </span>
                  {selectedColor === option.value && (
                    <span className="ml-auto text-xs text-primary font-semibold">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
