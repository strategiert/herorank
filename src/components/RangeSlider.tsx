import { useState, useCallback, useRef, useEffect } from 'react';

interface RangeSliderProps {
  min?: number;
  max?: number;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  label: string;
  icon?: string;
  color?: string;
  step?: number;
}

export function RangeSlider({
  min = 0,
  max = 100,
  value,
  onChange,
  label,
  icon,
  color = '#3B82F6',
  step = 1
}: RangeSliderProps) {
  const [localValue, setLocalValue] = useState(value);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync with external value
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounced onChange
  const handleChange = useCallback((newValue: [number, number]) => {
    setLocalValue(newValue);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      onChange(newValue);
    }, 150);
  }, [onChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMin = Math.min(Number(e.target.value), localValue[1] - step);
    handleChange([newMin, localValue[1]]);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMax = Math.max(Number(e.target.value), localValue[0] + step);
    handleChange([localValue[0], newMax]);
  };

  // Calculate positions for visual track
  const minPercent = ((localValue[0] - min) / (max - min)) * 100;
  const maxPercent = ((localValue[1] - min) / (max - min)) * 100;

  const isModified = localValue[0] !== min || localValue[1] !== max;

  return (
    <div className="w-full">
      {/* Label Row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {icon && <span className="text-sm">{icon}</span>}
          <span className="text-xs text-white/70">{label}</span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className="text-xs font-mono px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: isModified ? `${color}20` : 'rgba(255,255,255,0.05)',
              color: isModified ? color : 'rgba(255,255,255,0.5)'
            }}
          >
            {localValue[0]}
          </span>
          <span className="text-white/30 text-xs">-</span>
          <span
            className="text-xs font-mono px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: isModified ? `${color}20` : 'rgba(255,255,255,0.05)',
              color: isModified ? color : 'rgba(255,255,255,0.5)'
            }}
          >
            {localValue[1]}
          </span>
        </div>
      </div>

      {/* Dual Range Slider */}
      <div className="relative h-6 flex items-center">
        {/* Background Track */}
        <div className="absolute w-full h-1.5 bg-white/10 rounded-full" />

        {/* Active Track */}
        <div
          className="absolute h-1.5 rounded-full transition-all"
          style={{
            left: `${minPercent}%`,
            width: `${maxPercent - minPercent}%`,
            backgroundColor: isModified ? color : 'rgba(255,255,255,0.2)'
          }}
        />

        {/* Min Slider */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localValue[0]}
          onChange={handleMinChange}
          className="absolute w-full h-6 appearance-none bg-transparent pointer-events-none
                     [&::-webkit-slider-thumb]:pointer-events-auto
                     [&::-webkit-slider-thumb]:appearance-none
                     [&::-webkit-slider-thumb]:w-4
                     [&::-webkit-slider-thumb]:h-4
                     [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:bg-white
                     [&::-webkit-slider-thumb]:border-2
                     [&::-webkit-slider-thumb]:cursor-pointer
                     [&::-webkit-slider-thumb]:shadow-md
                     [&::-webkit-slider-thumb]:transition-transform
                     [&::-webkit-slider-thumb]:hover:scale-110
                     [&::-moz-range-thumb]:pointer-events-auto
                     [&::-moz-range-thumb]:appearance-none
                     [&::-moz-range-thumb]:w-4
                     [&::-moz-range-thumb]:h-4
                     [&::-moz-range-thumb]:rounded-full
                     [&::-moz-range-thumb]:bg-white
                     [&::-moz-range-thumb]:border-2
                     [&::-moz-range-thumb]:cursor-pointer
                     [&::-moz-range-thumb]:shadow-md"
          style={{
            // @ts-expect-error CSS custom property
            '--tw-border-opacity': 1,
          }}
        />

        {/* Max Slider */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={localValue[1]}
          onChange={handleMaxChange}
          className="absolute w-full h-6 appearance-none bg-transparent pointer-events-none
                     [&::-webkit-slider-thumb]:pointer-events-auto
                     [&::-webkit-slider-thumb]:appearance-none
                     [&::-webkit-slider-thumb]:w-4
                     [&::-webkit-slider-thumb]:h-4
                     [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:bg-white
                     [&::-webkit-slider-thumb]:border-2
                     [&::-webkit-slider-thumb]:cursor-pointer
                     [&::-webkit-slider-thumb]:shadow-md
                     [&::-webkit-slider-thumb]:transition-transform
                     [&::-webkit-slider-thumb]:hover:scale-110
                     [&::-moz-range-thumb]:pointer-events-auto
                     [&::-moz-range-thumb]:appearance-none
                     [&::-moz-range-thumb]:w-4
                     [&::-moz-range-thumb]:h-4
                     [&::-moz-range-thumb]:rounded-full
                     [&::-moz-range-thumb]:bg-white
                     [&::-moz-range-thumb]:border-2
                     [&::-moz-range-thumb]:cursor-pointer
                     [&::-moz-range-thumb]:shadow-md"
        />
      </div>
    </div>
  );
}
