'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from '@supabase/supabase-js';
import ScoreNumberGrid from '@/components/ScoreNumberGrid';
import { auth } from "@/firebase";
import ScorecardUpload from '@/components/ScorecardUpload';
import UnifiedScorecard from '@/components/UnifiedScorecard';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type HoleData = {
  score: string;
  putts: string;
  fairwayHit: 'left' | 'middle' | 'right' | null;
  par?: string;
};

type RoundSummary = {
  totalScore: number;
  totalPutts: number;
  fairwaysHit: number;
  girCount: number;
};

type GolfCourse = {
  id: string;
  name: string;
  city: string;
  state: string;
};

type TeeBox = {
  id: string;
  course_id: string;
  tee_name: string;
  front_nine_par: number[];
  back_nine_par: number[];
  front_nine_distance: number[];
  back_nine_distance: number[];
  slope: number;
  rating: number;
};

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

export default function AddRound() {
  const [isManualEntry, setIsManualEntry] = useState(false);
  const [courses, setCourses] = useState<GolfCourse[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [teeBoxes, setTeeBoxes] = useState<TeeBox[]>([]);
  const [selectedTeeBox, setSelectedTeeBox] = useState<string>("");
  const [holes, setHoles] = useState<HoleData[]>(Array(18).fill({
    score: "",
    putts: "",
    fairwayHit: null,
  }));
  const [roundSummary, setRoundSummary] = useState<RoundSummary>({
    totalScore: 0,
    totalPutts: 0,
    fairwaysHit: 0,
    girCount: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredCourses, setFilteredCourses] = useState<GolfCourse[]>([]);
  const [numberGrid, setNumberGrid] = useState<{
    isOpen: boolean;
    type: 'score' | 'putts';
    holeIndex: number;
    position: { top: number; left: number };
  }>({
    isOpen: false,
    type: 'score',
    holeIndex: 0,
    position: { top: 0, left: 0 }
  });
  const [error, setError] = useState<string | null>(null);
  const [datePlayed, setDatePlayed] = useState('');

  // Fetch courses on component mount
  useEffect(() => {
    const fetchCourses = async () => {
      const { data, error } = await supabase
        .from('golf_courses')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('Error fetching courses:', error);
        return;
      }
      
      setCourses(data || []);
    };

    fetchCourses();
  }, []);

  // Fetch tee boxes when course is selected
  useEffect(() => {
    const fetchTeeBoxes = async () => {
      if (!selectedCourse) {
        setTeeBoxes([]);
        setSelectedTeeBox("");
        return;
      }

      const { data, error } = await supabase
        .from('tee_boxes')
        .select('*')
        .eq('course_id', selectedCourse)
        .order('tee_name');
      
      if (error) {
        console.error('Error fetching tee boxes:', error);
        return;
      }
      
      setTeeBoxes(data || []);
    };

    fetchTeeBoxes();
  }, [selectedCourse]);

  // Update hole pars when tee box is selected
  useEffect(() => {
    if (!selectedTeeBox) return;

    const teeBox = teeBoxes.find(tb => tb.id === selectedTeeBox);
    if (!teeBox) return;

    // Update the scorecard with the correct pars
    const newHoles = holes.map((hole, index) => {
      const par = index < 9 
        ? teeBox.front_nine_par[index]
        : teeBox.back_nine_par[index - 9];
      
      return {
        ...hole,
        par: par.toString(),
      };
    });

    setHoles(newHoles);
  }, [selectedTeeBox, teeBoxes]);

  useEffect(() => {
    // Calculate round summary whenever holes data changes
    const summary = holes.reduce((acc, hole) => {
      return {
        totalScore: acc.totalScore + (hole.score ? parseInt(hole.score) : 0),
        totalPutts: acc.totalPutts + (hole.putts ? parseInt(hole.putts) : 0),
        fairwaysHit: acc.fairwaysHit + (hole.fairwayHit === 'middle' ? 1 : 0),
        girCount: acc.girCount + (calculateGIR(hole.score, hole.putts) ? 1 : 0),
      };
    }, {
      totalScore: 0,
      totalPutts: 0,
      fairwaysHit: 0,
      girCount: 0,
    });
    setRoundSummary(summary);
  }, [holes]);

  const handleHoleChange = (holeIndex: number, field: keyof HoleData, value: string | 'left' | 'middle' | 'right' | null) => {
    const newHoles = [...holes];
    newHoles[holeIndex] = {
      ...newHoles[holeIndex],
      [field]: value,
    };
    setHoles(newHoles);
    
    // If it's a score or putt entry, advance to the next hole
    if ((field === 'score' || field === 'putts') && value !== '' && holeIndex < 17) {
      const nextHoleIndex = holeIndex + 1;
      const nextInput = document.querySelector(`input[data-hole="${nextHoleIndex}"][data-type="${field}"]`) as HTMLInputElement;
      if (nextInput) {
        nextInput.click();
      }
    }
  };

  const applyTwoPutts = () => {
    const newHoles = holes.map(hole => ({
      ...hole,
      putts: "2"
    }));
    setHoles(newHoles);
  };

  const applyBogeyGolf = () => {
    const newHoles = holes.map(hole => ({
      ...hole,
      score: "5" // Assuming par 4 for now, we can update this when course selection is implemented
    }));
    setHoles(newHoles);
  };

  const calculateGIR = (score: string, putts: string): boolean | null => {
    if (!score || !putts) return null;
    const scoreNum = parseInt(score);
    const puttsNum = parseInt(putts);
    // GIR is true if (score - putts) <= 2, meaning player reached the green
    // with enough strokes left for two putts
    return scoreNum - puttsNum <= 2;
  };

  const handleTeeBoxChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTeeBox(e.target.value);
  };

  const handleInputClick = (
    e: React.MouseEvent<HTMLInputElement>,
    type: 'score' | 'putts',
    holeIndex: number
  ) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setNumberGrid({
      isOpen: true,
      type,
      holeIndex,
      position: {
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + rect.width / 2
      }
    });
  };

  const handleScorecardProcessed = async (data: ScorecardData) => {
    try {
      // Find course and tee box IDs
      const { data: courseData, error: courseError } = await supabase
        .from('golf_courses')
        .select('id')
        .eq('name', data.course_name)
        .single();

      if (courseError || !courseData) {
        throw new Error('Course not found');
      }

      const { data: teeBoxData, error: teeBoxError } = await supabase
        .from('tee_boxes')
        .select('id')
        .eq('course_id', courseData.id)
        .eq('tee_name', data.tee_box_name)
        .single();

      if (teeBoxError || !teeBoxData) {
        throw new Error('Tee box not found');
      }

      // Get current user
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Get user's ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('firebase_uid', currentUser.uid)
        .single();

      if (userError || !userData) {
        throw new Error('User not found');
      }

      // Prepare round data
      const roundData = {
        user_id: userData.id,
        date_played: data.date_played,
        submission_type: 'scanned',
        front_nine_scores: data.front_nine_scores,
        back_nine_scores: data.back_nine_scores,
        front_nine_putts: data.front_nine_putts,
        back_nine_putts: data.back_nine_putts,
        front_nine_fairways: data.front_nine_fairways,
        back_nine_fairways: data.back_nine_fairways,
        front_nine_gir: data.front_nine_scores.map((score, i) => 
          score - data.front_nine_putts[i] <= 2
        ),
        back_nine_gir: data.back_nine_scores.map((score, i) => 
          score - data.back_nine_putts[i] <= 2
        ),
        total_score: data.total_score,
        total_putts: data.total_putts,
        total_fairways_hit: data.total_fairways_hit,
        total_gir: [...data.front_nine_scores.map((score, i) => score - data.front_nine_putts[i] <= 2),
                    ...data.back_nine_scores.map((score, i) => score - data.back_nine_putts[i] <= 2)]
                   .filter(Boolean).length,
        course_id: courseData.id,
        tee_box_id: teeBoxData.id
      };

      // Insert into Supabase
      const { error: insertError } = await supabase
        .from('golf_rounds')
        .insert(roundData);

      if (insertError) {
        throw insertError;
      }

      // Show success message and redirect
      alert('Round saved successfully!');
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Error saving round:', error);
      setError('Failed to save round. Please try again.');
    }
  };

  const handleSaveRound = async () => {
    try {
      // Get current user
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Get user's ID
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('firebase_uid', currentUser.uid)
        .single();

      if (userError || !userData) {
        throw new Error('User not found');
      }

      // Transform data to match schema
      const frontNineScores = holes.slice(0, 9).map(hole => parseInt(hole.score) || 0);
      const backNineScores = holes.slice(9).map(hole => parseInt(hole.score) || 0);
      const frontNinePutts = holes.slice(0, 9).map(hole => parseInt(hole.putts) || 0);
      const backNinePutts = holes.slice(9).map(hole => parseInt(hole.putts) || 0);
      const frontNineFairways = holes.slice(0, 9).map(hole => hole.fairwayHit || '');
      const backNineFairways = holes.slice(9).map(hole => hole.fairwayHit || '');
      const frontNineGir = holes.slice(0, 9).map(hole => calculateGIR(hole.score, hole.putts) || false);
      const backNineGir = holes.slice(9).map(hole => calculateGIR(hole.score, hole.putts) || false);

      // Prepare round data
      const roundData = {
        user_id: userData.id,
        date_played: datePlayed,
        submission_type: 'manual',
        front_nine_scores: frontNineScores,
        back_nine_scores: backNineScores,
        front_nine_putts: frontNinePutts,
        back_nine_putts: backNinePutts,
        front_nine_fairways: frontNineFairways,
        back_nine_fairways: backNineFairways,
        front_nine_gir: frontNineGir,
        back_nine_gir: backNineGir,
        total_score: roundSummary.totalScore,
        total_putts: roundSummary.totalPutts,
        total_fairways_hit: roundSummary.fairwaysHit,
        total_gir: roundSummary.girCount,
        course_id: selectedCourse,
        tee_box_id: selectedTeeBox
      };

      // Insert into Supabase
      const { error: insertError } = await supabase
        .from('golf_rounds')
        .insert(roundData);

      if (insertError) {
        throw insertError;
      }

      // Show success message and redirect
      alert('Round saved successfully!');
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Error saving round:', error);
      setError('Failed to save round. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Back</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setIsManualEntry(false)}
              className={`flex-1 py-4 text-center font-medium ${
                !isManualEntry
                  ? "text-[#15803D] border-b-2 border-[#15803D]"
                  : "text-gray-500 hover:text-[#15803D]"
              }`}
            >
              Scan Scorecard
            </button>
            <button
              onClick={() => setIsManualEntry(true)}
              className={`flex-1 py-4 text-center font-medium ${
                isManualEntry
                  ? "text-[#15803D] border-b-2 border-[#15803D]"
                  : "text-gray-500 hover:text-[#15803D]"
              }`}
            >
              Manual Entry
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {!isManualEntry ? (
              <div>
                <div className="max-w-lg mx-auto mb-8">
                  <h2 className="text-2xl font-bold text-green-700 mb-2">Upload Scorecard</h2>
                  <p className="text-gray-600 text-md">
                    Upload a photo of your scorecard for automatic processing.
                  </p>
                </div>

                <ScorecardUpload
                  onScorecardProcessed={handleScorecardProcessed}
                  onError={setError}
                />

                {error && (
                  <div className="mt-4 text-red-500 text-center">
                    {error}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-8">
                <div className="lg:grid lg:grid-cols-3 lg:gap-8">
                  {/* Left Column - Form Fields */}
                  <div className="lg:col-span-1 space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Course</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Type Course Name"
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value);
                            const filtered = courses.filter(course => 
                              course.name.toLowerCase().includes(e.target.value.toLowerCase())
                            );
                            setFilteredCourses(filtered);
                          }}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#15803D] focus:border-transparent text-sm"
                        />
                        {searchQuery && filteredCourses.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                            {filteredCourses.map(course => (
                              <div
                                key={course.id}
                                onClick={() => {
                                  setSelectedCourse(course.id);
                                  setSearchQuery(course.name);
                                  setFilteredCourses([]);
                                }}
                                className="p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                              >
                                <div className="text-sm font-medium truncate">{course.name}</div>
                                <div className="text-xs text-gray-500">{course.city}, {course.state}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {selectedCourse && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Tee Box</label>
                        <select
                          value={selectedTeeBox}
                          onChange={handleTeeBoxChange}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#15803D] focus:border-transparent"
                          disabled={!selectedCourse}
                        >
                          <option value="">Select tee box</option>
                          {teeBoxes.map(teeBox => (
                            <option key={teeBox.id} value={teeBox.id}>
                              {teeBox.tee_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date Played</label>
                      <input
                        type="date"
                        value={datePlayed}
                        onChange={e => setDatePlayed(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#15803D] focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Right Column - Course Details */}
                  <div className="lg:col-span-2 mt-6 lg:mt-0">
                    {selectedCourse && (
                      <div className="bg-gray-50 h-full rounded-lg p-4">
                        <h3 className="text-sm font-medium text-gray-900 mb-3">Course Details</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-sm text-gray-500 block">Location:</span>
                            <span className="text-sm text-gray-900">
                              {courses.find(c => c.id === selectedCourse)?.city}, {courses.find(c => c.id === selectedCourse)?.state}
                            </span>
                          </div>
                          {selectedTeeBox && (
                            <>
                              <div>
                                <span className="text-sm text-gray-500 block">Tee Box:</span>
                                <span className="text-sm text-gray-900">
                                  {teeBoxes.find(tb => tb.id === selectedTeeBox)?.tee_name}
                                </span>
                              </div>
                              <div>
                                <span className="text-sm text-gray-500 block">Total Yardage:</span>
                                <span className="text-sm text-gray-900">
                                  {(teeBoxes.find(tb => tb.id === selectedTeeBox)?.front_nine_distance?.reduce((a, b) => a + b, 0) || 0) + 
                                   (teeBoxes.find(tb => tb.id === selectedTeeBox)?.back_nine_distance?.reduce((a, b) => a + b, 0) || 0)} yards
                                </span>
                              </div>
                              <div>
                                <span className="text-sm text-gray-500 block">Front Nine:</span>
                                <span className="text-sm text-gray-900">
                                  {teeBoxes.find(tb => tb.id === selectedTeeBox)?.front_nine_distance?.reduce((a, b) => a + b, 0) || 0} yards
                                </span>
                              </div>
                              <div>
                                <span className="text-sm text-gray-500 block">Back Nine:</span>
                                <span className="text-sm text-gray-900">
                                  {teeBoxes.find(tb => tb.id === selectedTeeBox)?.back_nine_distance?.reduce((a, b) => a + b, 0) || 0} yards
                                </span>
                              </div>
                              <div>
                                <span className="text-sm text-gray-500 block">Slope Rating:</span>
                                <span className="text-sm text-gray-900">
                                  {teeBoxes.find(tb => tb.id === selectedTeeBox)?.slope || '-'}
                                </span>
                              </div>
                              <div>
                                <span className="text-sm text-gray-500 block">Course Rating:</span>
                                <span className="text-sm text-gray-900">
                                  {teeBoxes.find(tb => tb.id === selectedTeeBox)?.rating || '-'}
                                </span>
                              </div>
                            </>
                          )}
                          {!selectedTeeBox && (
                            <div className="col-span-2 text-sm text-gray-500 italic">
                              Select a tee box to view course details
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Unified Scorecard UI */}
                <UnifiedScorecard
                  editHoles={holes.map((h, idx) => ({
                    hole: idx + 1,
                    score: h.score,
                    putts: h.putts,
                    fairway: h.fairwayHit === 'middle' ? 'hit' : h.fairwayHit || '',
                    gir: calculateGIR(h.score, h.putts) || false,
                  }))}
                  onEditHole={(idx, field, value) => {
                    if (field === 'score' || field === 'putts') {
                      handleHoleChange(idx, field as keyof HoleData, value.toString());
                    } else if (field === 'fairway') {
                      // Map 'hit' to 'middle', '' to null, etc.
                      handleHoleChange(idx, 'fairwayHit', value === 'hit' ? 'middle' : value === '' ? null : value);
                    }
                  }}
                  openNumberGrid={(type, idx, e) => {
                    const rect = (e.target as HTMLElement).getBoundingClientRect();
                    setNumberGrid({ isOpen: true, type, holeIndex: idx, position: { top: rect.bottom + window.scrollY + 8, left: rect.left + rect.width / 2 } });
                  }}
                  numberGrid={numberGrid}
                  courseName={courses.find(c => c.id === selectedCourse)?.name || ''}
                  teeBoxName={teeBoxes.find(tb => tb.id === selectedTeeBox)?.tee_name || ''}
                  date={datePlayed}
                  totalScore={roundSummary.totalScore}
                  totalPutts={roundSummary.totalPutts}
                  fairwaysHit={roundSummary.fairwaysHit}
                  fairwaysPct={Math.round((roundSummary.fairwaysHit / 18) * 100)}
                  onRetry={undefined}
                  onConfirm={handleSaveRound}
                  confirmDisabled={false}
                  ScoreNumberGrid={
                    <ScoreNumberGrid
                      isOpen={numberGrid.isOpen}
                      onClose={() => setNumberGrid(prev => ({ ...prev, isOpen: false }))}
                      onSelect={value => {
                        if (numberGrid.isOpen) {
                          handleHoleChange(numberGrid.holeIndex, numberGrid.type as keyof HoleData, value ? value.toString() : '');
                        }
                      }}
                      par={4}
                      type={numberGrid.type as 'score' | 'putts'}
                      position={numberGrid.position}
                      holeNumber={numberGrid.holeIndex + 1}
                      onNextHole={() => setNumberGrid(prev => ({ ...prev, isOpen: false }))}
                    />
                  }
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 