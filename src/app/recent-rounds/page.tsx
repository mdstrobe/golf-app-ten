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

export default function RecentRounds() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalRounds, setTotalRounds] = useState(0);
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
        setTotalRounds(transformedRounds.length);
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
      {/* Header */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/dashboard" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Back to Dashboard</span>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto p-6">
        {/* Stats Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Round Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-500">Total Rounds</div>
              <div className="text-2xl font-bold text-gray-900">{filteredRounds.length}</div>
            </div>
            {filteredRounds.length > 0 && (
              <>
                <div>
                  <div className="text-sm text-gray-500">Average Score</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {averages.avgScore}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Average Putts</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {averages.avgPutts > 0 ? averages.avgPutts : '-'}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Average GIR</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {averages.avgGir > 0 ? `${averages.avgGir}%` : '-'}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Modern pill-style filter bar */}
        <div className="flex gap-2 overflow-x-auto py-2 px-1 bg-gray-50 rounded-xl mb-6 scrollbar-hide">
          <button
            className={`px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${selectedYear === '' ? 'bg-green-100 text-green-700' : 'bg-white text-gray-700 border'}`}
            onClick={() => setSelectedYear('')}
          >
            All Years
          </button>
          {years.map(year => (
            <button
              key={year}
              className={`px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${selectedYear === year ? 'bg-green-100 text-green-700' : 'bg-white text-gray-700 border'}`}
              onClick={() => setSelectedYear(year)}
            >
              {year}
            </button>
          ))}
          <div className="flex items-center gap-1 ml-4">
            <button
              className={`px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${sortBy === 'date' ? 'bg-green-100 text-green-700' : 'bg-white text-gray-700 border'}`}
              onClick={() => setSortBy('date')}
            >
              Date
            </button>
            <button
              className={`px-4 py-2 rounded-full text-sm font-medium transition whitespace-nowrap ${sortBy === 'score' ? 'bg-green-100 text-green-700' : 'bg-white text-gray-700 border'}`}
              onClick={() => setSortBy('score')}
            >
              Score
            </button>
            <button
              className="ml-2 px-2 py-2 rounded-full bg-white border text-gray-700 hover:bg-green-100"
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              aria-label="Toggle sort order"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>

        {/* Rounds List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-6">
              <div className="animate-pulse space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-gray-100 h-24 rounded-lg"></div>
                ))}
              </div>
            </div>
          ) : sortedRounds.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No rounds recorded yet.
            </div>
          ) : (
            <div>
              {Object.entries(groupedByMonth).map(([month, monthRounds]) => (
                <div key={month} className="mb-6">
                  <div className="bg-gray-50 px-6 py-2 text-lg font-semibold text-gray-700 rounded-t-lg border-b border-gray-200">{month}</div>
                  <div className="divide-y divide-gray-100">
                    {monthRounds.map((round) => (
                      <div key={round.id} className="p-4 hover:bg-green-50 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-medium text-gray-900 truncate">
                              {round.course?.name || 'Unknown Course'}
                            </h3>
                            <span className="text-xs text-gray-500 truncate">{round.course ? `${round.course.city}, ${round.course.state}` : 'Location unavailable'}</span>
                          </div>
                          <div className="flex gap-4 mt-2 text-sm text-gray-600">
                            <span>Date: {new Date(round.date_played).toLocaleDateString()}</span>
                            <span>Score: <span className="font-semibold text-gray-900">{round.total_score}</span></span>
                            <span>Putts: {round.total_putts}</span>
                            <span>Fairways: {Math.round((round.total_fairways_hit / 14) * 100)}%</span>
                            <span>GIR: {Math.round((round.total_gir / 18) * 100)}%</span>
                          </div>
                          {round.tee_box && (
                            <div className="mt-1 text-xs text-gray-500">
                              {round.tee_box.tee_name} • Rating: {round.tee_box.rating} • Slope: {round.tee_box.slope}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end min-w-[80px]">
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <div className="text-2xl font-bold text-green-700">{round.total_score}</div>
                              <div className="text-xs text-gray-500">{new Date(round.date_played).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                            </div>
                            <Link href={`/edit-round/${round.id}`} className="text-gray-400 hover:text-gray-600 transition-colors">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                              </svg>
                            </Link>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                if (window.confirm('Are you sure you want to delete this round?')) {
                                  handleDeleteRound(round.id);
                                }
                              }}
                              className="text-red-400 hover:text-red-600 transition-colors"
                              title="Delete round"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 