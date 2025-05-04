import React from 'react';

interface ScoreNumberGridProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (value: string) => void;
  par: number;
  type: 'score' | 'putts';
  position: { top: number; left: number };
  holeNumber: number;
  onNextHole?: () => void;
}

export default function ScoreNumberGrid({ 
  isOpen, 
  onClose, 
  onSelect, 
  par, 
  type, 
  holeNumber,
  onNextHole
}: ScoreNumberGridProps) {
  if (!isOpen) return null;

  const getScoreLabel = (score: number) => {
    if (!par) return score.toString();
    const relativeToPar = score - par;
    switch (relativeToPar) {
      case -4: return 'Condor';
      case -3: return 'Albatross';
      case -2: return 'Eagle';
      case -1: return 'Birdie';
      case 0: return 'Par';
      case 1: return 'Bogey';
      case 2: return 'Double';
      case 3: return 'Triple';
      case 4: return 'Quad';
      default: return `${relativeToPar > 0 ? '+' : ''}${relativeToPar}`;
    }
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleSelect = (value: string) => {
    onSelect(value);
  };

  const numbers = type === 'putts' ? Array.from({ length: 8 }, (_, i) => i + 1) : Array.from({ length: 8 }, (_, i) => i + 1);

  return (
    <div 
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
      onClick={handleBackgroundClick}
    >
      <div 
        className="bg-gray-800 rounded-lg p-4 shadow-xl"
        style={{
          width: '280px',
          maxHeight: '90vh',
          overflow: 'auto'
        }}
      >
        <div className="text-center mb-4">
          <h3 className="text-lg font-semibold text-white">Hole {holeNumber}</h3>
          <p className="text-sm text-gray-300">Par {par}</p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {numbers.map((number) => (
            <button
              key={number}
              onClick={() => handleSelect(number.toString())}
              className={`
                h-14 rounded-lg flex flex-col items-center justify-center
                ${number === par && type === 'score' ? 'bg-[#15803D] text-white' : 'bg-gray-700 text-white hover:bg-gray-600'}
                transition-colors
              `}
            >
              <span className="text-xl font-bold">{number}</span>
              {type === 'score' && (
                <span className="text-xs opacity-75">{getScoreLabel(number)}</span>
              )}
            </button>
          ))}
          <button
            onClick={() => handleSelect('')}
            className="h-14 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-colors col-start-3"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
} 