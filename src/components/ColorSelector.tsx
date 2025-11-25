import { useState, useEffect } from 'react';
import { Palette } from 'lucide-react';

const COLOR_OPTIONS = [
  { id: 'cream', value: '#FDF4E3', name: 'Light Cream', textColor: '#222222' },
  { id: 'dark', value: '#1A1A1A', name: 'Dark', textColor: '#FDF4E3' },
  { id: 'brown', value: '#5C3B1E', name: 'Brown', textColor: '#FDF4E3' },
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
    const option = COLOR_OPTIONS.find(opt => opt.value === color);
    const textColor = option?.textColor || '#222222';
    
    // Apply to CSS variables for global theming
    document.documentElement.style.setProperty('--app-bg', color);
    document.documentElement.style.setProperty('--app-text', textColor);
    
    // Apply to root and body with smooth transition
    document.documentElement.style.setProperty('background-color', color);
    document.body.style.setProperty('background-color', color);
    document.body.style.setProperty('color', textColor);
    document.body.style.transition = 'background-color 0.5s ease, color 0.5s ease';
    
    // Force all white/gray backgrounds to use the selected color
    document.documentElement.classList.remove('bg-white', 'bg-gray-50', 'bg-gray-100');
    document.documentElement.style.setProperty('--background-override', color);
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
            
            {/* Reset Button */}
            <div className="mt-3 pt-3 border-t border-gray-200">
              <button
                onClick={() => handleColorChange(COLOR_OPTIONS[0].value)}
                className="w-full px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-150"
              >
                Reset to Default
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
