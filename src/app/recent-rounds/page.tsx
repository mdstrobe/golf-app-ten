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

  const calculateAverages = () => {
    if (rounds.length === 0) return { avgScore: 0, avgPutts: 0, avgGir: 0 };

    // Calculate average score
    const totalScore = rounds.reduce((acc, round) => acc + round.total_score, 0);
    const avgScore = Math.round(totalScore / rounds.length);

    // Calculate average putts (only for rounds with putts data)
    const roundsWithPutts = rounds.filter(round => round.total_putts != null);
    const avgPutts = roundsWithPutts.length > 0
      ? Math.round(roundsWithPutts.reduce((acc, round) => acc + round.total_putts, 0) / roundsWithPutts.length)
      : 0;

    // Calculate average GIR (as a percentage of 18 holes)
    const roundsWithGir = rounds.filter(round => round.total_gir != null);
    const avgGir = roundsWithGir.length > 0
      ? Math.round((roundsWithGir.reduce((acc, round) => acc + round.total_gir, 0) / (roundsWithGir.length * 18)) * 100)
      : 0;

    return { avgScore, avgPutts, avgGir };
  };

  const averages = calculateAverages();

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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Card */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Round Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-500">Total Rounds</div>
              <div className="text-2xl font-bold text-gray-900">{totalRounds}</div>
            </div>
            {totalRounds > 0 && (
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

        {/* Rounds List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Recent Rounds</h2>
          </div>
          
          {loading ? (
            <div className="p-6">
              <div className="animate-pulse space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-gray-100 h-24 rounded-lg"></div>
                ))}
              </div>
            </div>
          ) : rounds.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No rounds recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {rounds.map((round) => (
                <div key={round.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">
                        {round.course?.name || 'Unknown Course'}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {round.course ? `${round.course.city}, ${round.course.state}` : 'Location unavailable'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">{round.total_score}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(round.date_played).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mt-4">
                    <div>
                      <div className="text-sm text-gray-500">Putts</div>
                      <div className="text-base font-medium text-gray-900">{round.total_putts}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Fairways</div>
                      <div className="text-base font-medium text-gray-900">
                        {Math.round((round.total_fairways_hit / 14) * 100)}%
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">GIR</div>
                      <div className="text-base font-medium text-gray-900">
                        {Math.round((round.total_gir / 18) * 100)}%
                      </div>
                    </div>
                  </div>
                  {round.tee_box && (
                    <div className="mt-4 text-sm text-gray-500">
                      {round.tee_box.tee_name} • Rating: {round.tee_box.rating} • Slope: {round.tee_box.slope}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 