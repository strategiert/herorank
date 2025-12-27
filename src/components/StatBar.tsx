interface StatBarProps {
  label: string;
  value: number;
  color: string;
  showLabel?: boolean;
  compact?: boolean;
}

export default function StatBar({ label, value, color, showLabel = true, compact = false }: StatBarProps) {
  return (
    <div className={compact ? 'mb-1' : 'mb-2'}>
      {showLabel && (
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">{label}</span>
          <span className="text-white font-bold">{value}</span>
        </div>
      )}
      <div className={`${compact ? 'h-1.5' : 'h-2'} bg-gray-700/50 rounded-full overflow-hidden`}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${value}%`,
            background: `linear-gradient(90deg, ${color}, ${color}cc)`,
            boxShadow: `0 0 10px ${color}66`,
          }}
        />
      </div>
    </div>
  );
}
