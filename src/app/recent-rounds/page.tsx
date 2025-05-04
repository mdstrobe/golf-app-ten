"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { auth } from "@/firebase";
import Link from 'next/link';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Round {
  id: string;
  date_played: string;
  total_score: number;
  total_putts: number;
  total_fairways_hit: number;
  total_gir: number;
  course: {
    name: string;
    city: string;
    state: string;
  } | null;
  tee_box: {
    tee_name: string;
    rating: number;
    slope: number;
  } | null;
}

// Haptic feedback helper
function triggerHaptic() {
  if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
    window.navigator.vibrate(10);
  }
}

export default function RecentRounds() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'score'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleDeleteRound = async (roundId: string) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Get user's ID from the users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('firebase_uid', currentUser.uid)
        .single();

      if (userError || !userData) {
        throw new Error('User not found');
      }

      // Delete the round
      const { error: deleteError } = await supabase
        .from('golf_rounds')
        .delete()
        .eq('id', roundId)
        .eq('user_id', userData.id);

      if (deleteError) {
        throw deleteError;
      }

      // Update local state
      setRounds(prevRounds => prevRounds.filter(round => round.id !== roundId));
    } catch (error) {
      console.error('Error deleting round:', error);
      alert('Failed to delete round. Please try again.');
    }
  };

  const calculateAverages = (roundsToCalculate: Round[]) => {
    if (roundsToCalculate.length === 0) return { avgScore: 0, avgPutts: 0, avgGir: 0 };

    // Calculate average score
    const totalScore = roundsToCalculate.reduce((acc, round) => acc + round.total_score, 0);
    const avgScore = Math.round(totalScore / roundsToCalculate.length);

    // Calculate average putts (only for rounds with putts data)
    const roundsWithPutts = roundsToCalculate.filter(round => round.total_putts != null);
    const avgPutts = roundsWithPutts.length > 0
      ? Math.round(roundsWithPutts.reduce((acc, round) => acc + round.total_putts, 0) / roundsWithPutts.length)
      : 0;

    // Calculate average GIR (as a percentage of 18 holes)
    const roundsWithGir = roundsToCalculate.filter(round => round.total_gir != null);
    const avgGir = roundsWithGir.length > 0
      ? Math.round((roundsWithGir.reduce((acc, round) => acc + round.total_gir, 0) / (roundsWithGir.length * 18)) * 100)
      : 0;

    return { avgScore, avgPutts, avgGir };
  };

  useEffect(() => {
    const fetchRounds = async () => {
      try {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          throw new Error('User not authenticated');
        }

        // Get user's ID from the users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('firebase_uid', currentUser.uid)
          .single();

        if (userError || !userData) {
          throw new Error('User not found');
        }

        // Fetch rounds with course and tee box information
        const { data: roundsData, error: roundsError } = await supabase
          .from('golf_rounds')
          .select(`
            id,
            date_played,
            total_score,
            total_putts,
            total_fairways_hit,
            total_gir,
            course:course_id (
              name,
              city,
              state
            ),
            tee_box:tee_box_id (
              tee_name,
              rating,
              slope
            )
          `)
          .eq('user_id', userData.id)
          .order('date_played', { ascending: false });

        if (roundsError) {
          console.error('Error fetching rounds:', roundsError);
          throw roundsError;
        }

        // Transform the data to match our Round interface
        const transformedRounds: Round[] = roundsData?.map(round => {
          const typedRound = round as unknown as {
            id: string;
            date_played: string;
            total_score: number;
            total_putts: number;
            total_fairways_hit: number;
            total_gir: number;
            course: { name: string; city: string; state: string };
            tee_box: { tee_name: string; rating: number; slope: number };
          };

          return {
            id: typedRound.id,
            date_played: typedRound.date_played,
            total_score: typedRound.total_score,
            total_putts: typedRound.total_putts,
            total_fairways_hit: typedRound.total_fairways_hit,
            total_gir: typedRound.total_gir,
            course: typedRound.course,
            tee_box: typedRound.tee_box
          };
        }) || [];

        setRounds(transformedRounds);
      } catch (error) {
        console.error('Error fetching rounds:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRounds();
  }, []);

  // Filter rounds by selected year
  const filteredRounds = selectedYear ? rounds.filter(r => new Date(r.date_played).getFullYear().toString() === selectedYear) : rounds;

  // Calculate averages based on filtered rounds
  const averages = calculateAverages(filteredRounds);

  // Extract unique years from rounds
  const years = Array.from(new Set(rounds.map(r => new Date(r.date_played).getFullYear().toString()))).sort((a, b) => b.localeCompare(a));

  // Sort rounds
  const sortedRounds = [...filteredRounds].sort((a, b) => {
    if (sortBy === 'date') {
      const aDate = new Date(a.date_played).getTime();
      const bDate = new Date(b.date_played).getTime();
      return sortOrder === 'asc' ? aDate - bDate : bDate - aDate;
    } else {
      return sortOrder === 'asc' ? a.total_score - b.total_score : b.total_score - a.total_score;
    }
  });

  // Group rounds by month
  const groupedByMonth: { [month: string]: Round[] } = {};
  sortedRounds.forEach(round => {
    const month = new Date(round.date_played).toLocaleString('default', { month: 'long' });
    if (!groupedByMonth[month]) groupedByMonth[month] = [];
    groupedByMonth[month].push(round);
  });

  // Modern pill-style filter bar
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Page Title */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 flex items-center gap-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Back</span>
            </Link>

          </div>
          {/* Search button placeholder */}
          <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100">
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
          </button>
        </div>
      </nav>

      {/* Filter Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-1">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          <button
            className={`px-2.5 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap ${selectedYear === '' ? 'bg-green-100 text-green-700' : 'bg-white text-gray-700 border'}`}
            onClick={() => { setSelectedYear(''); triggerHaptic(); }}
          >
            All Years
          </button>
          {years.map(year => (
            <button
              key={year}
              className={`px-2.5 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap ${selectedYear === year ? 'bg-green-100 text-green-700' : 'bg-white text-gray-700 border'}`}
              onClick={() => { setSelectedYear(year); triggerHaptic(); }}
            >
              {year}
            </button>
          ))}
          <div className="flex items-center gap-1 ml-2">
            <button
              className={`px-2.5 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap ${sortBy === 'date' ? 'bg-green-100 text-green-700' : 'bg-white text-gray-700 border'}`}
              onClick={() => { setSortBy('date'); triggerHaptic(); }}
            >
              Date
            </button>
            <button
              className={`px-2.5 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap ${sortBy === 'score' ? 'bg-green-100 text-green-700' : 'bg-white text-gray-700 border'}`}
              onClick={() => { setSortBy('score'); triggerHaptic(); }}
            >
              Score
            </button>
            <button
              className="ml-1 px-1.5 py-1.5 rounded-full bg-white border text-gray-700 hover:bg-green-100 text-xs"
              onClick={() => { setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); triggerHaptic(); }}
              aria-label="Toggle sort order"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {/* Slim Stats Card */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-2">
        <div className="bg-white rounded-lg shadow-sm px-4 py-3 mb-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
          <div className="text-base font-semibold text-gray-900 text-center sm:text-left">{filteredRounds.length} Total</div>
          <div className="flex flex-col sm:flex-row gap-1 sm:gap-6 text-xs sm:text-sm text-gray-600 items-center sm:items-end justify-center">
            <span>Avg Score: <span className="font-bold text-gray-900">{averages.avgScore}</span></span>
            <span>Avg Putts: <span className="font-bold text-gray-900">{averages.avgPutts > 0 ? averages.avgPutts : '-'}</span></span>
            <span>Avg GIR: <span className="font-bold text-gray-900">{averages.avgGir > 0 ? `${averages.avgGir}%` : '-'}</span></span>
          </div>
        </div>
      </div>

      {/* Rounds List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
          {loading ? (
            <div className="p-6">
              <div className="animate-pulse space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-gray-100 h-16 rounded-lg"></div>
                ))}
              </div>
            </div>
          ) : sortedRounds.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No rounds recorded yet.
            </div>
          ) : (
            <div>
              {sortedRounds.map((round) => (
                <div key={round.id} className="flex items-center justify-between py-2 px-2 hover:bg-green-50 transition-colors">
                  {/* Left: Course and details */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 truncate">{round.course?.name || 'Unknown Course'}</div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 truncate mt-0.5">
                      <span>{round.tee_box?.tee_name || 'Tee box unavailable'}</span>
                      <span className="text-gray-400">•</span>
                      <span>{round.date_played}</span>
                    </div>
                  </div>
                  {/* Right: Score and delete, side by side and shrunk */}
                  <div className="flex items-center min-w-[44px] ml-2 gap-2">
                    <div className="w-8 h-8 flex items-center justify-center rounded-full bg-[#15803D] text-white font-bold text-base">
                      {round.total_score}
                    </div>
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this round?')) {
                          handleDeleteRound(round.id);
                        }
                      }}
                      className="text-gray-300 hover:text-gray-600 transition-colors p-0.5"
                      title="Delete round"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 