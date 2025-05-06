'use client';

import { Metadata } from 'next';
import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from '@supabase/supabase-js';
import ScoreNumberGrid from '@/components/ScoreNumberGrid';
import { auth } from "@/firebase";
import ScorecardUpload from '@/components/ScorecardUpload';

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

export const metadata: Metadata = {
  title: 'Add Round',
};

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

                {/* Scorecard section */}
                <div className="mt-8">
                  <div className="space-y-4">
                    <div>
                      <div className="mb-2">
                        <h3 className="text-base font-medium text-gray-900">Front Nine</h3>
                      </div>
                      <div className="overflow-x-auto -mx-4 px-4">
                        <table className="min-w-full">
                          <thead>
                            <tr>
                              <th className="w-16 py-1.5 px-1 text-left text-xs font-semibold text-gray-600 border-b border-gray-200">
                                Stats
                              </th>
                              {[...Array(9)].map((_, i) => (
                                <th key={i} className="w-11 py-1 px-1 text-center border-b border-gray-200">
                                  <div className="space-y-1">
                                    <div className="bg-[#15803D] rounded-t-sm p-1">
                                      <div className="text-xs font-bold text-white">{i + 1}</div>
                                    </div>
                                    <div className="text-[10px] font-medium text-gray-500">
                                      Par {holes[i]?.par || '-'}
                                    </div>
                                  </div>
                                </th>
                              ))}
                              <th className="w-12 py-1 px-1 text-center border-b border-gray-200">
                                <div className="text-xs font-semibold text-gray-600">OUT</div>
                                <div className="text-[10px] font-medium text-gray-500">
                                  {selectedTeeBox ? 
                                    teeBoxes.find(tb => tb.id === selectedTeeBox)?.front_nine_par?.reduce((a, b) => a + b, 0) 
                                    : '-'}
                                </div>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="py-1 px-1 text-xs font-medium text-gray-600">Score</td>
                              {[...Array(9)].map((_, i) => (
                                <td key={i} className="p-0.5">
                                  <input
                                    type="text"
                                    inputMode="none"
                                    value={holes[i].score}
                                    onClick={(e) => handleInputClick(e, 'score', i)}
                                    readOnly
                                    data-hole={i}
                                    data-type="score"
                                    className="w-full h-7 text-center text-sm border border-gray-200 rounded focus:ring-1 focus:ring-[#15803D] focus:border-transparent transition-all hover:border-[#15803D] cursor-pointer"
                                  />
                                </td>
                              ))}
                              <td className="p-0.5 text-center font-semibold text-sm text-gray-900">
                                {holes.slice(0, 9).reduce((sum, hole) => sum + (hole.score ? parseInt(hole.score) : 0), 0) || '-'}
                              </td>
                            </tr>
                            <tr className="bg-gray-50/30">
                              <td className="py-1 px-1 text-xs font-medium text-gray-600">Putts</td>
                              {[...Array(9)].map((_, i) => (
                                <td key={i} className="p-0.5">
                                  <input
                                    type="text"
                                    inputMode="none"
                                    value={holes[i].putts}
                                    onClick={(e) => handleInputClick(e, 'putts', i)}
                                    readOnly
                                    data-hole={i}
                                    data-type="putts"
                                    className="w-full h-7 text-center text-sm border border-gray-200 rounded focus:ring-1 focus:ring-[#15803D] focus:border-transparent transition-all hover:border-[#15803D] bg-white cursor-pointer"
                                  />
                                </td>
                              ))}
                              <td className="p-0.5 text-center font-semibold text-sm text-gray-900">
                                {holes.slice(0, 9).reduce((sum, hole) => sum + (hole.putts ? parseInt(hole.putts) : 0), 0) || '-'}
                              </td>
                            </tr>
                            <tr>
                              <td className="py-1 px-1 text-xs font-medium text-gray-600">Fairway</td>
                              {[...Array(9)].map((_, i) => (
                                <td key={i} className="p-0.5">
                                  <div className="flex flex-col gap-0.5">
                                    <button
                                      type="button"
                                      tabIndex={i + 37}
                                      onClick={() => handleHoleChange(i, 'fairwayHit', 'left')}
                                      className={`h-5 border rounded flex items-center justify-center transition-all ${
                                        holes[i].fairwayHit === 'left'
                                          ? 'bg-gray-100 text-gray-500 border-gray-300'
                                          : 'border-gray-200 hover:border-[#15803D] hover:text-[#15803D]'
                                      }`}
                                    >
                                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M10 19L3 12L10 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    </button>
                                    <button
                                      type="button"
                                      tabIndex={i + 37}
                                      onClick={() => handleHoleChange(i, 'fairwayHit', 'middle')}
                                      className={`h-5 border rounded flex items-center justify-center transition-all ${
                                        holes[i].fairwayHit === 'middle'
                                          ? 'bg-[#15803D] text-white border-[#15803D]'
                                          : 'border-gray-200 hover:border-[#15803D] hover:text-[#15803D]'
                                      }`}
                                    >
                                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12 19L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    </button>
                                    <button
                                      type="button"
                                      tabIndex={i + 37}
                                      onClick={() => handleHoleChange(i, 'fairwayHit', 'right')}
                                      className={`h-5 border rounded flex items-center justify-center transition-all ${
                                        holes[i].fairwayHit === 'right'
                                          ? 'bg-gray-100 text-gray-500 border-gray-300'
                                          : 'border-gray-200 hover:border-[#15803D] hover:text-[#15803D]'
                                      }`}
                                    >
                                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M14 5L21 12L14 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    </button>
                                  </div>
                                </td>
                              ))}
                              <td className="p-0.5 text-center font-semibold text-xs text-gray-900">
                                {holes.slice(0, 9).filter(hole => hole.fairwayHit === 'middle').length}/9
                              </td>
                            </tr>
                            <tr className="bg-gray-50/30">
                              <td className="py-1 px-1 text-xs font-medium text-gray-600">GIR</td>
                              {[...Array(9)].map((_, i) => (
                                <td key={i} className="p-0.5 text-center">
                                  <div className="h-7 flex items-center justify-center">
                                    <span className={`text-base ${calculateGIR(holes[i].score, holes[i].putts) ? 'text-[#15803D]' : 'text-gray-300'}`}>
                                      ●
                                    </span>
                                  </div>
                                </td>
                              ))}
                              <td className="p-0.5 text-center font-semibold text-xs text-gray-900">
                                {holes.slice(0, 9).filter(hole => calculateGIR(hole.score, hole.putts)).length}/9
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="mt-6 mb-2">
                      <h3 className="text-base font-medium text-gray-900">Back Nine</h3>
                    </div>
                    <div className="overflow-x-auto -mx-4 px-4">
                      <table className="min-w-full">
                        <thead>
                          <tr>
                            <th className="w-16 py-1.5 px-1 text-left text-xs font-semibold text-gray-600 border-b border-gray-200">
                              Stats
                            </th>
                            {[...Array(9)].map((_, i) => (
                              <th key={i + 9} className="w-11 py-1 px-1 text-center border-b border-gray-200">
                                <div className="space-y-1">
                                  <div className="bg-[#15803D] rounded-t-sm p-1">
                                    <div className="text-xs font-bold text-white">{i + 10}</div>
                                  </div>
                                  <div className="text-[10px] font-medium text-gray-500">
                                    Par {holes[i + 9]?.par || '-'}
                                  </div>
                                </div>
                              </th>
                            ))}
                            <th className="w-12 py-1 px-1 text-center border-b border-gray-200">
                              <div className="text-xs font-semibold text-gray-600">IN</div>
                              <div className="text-[10px] font-medium text-gray-500">
                                {selectedTeeBox ? 
                                  teeBoxes.find(tb => tb.id === selectedTeeBox)?.back_nine_par?.reduce((a, b) => a + b, 0) 
                                  : '-'}
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="py-1 px-1 text-xs font-medium text-gray-600">Score</td>
                            {[...Array(9)].map((_, i) => (
                              <td key={i + 9} className="p-0.5">
                                <input
                                  type="text"
                                  inputMode="none"
                                  value={holes[i + 9].score}
                                  onClick={(e) => handleInputClick(e, 'score', i + 9)}
                                  readOnly
                                  data-hole={i + 9}
                                  data-type="score"
                                  className="w-full h-7 text-center text-sm border border-gray-200 rounded focus:ring-1 focus:ring-[#15803D] focus:border-transparent transition-all hover:border-[#15803D] cursor-pointer"
                                />
                              </td>
                            ))}
                            <td className="p-0.5 text-center font-semibold text-sm text-gray-900">
                              {holes.slice(9).reduce((sum, hole) => sum + (hole.score ? parseInt(hole.score) : 0), 0) || '-'}
                            </td>
                          </tr>
                          <tr className="bg-gray-50/30">
                            <td className="py-1 px-1 text-xs font-medium text-gray-600">Putts</td>
                            {[...Array(9)].map((_, i) => (
                              <td key={i + 9} className="p-0.5">
                                <input
                                  type="text"
                                  inputMode="none"
                                  value={holes[i + 9].putts}
                                  onClick={(e) => handleInputClick(e, 'putts', i + 9)}
                                  readOnly
                                  data-hole={i + 9}
                                  data-type="putts"
                                  className="w-full h-7 text-center text-sm border border-gray-200 rounded focus:ring-1 focus:ring-[#15803D] focus:border-transparent transition-all hover:border-[#15803D] bg-white cursor-pointer"
                                />
                              </td>
                            ))}
                            <td className="p-0.5 text-center font-semibold text-sm text-gray-900">
                              {holes.slice(9).reduce((sum, hole) => sum + (hole.putts ? parseInt(hole.putts) : 0), 0) || '-'}
                            </td>
                          </tr>
                          <tr>
                            <td className="py-1 px-1 text-xs font-medium text-gray-600">Fairway</td>
                            {[...Array(9)].map((_, i) => (
                              <td key={i + 9} className="p-0.5">
                                <div className="flex flex-col gap-0.5">
                                  <button
                                    type="button"
                                    tabIndex={i + 46}
                                    onClick={() => handleHoleChange(i + 9, 'fairwayHit', 'left')}
                                    className={`h-5 border rounded flex items-center justify-center transition-all ${
                                      holes[i + 9].fairwayHit === 'left'
                                        ? 'bg-gray-100 text-gray-500 border-gray-300'
                                        : 'border-gray-200 hover:border-[#15803D] hover:text-[#15803D]'
                                    }`}
                                  >
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M10 19L3 12L10 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  </button>
                                  <button
                                    type="button"
                                    tabIndex={i + 46}
                                    onClick={() => handleHoleChange(i + 9, 'fairwayHit', 'middle')}
                                    className={`h-5 border rounded flex items-center justify-center transition-all ${
                                      holes[i + 9].fairwayHit === 'middle'
                                        ? 'bg-[#15803D] text-white border-[#15803D]'
                                        : 'border-gray-200 hover:border-[#15803D] hover:text-[#15803D]'
                                    }`}
                                  >
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M12 19L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  </button>
                                  <button
                                    type="button"
                                    tabIndex={i + 46}
                                    onClick={() => handleHoleChange(i + 9, 'fairwayHit', 'right')}
                                    className={`h-5 border rounded flex items-center justify-center transition-all ${
                                      holes[i + 9].fairwayHit === 'right'
                                        ? 'bg-gray-100 text-gray-500 border-gray-300'
                                        : 'border-gray-200 hover:border-[#15803D] hover:text-[#15803D]'
                                    }`}
                                  >
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                      <path d="M14 5L21 12L14 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            ))}
                            <td className="p-0.5 text-center font-semibold text-xs text-gray-900">
                              {holes.slice(9).filter(hole => hole.fairwayHit === 'middle').length}/9
                            </td>
                          </tr>
                          <tr className="bg-gray-50/30">
                            <td className="py-1 px-1 text-xs font-medium text-gray-600">GIR</td>
                            {[...Array(9)].map((_, i) => (
                              <td key={i + 9} className="p-0.5 text-center">
                                <div className="h-7 flex items-center justify-center">
                                  <span className={`text-base ${calculateGIR(holes[i + 9].score, holes[i + 9].putts) ? 'text-[#15803D]' : 'text-gray-300'}`}>
                                    ●
                                  </span>
                                </div>
                              </td>
                            ))}
                            <td className="p-0.5 text-center font-semibold text-xs text-gray-900">
                              {holes.slice(9).filter(hole => calculateGIR(hole.score, hole.putts)).length}/9
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Round Summary */}
                <div className="mt-8 bg-white rounded-lg shadow-sm p-4">
                  <h3 className="text-base font-medium text-gray-900 mb-3">Round Summary</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Total Score</div>
                      <div className="text-xl font-bold text-gray-900">
                        {roundSummary.totalScore || '--'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Total Putts</div>
                      <div className="text-xl font-bold text-gray-900">
                        {roundSummary.totalPutts || '--'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Fairways Hit</div>
                      <div className="text-xl font-bold text-gray-900">
                        {roundSummary.fairwaysHit ? `${Math.round((roundSummary.fairwaysHit / 18) * 100)}%` : '--'}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500 mb-1">GIR</div>
                      <div className="text-xl font-bold text-gray-900">
                        {roundSummary.girCount ? `${Math.round((roundSummary.girCount / 18) * 100)}%` : '--'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Scorecard Tips */}
                <div className="mt-8 bg-gray-50 rounded-lg p-4">
                  <h3 className="text-base font-medium text-gray-900 mb-4">Scorecard Tips</h3>
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Actions</h4>
                      <p className="text-sm text-gray-600 mb-2">Use these to quickly fill in common patterns:</p>
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={applyBogeyGolf}
                          className="text-sm text-[#15803D] hover:text-[#126c33] font-medium flex items-center gap-1"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 4V20M5 11L12 4L19 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Quick Bogey Golf
                        </button>
                        <button
                          onClick={applyTwoPutts}
                          className="text-sm text-[#15803D] hover:text-[#126c33] font-medium flex items-center gap-1"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 4V20M5 11L12 4L19 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Quick 2-Putts
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Fairway Indicators</h4>
                      <p className="text-sm text-gray-600 mb-2">Click to mark where your tee shot landed:</p>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <button className="h-5 w-5 border border-gray-200 rounded flex items-center justify-center">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M10 19L3 12L10 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                          <span className="text-xs text-gray-500">Left</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button className="h-5 w-5 border border-gray-200 rounded flex items-center justify-center">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M12 19L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                          <span className="text-xs text-gray-500">Middle</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button className="h-5 w-5 border border-gray-200 rounded flex items-center justify-center">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M14 5L21 12L14 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                          <span className="text-xs text-gray-500">Right</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save Round Button */}
                <div className="mt-8">
                  <button
                    onClick={handleSaveRound}
                    disabled={!selectedCourse || !selectedTeeBox || holes.some(hole => !hole.score)}
                    className={`
                      w-full py-3 rounded-lg transition-colors
                      ${!selectedCourse || !selectedTeeBox || holes.some(hole => !hole.score)
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-[#15803D] text-white hover:bg-[#126c33]'
                      }
                    `}
                  >
                    Save Round
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Number Grid */}
        <ScoreNumberGrid
          isOpen={numberGrid.isOpen}
          onClose={() => setNumberGrid(prev => ({ ...prev, isOpen: false }))}
          onSelect={(value) => {
            handleHoleChange(numberGrid.holeIndex, numberGrid.type, value);
            if (value !== '' && numberGrid.holeIndex < 17) {
              // Advance to next hole
              const nextHoleIndex = numberGrid.holeIndex + 1;
              const nextInput = document.querySelector(`input[data-hole="${nextHoleIndex}"][data-type="${numberGrid.type}"]`);
              setNumberGrid(prev => ({
                ...prev,
                isOpen: true,
                holeIndex: nextHoleIndex,
                position: (() => {
                  if (nextInput) {
                    const rect = nextInput.getBoundingClientRect();
                    return {
                      top: rect.bottom + window.scrollY + 8,
                      left: rect.left + rect.width / 2
                    };
                  }
                  return prev.position;
                })(),
              }));
            } else {
              // Close if last hole or cleared
              setNumberGrid(prev => ({ ...prev, isOpen: false }));
            }
          }}
          par={parseInt(holes[numberGrid.holeIndex]?.par || '4')}
          type={numberGrid.type}
          position={numberGrid.position}
          holeNumber={numberGrid.holeIndex + 1}
        />
      </main>
    </div>
  );
} 