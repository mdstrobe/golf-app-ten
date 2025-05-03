"use client";

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { auth } from "@/firebase";
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

export default function ScorecardUpload({ onScorecardProcessed, onError }: ScorecardUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
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
  const [editHoles, setEditHoles] = useState<any[]>([]);
  const [numberGrid, setNumberGrid] = useState({ isOpen: false, type: 'score', holeIndex: 0, position: { top: 0, left: 0 } });

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
    if (showReview && processedData) {
      setEditHoles(Array.from({ length: 18 }, (_, i) => {
        const isFront = i < 9;
        return {
          hole: i + 1,
          score: isFront ? processedData.front_nine_scores[i] : processedData.back_nine_scores[i - 9],
          putts: isFront ? processedData.front_nine_putts[i] : processedData.back_nine_putts[i - 9],
          fairway: isFront ? processedData.front_nine_fairways[i] : processedData.back_nine_fairways[i - 9],
          gir: isFront ? processedData.front_nine_gir[i] : processedData.back_nine_gir[i - 9],
        };
      }));
    }
  }, [showReview, processedData]);

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
  const handleEditHole = (idx: number, field: string, value: any) => {
    setEditHoles(prev => prev.map((h, i) => i === idx ? { ...h, [field]: value } : h));
  };
  const openNumberGrid = (type: 'score' | 'putts', idx: number, e: React.MouseEvent) => {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setNumberGrid({ isOpen: true, type, holeIndex: idx, position: { top: rect.bottom + window.scrollY + 8, left: rect.left + rect.width / 2 } });
  };
  const handleNumberGridSelect = (value: string) => {
    if (numberGrid.isOpen) {
      handleEditHole(numberGrid.holeIndex, numberGrid.type, value ? parseInt(value) : '');
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

  const handleFile = async (file: File) => {
    console.log('Starting file processing...');
    
    if (!file.type.match(/image\/(jpeg|png|gif)/)) {
      const error = 'Please upload a valid image file (JPEG, PNG, or GIF)';
      console.error('File type error:', error);
      onError(error);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      const error = 'File size must be less than 10MB';
      console.error('File size error:', error);
      onError(error);
      return;
    }

    setIsProcessing(true);
    setProcessingStep('Converting image...');
    console.log('Converting image to base64...');

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64Image = reader.result as string;
        console.log('Image converted to base64. Length:', base64Image.length);
        console.log('Base64 prefix:', base64Image.substring(0, 50) + '...');
        
        setProcessingStep('Processing scorecard...');
        console.log('Sending request to process scorecard...');
        
        try {
          // Call Gemini AI API to process the scorecard
          const response = await fetch('/api/process-scorecard', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ image: base64Image }),
          });

          console.log('Response status:', response.status);
          
          if (!response.ok) {
            throw new Error(`Failed to process scorecard: ${response.status} ${response.statusText}`);
          }

          const data = await response.json();
          console.log('Received processed data:', data);
          
          if (data.error) {
            throw new Error(data.error);
          }

          setProcessedData(data);
          setShowReview(true);
          console.log('Processing completed successfully');
        } catch (error) {
          console.error('Error in API call:', error);
          onError(error instanceof Error ? error.message : 'Failed to process scorecard');
        } finally {
          setIsProcessing(false);
        }
      };

      reader.onerror = (error) => {
        console.error('Error reading file:', error);
        onError('Failed to read file');
        setIsProcessing(false);
      };
    } catch (error) {
      console.error('Error in file handling:', error);
      onError('Failed to process scorecard. Please try again.');
      setIsProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (processedData) {
      // Split editHoles into front/back arrays
      const front_nine_scores = editHoles.slice(0, 9).map(h => Number(h.score) || 0);
      const back_nine_scores = editHoles.slice(9).map(h => Number(h.score) || 0);
      const front_nine_putts = editHoles.slice(0, 9).map(h => Number(h.putts) || 0);
      const back_nine_putts = editHoles.slice(9).map(h => Number(h.putts) || 0);
      const front_nine_fairways = editHoles.slice(0, 9).map(h => h.fairway || '');
      const back_nine_fairways = editHoles.slice(9).map(h => h.fairway || '');
      const front_nine_gir = editHoles.slice(0, 9).map(h => !!h.gir);
      const back_nine_gir = editHoles.slice(9).map(h => !!h.gir);
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
  }, [isProcessing]);

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
            <p className="text-sm text-gray-600">GIR: {editHoles.filter(h => h.gir).length}/18</p>
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
                    {/* Editable GIR */}
                    <td className="border px-2 py-1">
                      <button
                        className={`w-10 h-8 border rounded ${h.gir ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'}`}
                        onClick={() => handleEditHole(idx, 'gir', !h.gir)}
                        type="button"
                      >
                        {h.gir ? 'Yes' : 'No'}
                      </button>
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