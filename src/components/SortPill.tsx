import React from 'react';

interface SortPillProps {
  label: string;
  active: boolean;
  direction?: 'asc' | 'desc';
  onClick: () => void;
  onToggleDirection?: (dir: 'asc' | 'desc') => void;
}

export default function SortPill({ label, active, direction, onClick, onToggleDirection }: SortPillProps) {
  return (
    <button
      type="button"
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition flex items-center gap-1 ${
        active ? 'bg-green-100 text-green-700' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
      }`}
      onClick={onClick}
    >
      {label}
      {active && direction && (
        <span
          onClick={e => {
            e.stopPropagation();
            if (onToggleDirection) {
              onToggleDirection(direction === 'asc' ? 'desc' : 'asc');
            }
          }}
          className="cursor-pointer"
        >
          {direction === 'asc' ? (
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M5 15l7-7 7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          ) : (
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 9l-7 7-7-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          )}
        </span>
      )}
    </button>
  );
} 