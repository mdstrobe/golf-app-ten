"use client";

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import ScoreNumberGrid from './ScoreNumberGrid';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ScorecardData {
  front_nine_scores: number[];
  back_nine_scores: number[];
  front_nine_putts: number[];
  back_nine_putts: number[];
  front_nine_fairways: string[];
  back_nine_fairways: string[];
  front_nine_gir: boolean[];
  back_nine_gir: boolean[];
  total_score: number;
  total_putts: number;
  total_fairways_hit: number;
  total_gir: number;
  course_name: string;
  tee_box_name: string;
  date_played: string;
}

interface ScorecardUploadProps {
  onScorecardProcessed: (data: ScorecardData) => void;
  onError: (error: string) => void;
}

interface EditHole {
  hole: number;
  score: number | string;
  putts: number | string;
  fairway: string;
  gir: boolean;
}

interface NumberGridState {
  isOpen: boolean;
  type: 'score' | 'putts';
  holeIndex: number;
  position: { top: number; left: number };
}

export default function ScorecardUpload({ onScorecardProcessed, onError }: ScorecardUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedData, setProcessedData] = useState<ScorecardData | null>(null);
  const [showReview, setShowReview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([]);
  const [teeBoxes, setTeeBoxes] = useState<{ id: string; tee_name: string }[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>('');
  const [selectedTeeBox, setSelectedTeeBox] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [searchCourse, setSearchCourse] = useState('');
  const [filteredCourses, setFilteredCourses] = useState<{ id: string; name: string }[]>([]);
  const [searchTeeBox, setSearchTeeBox] = useState('');
  const [filteredTeeBoxes, setFilteredTeeBoxes] = useState<{ id: string; tee_name: string }[]>([]);
  const [editHoles, setEditHoles] = useState<EditHole[]>([]);
  const [numberGrid, setNumberGrid] = useState<NumberGridState>({ isOpen: false, type: 'score', holeIndex: 0, position: { top: 0, left: 0 } });

  // Calculate GIR based on score and putts
  const calculateGIR = (score: number | string, putts: number | string): boolean => {
    if (!score || !putts) return false;
    const scoreNum = Number(score);
    const puttsNum = Number(putts);
    return scoreNum - puttsNum <= 2;
  };

  const golfPhrases = [
    'Teeing Off...',
    'Hitting the Approach...',
    'Chipping from the Rough...',
    'Checking the Wind...',
    'Avoiding the Bunker...',
    'Putting for Birdie...',
    'Reading the Green...',
    'Putting for Par...',
    'Holing out for Triple...',
    'Eyeing the Fairway...'
  ];
  const [loadingPhraseIdx, setLoadingPhraseIdx] = useState(0);

  // Fetch courses if course_name is blank
  useEffect(() => {
    if (showReview && processedData && !processedData.course_name) {
      supabase.from('golf_courses').select('id, name').then(({ data }) => {
        if (data) setCourses(data);
      });
    }
  }, [showReview, processedData]);

  // Fetch tee boxes if tee_box_name is blank and course is selected
  useEffect(() => {
    if (showReview && processedData && !processedData.tee_box_name && selectedCourse) {
      supabase.from('tee_boxes').select('id, tee_name').eq('course_id', selectedCourse).then(({ data }) => {
        if (data) setTeeBoxes(data);
      });
    }
  }, [showReview, processedData, selectedCourse]);

  // Set today's date if date_played is blank
  useEffect(() => {
    if (showReview && processedData) {
      if (!processedData.date_played) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        setSelectedDate(`${yyyy}-${mm}-${dd}`);
      } else {
        setSelectedDate(processedData.date_played);
      }
    }
  }, [showReview, processedData]);

  // When processedData changes, initialize editHoles
  useEffect(() => {
    if (processedData) {
      const holes: EditHole[] = [];
      for (let i = 0; i < 18; i++) {
        const isBackNine = i >= 9;
        const idx = isBackNine ? i - 9 : i;
        holes.push({
          hole: i + 1,
          score: isBackNine ? processedData.back_nine_scores[idx] : processedData.front_nine_scores[idx],
          putts: isBackNine ? processedData.back_nine_putts[idx] : processedData.front_nine_putts[idx],
          fairway: (isBackNine ? processedData.back_nine_fairways[idx] : processedData.front_nine_fairways[idx]) || '',
          gir: false // GIR will be calculated dynamically
        });
      }
      setEditHoles(holes);
    }
  }, [processedData]);

  // Filter courses/tee boxes for search
  useEffect(() => {
    setFilteredCourses(
      searchCourse
        ? courses.filter(c => c.name.toLowerCase().includes(searchCourse.toLowerCase()))
        : courses
    );
  }, [searchCourse, courses]);
  useEffect(() => {
    setFilteredTeeBoxes(
      searchTeeBox
        ? teeBoxes.filter(t => t.tee_name.toLowerCase().includes(searchTeeBox.toLowerCase()))
        : teeBoxes
    );
  }, [searchTeeBox, teeBoxes]);

  // Editable handlers
  const handleEditHole = (idx: number, field: keyof EditHole, value: string | number | boolean) => {
    setEditHoles(prev => prev.map((h, i) => i === idx ? { ...h, [field]: value } : h));
  };
  const openNumberGrid = (type: 'score' | 'putts', idx: number, e: React.MouseEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setNumberGrid({ isOpen: true, type, holeIndex: idx, position: { top: rect.bottom + window.scrollY + 8, left: rect.left + rect.width / 2 } });
  };
  const handleNumberGridSelect = (value: string) => {
    if (numberGrid.isOpen) {
      handleEditHole(numberGrid.holeIndex, numberGrid.type as keyof EditHole, value ? parseInt(value) : '');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      console.log('File dropped:', file.name, 'Size:', file.size, 'Type:', file.type);
      handleFile(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('File selected:', file.name, 'Size:', file.size, 'Type:', file.type);
      handleFile(file);
    }
  };

  async function handleFile(file: File) {
    if (!file.type.match(/image\/(jpeg|png|gif)/)) {
      onError('Please upload a valid image file (JPEG, PNG, or GIF)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      onError('File size must be less than 10MB');
      return;
    }

    setIsProcessing(true);
    setShowReview(false);

    // Start loading phrase interval
    const intervalId = setInterval(() => {
      setLoadingPhraseIdx(prev => (prev + 1) % golfPhrases.length);
    }, 2000);

    try {
      // Create a new image element
      const img = new Image();
      const reader = new FileReader();

      reader.onload = () => {
        img.onload = async () => {
          try {
            // Create canvas for compression
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Target width of 1200px while maintaining aspect ratio
            const maxWidth = 1200;
            let width = img.width;
            let height = img.height;
            
            if (width > maxWidth) {
              height = (maxWidth * height) / width;
              width = maxWidth;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Draw and compress image
            ctx?.drawImage(img, 0, 0, width, height);
            
            // Get compressed image data with higher compression
            const compressedImage = canvas.toDataURL('image/jpeg', 0.6);

            const response = await fetch('/api/process-scorecard', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ image: compressedImage }),
            });

            if (!response.ok) {
              throw new Error(await response.text());
            }

            const data = await response.json();
            if (data.error) {
              throw new Error(data.error);
            }

            setProcessedData(data);
            setShowReview(true);
            setEditHoles(Array(18).fill(null).map((_, idx) => ({
              hole: idx + 1,
              score: idx < 9 ? data.front_nine_scores[idx] : data.back_nine_scores[idx - 9],
              putts: idx < 9 ? data.front_nine_putts[idx] : data.back_nine_putts[idx - 9],
              fairway: idx < 9 ? (data.front_nine_fairways[idx] ? 'hit' : 'miss') : (data.back_nine_fairways[idx - 9] ? 'hit' : 'miss'),
              gir: idx < 9 ? data.front_nine_gir[idx] : data.back_nine_gir[idx - 9]
            })));
            onScorecardProcessed(data);
          } catch (error) {
            onError(error instanceof Error ? error.message : 'Failed to process scorecard');
          } finally {
            clearInterval(intervalId);
            setIsProcessing(false);
          }
        };

        img.src = reader.result as string;
      };

      reader.onerror = (error) => {
        onError('Error reading file');
        console.error('FileReader error:', error);
        clearInterval(intervalId);
        setIsProcessing(false);
      };

      reader.readAsDataURL(file);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to process file');
      clearInterval(intervalId);
      setIsProcessing(false);
    }
  }

  const handleConfirm = () => {
    if (processedData) {
      // Split editHoles into front/back arrays
      const front_nine_scores = editHoles.slice(0, 9).map(h => Number(h.score) || 0);
      const back_nine_scores = editHoles.slice(9).map(h => Number(h.score) || 0);
      const front_nine_putts = editHoles.slice(0, 9).map(h => Number(h.putts) || 0);
      const back_nine_putts = editHoles.slice(9).map(h => Number(h.putts) || 0);
      const front_nine_fairways = editHoles.slice(0, 9).map(h => h.fairway || '');
      const back_nine_fairways = editHoles.slice(9).map(h => h.fairway || '');
      const front_nine_gir = editHoles.slice(0, 9).map(h => calculateGIR(h.score, h.putts));
      const back_nine_gir = editHoles.slice(9).map(h => calculateGIR(h.score, h.putts));
      const updatedData = {
        ...processedData,
        course_name: processedData.course_name || (courses.find(c => c.id === selectedCourse)?.name ?? ''),
        tee_box_name: processedData.tee_box_name || (teeBoxes.find(t => t.id === selectedTeeBox)?.tee_name ?? ''),
        date_played: selectedDate,
        front_nine_scores,
        back_nine_scores,
        front_nine_putts,
        back_nine_putts,
        front_nine_fairways,
        back_nine_fairways,
        front_nine_gir,
        back_nine_gir,
      };
      onScorecardProcessed(updatedData);
      setShowReview(false);
      setProcessedData(null);
    }
  };

  const handleRetry = () => {
    console.log('Retrying scorecard upload');
    setShowReview(false);
    setProcessedData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isProcessing) {
      setLoadingPhraseIdx(0);
      interval = setInterval(() => {
        setLoadingPhraseIdx(idx => (idx + 1) % golfPhrases.length);
      }, 1600);
    } else {
      setLoadingPhraseIdx(0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isProcessing, golfPhrases.length]);

  if (showReview && processedData) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Review Scorecard Data</h3>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Course Details</h4>
            {/* Searchable Course Input */}
            {processedData.course_name ? (
              <p className="text-sm text-gray-600">Course: {processedData.course_name}</p>
            ) : (
              <div className="mb-2 relative">
                <label className="text-sm text-gray-600">Select Course:</label>
                <input
                  type="text"
                  className="block w-full mt-1 border rounded p-2"
                  placeholder="Type Course Name"
                  value={searchCourse}
                  onChange={e => setSearchCourse(e.target.value)}
                  onFocus={() => setFilteredCourses(courses)}
                />
                {searchCourse && filteredCourses.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {filteredCourses.map(course => (
                      <div
                        key={course.id}
                        onClick={() => {
                          setSelectedCourse(course.id);
                          setSearchCourse(course.name);
                          setFilteredCourses([]);
                        }}
                        className="p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <div className="text-sm font-medium truncate">{course.name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Searchable Tee Box Input */}
            {processedData.tee_box_name ? (
              <p className="text-sm text-gray-600">Tee Box: {processedData.tee_box_name}</p>
            ) : (
              <div className="mb-2 relative">
                <label className="text-sm text-gray-600">Select Tee Box:</label>
                <input
                  type="text"
                  className="block w-full mt-1 border rounded p-2"
                  placeholder="Type Tee Box Name"
                  value={searchTeeBox}
                  onChange={e => setSearchTeeBox(e.target.value)}
                  onFocus={() => setFilteredTeeBoxes(teeBoxes)}
                  disabled={!selectedCourse}
                />
                {searchTeeBox && filteredTeeBoxes.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {filteredTeeBoxes.map(tb => (
                      <div
                        key={tb.id}
                        onClick={() => {
                          setSelectedTeeBox(tb.id);
                          setSearchTeeBox(tb.tee_name);
                          setFilteredTeeBoxes([]);
                        }}
                        className="p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                      >
                        <div className="text-sm font-medium truncate">{tb.tee_name}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* Styled Date Input */}
            <div className="mb-2">
              <label className="text-sm text-gray-600">Date:</label>
              <input
                type="date"
                className="block w-full mt-1 border rounded p-2"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
              />
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Round Summary</h4>
            <p className="text-sm text-gray-600">Total Score: {editHoles.reduce((a, h) => a + (Number(h.score) || 0), 0)}</p>
            <p className="text-sm text-gray-600">Total Putts: {editHoles.reduce((a, h) => a + (Number(h.putts) || 0), 0)}</p>
            <p className="text-sm text-gray-600">Fairways Hit: {editHoles.filter(h => h.fairway === 'hit').length}/18</p>
            <p className="text-sm text-gray-600">GIR: {editHoles.filter(h => calculateGIR(h.score, h.putts)).length}/18</p>
          </div>
        </div>
        {/* Editable Hole-by-Hole Table */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Hole-by-Hole Results</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs text-center border">
              <thead>
                <tr>
                  <th className="border px-2 py-1">Hole</th>
                  <th className="border px-2 py-1">Score</th>
                  <th className="border px-2 py-1">Putts</th>
                  <th className="border px-2 py-1">Fairway</th>
                  <th className="border px-2 py-1">GIR</th>
                </tr>
              </thead>
              <tbody>
                {editHoles.map((h, idx) => (
                  <tr key={h.hole}>
                    <td className="border px-2 py-1 font-semibold">{h.hole}</td>
                    {/* Editable Score */}
                    <td className="border px-2 py-1">
                      <button
                        className="w-12 h-8 border rounded bg-white hover:border-green-500 focus:outline-none"
                        onClick={e => openNumberGrid('score', idx, e)}
                        type="button"
                      >
                        {h.score || <span className="text-gray-400">--</span>}
                      </button>
                    </td>
                    {/* Editable Putts */}
                    <td className="border px-2 py-1">
                      <button
                        className="w-12 h-8 border rounded bg-white hover:border-green-500 focus:outline-none"
                        onClick={e => openNumberGrid('putts', idx, e)}
                        type="button"
                      >
                        {h.putts || <span className="text-gray-400">--</span>}
                      </button>
                    </td>
                    {/* Editable Fairway */}
                    <td className="border px-2 py-1">
                      <select
                        className="w-20 border rounded p-1"
                        value={h.fairway || ''}
                        onChange={e => handleEditHole(idx, 'fairway', e.target.value)}
                      >
                        <option value="">--</option>
                        <option value="hit">Hit</option>
                        <option value="miss">Miss</option>
                        <option value="left">Left</option>
                        <option value="right">Right</option>
                      </select>
                    </td>
                    {/* GIR (auto-calculated) */}
                    <td className="border px-2 py-1">
                      <div className="h-7 flex items-center justify-center">
                        <span className={`text-base ${calculateGIR(h.score, h.putts) ? 'text-[#15803D]' : 'text-gray-300'}`}>
                          ●
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button
            onClick={handleRetry}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Try Again
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
            disabled={(!processedData.course_name && !selectedCourse) || (!processedData.tee_box_name && !selectedTeeBox)}
          >
            Confirm & Save
          </button>
        </div>
        {/* ScoreNumberGrid for editing */}
        <ScoreNumberGrid
          isOpen={numberGrid.isOpen}
          onClose={() => setNumberGrid(prev => ({ ...prev, isOpen: false }))}
          onSelect={handleNumberGridSelect}
          par={4}
          type={numberGrid.type as 'score' | 'putts'}
          position={numberGrid.position}
          holeNumber={numberGrid.holeIndex + 1}
          onNextHole={() => setNumberGrid(prev => ({ ...prev, isOpen: false }))}
        />
      </div>
    );
  }

  return (
    <div className="border-2 border-dashed border-gray-200 rounded-2xl p-12 max-w-lg mx-auto relative">
      <div className="flex flex-col items-center">
        {isProcessing ? (
          <div className="flex flex-col items-center">
            <div className="relative w-20 h-20">
              <div className="w-20 h-20 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-500" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            <p className="text-green-500 font-medium mt-4 mb-2 min-h-[1.5em]">{golfPhrases[loadingPhraseIdx]}</p>
            <p className="text-gray-500 text-sm">This may take a few moments</p>
          </div>
        ) : (
          <>
            <svg 
              width="48" 
              height="48" 
              viewBox="0 0 24 24" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg" 
              className="text-gray-400 mb-4"
            >
              <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
              <path d="M4 16L8 12L12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 10L16 8L20 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="9" cy="8" r="2" stroke="currentColor" strokeWidth="2"/>
            </svg>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInput}
              accept="image/jpeg,image/png,image/gif"
              className="hidden"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className={`text-green-500 font-medium mb-2 ${
                isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:text-green-600'
              }`}
            >
              Upload a file
            </button>
            
            <p className="text-gray-500 mb-1">or drag and drop</p>
            <p className="text-gray-400 text-sm">PNG, JPG, GIF up to 10MB</p>
          </>
        )}
      </div>
      
      <div
        className={`absolute inset-0 ${isDragging ? 'bg-green-50 bg-opacity-50' : ''} pointer-events-none`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      />
    </div>
  );
} 