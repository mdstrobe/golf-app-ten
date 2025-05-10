import React from 'react';

interface EditHole {
  hole: number;
  score: number | string;
  putts: number | string;
  fairway: string;
  gir: boolean;
}

interface UnifiedScorecardProps {
  editHoles: EditHole[];
  onEditHole: (holeIdx: number, field: 'score' | 'putts' | 'fairway', value: any) => void;
  openNumberGrid: (type: 'score' | 'putts', holeIdx: number, e: React.MouseEvent) => void;
  numberGrid: any;
  courseName: string;
  teeBoxName: string;
  date: string;
  totalScore: number;
  totalPutts: number;
  fairwaysHit: number;
  fairwaysPct: number;
  onRetry?: () => void;
  onConfirm?: () => void;
  confirmDisabled?: boolean;
  ScoreNumberGrid: React.ReactNode;
}

const fairwayStates = [
  { value: '', label: '–', color: 'bg-gray-200', icon: '○' },
  { value: 'hit', label: 'Hit', color: 'bg-green-500', icon: '●' },
  { value: 'left', label: 'Left', color: 'bg-yellow-400', icon: '←' },
  { value: 'right', label: 'Right', color: 'bg-blue-400', icon: '→' },
];
const nextFairwayState = (current: string) => {
  const idx = fairwayStates.findIndex(f => f.value === current);
  return fairwayStates[(idx + 1) % fairwayStates.length].value;
};

export default function UnifiedScorecard({
  editHoles,
  onEditHole,
  openNumberGrid,
  numberGrid,
  courseName,
  teeBoxName,
  date,
  totalScore,
  totalPutts,
  fairwaysHit,
  fairwaysPct,
  onRetry,
  onConfirm,
  confirmDisabled,
  ScoreNumberGrid,
}: UnifiedScorecardProps) {
  const front9 = editHoles.slice(0, 9);
  const back9 = editHoles.slice(9, 18);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 w-full">
      {/* Only show summary if courseName and date are provided */}
      {(courseName && date) && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6 w-full">
          <div className="mb-2 text-base flex flex-wrap gap-4 items-center">
            <b>Course:</b> <span>{courseName}</span>
            <b>Tee Box:</b> <span>{teeBoxName}</span>
            <b>Date:</b> {date}
            <b>Total Score:</b> <span>{totalScore}</span>
          </div>
        </div>
      )}
      <div className="mb-6 w-full">
        {/* Front 9 Block - Grid Layout */}
        <div className="mb-6 w-full">
          <div className="font-semibold text-lg text-gray-900 mb-2">Front 9</div>
          <div className="grid grid-cols-9 gap-1 sm:gap-2 mb-1 w-full">
            {front9.map((h, idx) => (
              <div key={h.hole} className="flex flex-col items-center w-full">
                <span className="text-xs text-gray-400">#{h.hole}</span>
              </div>
            ))}
          </div>
          {/* Scores Row */}
          <div className="grid grid-cols-9 gap-1 sm:gap-2 mb-1 w-full">
            {front9.map((h, idx) => (
              <button
                key={`score-${h.hole}`}
                className="w-full h-10 sm:h-8 border rounded bg-white hover:border-green-500 focus:outline-none text-base font-semibold touch-manipulation"
                onClick={e => openNumberGrid('score', idx, e)}
                type="button"
              >
                {h.score || <span className="text-gray-400">--</span>}
              </button>
            ))}
          </div>
          {/* Fairways Row */}
          <div className="grid grid-cols-9 gap-1 sm:gap-2 mb-1 w-full">
            {front9.map((h, idx) => {
              const state = fairwayStates.find(f => f.value === h.fairway) || fairwayStates[0];
              return (
                <button
                  key={`fairway-${h.hole}`}
                  className={`w-full h-10 sm:h-8 rounded-full flex items-center justify-center border ${state.color} text-white text-lg focus:outline-none touch-manipulation`}
                  title={state.label}
                  onClick={() => onEditHole(idx, 'fairway', nextFairwayState(h.fairway))}
                  type="button"
                >
                  {state.icon}
                </button>
              );
            })}
          </div>
          {/* Putts Row */}
          <div className="grid grid-cols-9 gap-1 sm:gap-2 mb-1 w-full">
            {front9.map((h, idx) => (
              <button
                key={`putts-${h.hole}`}
                className="w-full h-10 sm:h-8 border rounded bg-white hover:border-green-500 focus:outline-none text-base touch-manipulation"
                onClick={e => openNumberGrid('putts', idx, e)}
                type="button"
              >
                {h.putts || <span className="text-gray-400">--</span>}
              </button>
            ))}
          </div>
        </div>
        {/* Back 9 Block - Grid Layout */}
        <div className="mb-6 w-full">
          <div className="font-semibold text-lg text-gray-900 mb-2">Back 9</div>
          <div className="grid grid-cols-9 gap-1 sm:gap-2 mb-1 w-full">
            {back9.map((h, idx) => (
              <div key={h.hole} className="flex flex-col items-center w-full">
                <span className="text-xs text-gray-400">#{h.hole}</span>
              </div>
            ))}
          </div>
          {/* Scores Row */}
          <div className="grid grid-cols-9 gap-1 sm:gap-2 mb-1 w-full">
            {back9.map((h, idx) => (
              <button
                key={`score-${h.hole}`}
                className="w-full h-10 sm:h-8 border rounded bg-white hover:border-green-500 focus:outline-none text-base font-semibold touch-manipulation"
                onClick={e => openNumberGrid('score', idx + 9, e)}
                type="button"
              >
                {h.score || <span className="text-gray-400">--</span>}
              </button>
            ))}
          </div>
          {/* Fairways Row */}
          <div className="grid grid-cols-9 gap-1 sm:gap-2 mb-1 w-full">
            {back9.map((h, idx) => {
              const state = fairwayStates.find(f => f.value === h.fairway) || fairwayStates[0];
              return (
                <button
                  key={`fairway-${h.hole}`}
                  className={`w-full h-10 sm:h-8 rounded-full flex items-center justify-center border ${state.color} text-white text-lg focus:outline-none touch-manipulation`}
                  title={state.label}
                  onClick={() => onEditHole(idx + 9, 'fairway', nextFairwayState(h.fairway))}
                  type="button"
                >
                  {state.icon}
                </button>
              );
            })}
          </div>
          {/* Putts Row */}
          <div className="grid grid-cols-9 gap-1 sm:gap-2 mb-1 w-full">
            {back9.map((h, idx) => (
              <button
                key={`putts-${h.hole}`}
                className="w-full h-10 sm:h-8 border rounded bg-white hover:border-green-500 focus:outline-none text-base touch-manipulation"
                onClick={e => openNumberGrid('putts', idx + 9, e)}
                type="button"
              >
                {h.putts || <span className="text-gray-400">--</span>}
              </button>
            ))}
          </div>
        </div>
        {/* Totals */}
        <div className="text-sm text-gray-700 mb-2">
          Total Putts: {totalPutts} &nbsp; | &nbsp; Average: {(totalPutts / 18).toFixed(1)} per hole
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 mb-1">
          <div className="bg-green-500 h-3 rounded-full transition-all" style={{ width: `${fairwaysPct}%` }}></div>
        </div>
        <div className="text-sm text-gray-700">Fairways Hit: {fairwaysHit}/18 ({fairwaysPct}%)</div>
      </div>
      <div className="flex justify-end gap-3 mt-6 w-full">
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Try Again
          </button>
        )}
        {onConfirm && (
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
            disabled={confirmDisabled}
          >
            Confirm & Save
          </button>
        )}
      </div>
      {ScoreNumberGrid}
    </div>
  );
} 