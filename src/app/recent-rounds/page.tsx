"use client";

import { Metadata } from 'next';
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
  const metadata: Metadata = {
    title: 'Recent Rounds',
  };

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

  const getFilteredRounds = (rounds: Round[]) => {
    const currentYear = new Date().getFullYear().toString();
    const lastYear = (new Date().getFullYear() - 1).toString();
    
    return rounds.filter(round => {
      const roundYear = new Date(round.date_played).getFullYear().toString();
      if (selectedYear === 'current') return roundYear === currentYear;
      if (selectedYear === 'last') return roundYear === lastYear;
      return true;
    });
  };

  const getSortedRounds = (rounds: Round[]) => {
    return [...rounds].sort((a, b) => {
      if (sortBy === 'date') {
        const aDate = new Date(a.date_played).getTime();
        const bDate = new Date(b.date_played).getTime();
        return sortOrder === 'asc' ? aDate - bDate : bDate - aDate;
      } else {
        return sortOrder === 'asc' ? a.total_score - b.total_score : b.total_score - a.total_score;
      }
    });
  };

  const groupRoundsByDate = (rounds: Round[]) => {
    const filteredRounds = getFilteredRounds(rounds);
    const sortedRounds = getSortedRounds(filteredRounds);
    
    const grouped = sortedRounds.reduce((acc, round) => {
      const date = new Date(round.date_played);
      const year = date.getFullYear().toString();
      const month = date.toLocaleString('default', { month: 'long' });
      
      if (!acc[year]) {
        acc[year] = {};
      }
      if (!acc[year][month]) {
        acc[year][month] = [];
      }
      acc[year][month].push(round);
      return acc;
    }, {} as Record<string, Record<string, Round[]>>);

    // Sort months within each year
    Object.keys(grouped).forEach(year => {
      const monthOrder = Object.keys(grouped[year]).sort((a, b) => {
        const monthA = new Date(Date.parse(`${a} 1, 2000`));
        const monthB = new Date(Date.parse(`${b} 1, 2000`));
        return sortOrder === 'desc' ? monthB.getTime() - monthA.getTime() : monthA.getTime() - monthB.getTime();
      });
      
      const sortedMonths = {} as Record<string, Round[]>;
      monthOrder.forEach(month => {
        sortedMonths[month] = grouped[year][month].sort((a, b) => {
          const dateA = new Date(a.date_played).getTime();
          const dateB = new Date(b.date_played).getTime();
          return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });
      });
      grouped[year] = sortedMonths;
    });

    return grouped;
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

  const groupedRounds = groupRoundsByDate(rounds);
  const years = Object.keys(groupedRounds).sort((a, b) => 
    sortOrder === 'desc' ? parseInt(b) - parseInt(a) : parseInt(a) - parseInt(b)
  );

  return (
    <div className="min-h-screen bg-gray-50 py-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link 
              href="/dashboard" 
              className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg 
                width="20" 
                height="20" 
                viewBox="0 0 24 24" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className="stroke-current"
              >
                <path 
                  d="M15 18L9 12L15 6" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />
              </svg>
              <span>Back</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Total Rounds: {rounds.length}</span>
          </div>
        </div>
      </div>

      {/* Stats Card */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-sm text-gray-500">Average Score</div>
              <div className="text-xl font-semibold text-gray-900">{calculateAverages(rounds).avgScore}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-500">Average Putts</div>
              <div className="text-xl font-semibold text-gray-900">
                {calculateAverages(rounds).avgPutts || '-'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-gray-500">Average GIR</div>
              <div className="text-xl font-semibold text-gray-900">
                {calculateAverages(rounds).avgGir > 0 ? `${calculateAverages(rounds).avgGir}%` : '-'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="flex flex-wrap gap-2">
          {/* Year filters */}
          <div className="flex gap-2">
            <button
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                selectedYear === '' ? 'bg-green-100 text-green-700' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
              onClick={() => { setSelectedYear(''); triggerHaptic(); }}
            >
              All Time
            </button>
            <button
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                selectedYear === 'current' ? 'bg-green-100 text-green-700' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
              onClick={() => { setSelectedYear('current'); triggerHaptic(); }}
            >
              This Year
            </button>
            <button
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                selectedYear === 'last' ? 'bg-green-100 text-green-700' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
              onClick={() => { setSelectedYear('last'); triggerHaptic(); }}
            >
              Last Year
            </button>
          </div>

          {/* Sort options */}
          <div className="flex gap-2 ml-auto">
            <button
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                sortBy === 'date' ? 'bg-green-100 text-green-700' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
              onClick={() => { setSortBy('date'); triggerHaptic(); }}
            >
              Date
            </button>
            <button
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                sortBy === 'score' ? 'bg-green-100 text-green-700' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
              onClick={() => { setSortBy('score'); triggerHaptic(); }}
            >
              Score
            </button>
            <button
              className="px-3 py-1.5 rounded-full text-sm font-medium bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 transition"
              onClick={() => { setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'); triggerHaptic(); }}
              aria-label="Toggle sort order"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {/* Rounds List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="animate-pulse space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-gray-100 h-16 rounded-lg"></div>
              ))}
            </div>
          </div>
        ) : rounds.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center text-gray-500">
            No rounds recorded yet.
          </div>
        ) : (
          years.map(year => (
            <div key={year} className="mb-8">
              {Object.entries(groupedRounds[year]).map(([month, monthRounds]) => (
                <div key={`${year}-${month}`} className="mb-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">{`${month} ${year} rounds`}</h2>
                  <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-100">
                    {monthRounds.map((round) => (
                      <div key={round.id} className="flex items-center justify-between p-4 hover:bg-green-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-[#15803D] text-white font-bold text-lg">
                              {round.total_score}
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">{round.course?.name || 'Unknown Course'}</div>
                              <div className="text-sm text-gray-500">
                                {new Date(round.date_played).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-sm text-gray-600">
                            <div>{round.tee_box?.tee_name || 'Unknown Tees'}</div>
                            <div className="text-right">{`${round.total_putts || '-'} putts`}</div>
                          </div>
                          <button
                            onClick={() => {
                              if (window.confirm('Are you sure you want to delete this round?')) {
                                handleDeleteRound(round.id);
                              }
                            }}
                            className="text-gray-300 hover:text-gray-600 transition-colors p-1"
                            title="Delete round"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}