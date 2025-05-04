"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/firebase";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { supabase } from "@/supabase";
import '../globals.css'; // Ensure global styles are loaded

interface UserData {
  id: number;
  firebase_uid: string;
  email: string;
  created_at: string;
}

interface GolfRound {
  id: string;
  user_id: number;
  date_played: string;
  submission_type: string;
  front_nine_scores: number[] | null;
  back_nine_scores: number[] | null;
  front_nine_putts: number[] | null;
  back_nine_putts: number[] | null;
  front_nine_fairways: number[] | null;
  back_nine_fairways: number[] | null;
  front_nine_gir: number[] | null;
  back_nine_gir: number[] | null;
  total_score: number;
  total_putts: number;
  total_fairway: number;
  total_gir: number;
}

interface PerformanceAnalysisProps {
  allRounds: GolfRound[];
}

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
}

const PerformanceAnalysis: React.FC<PerformanceAnalysisProps> = ({ allRounds }) => {
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const generateAnalysis = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/analyze-performance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ allRounds })
        });
        if (!response.ok) {
          throw new Error('Failed to generate analysis');
        }
        const data = await response.json();
        setAnalysis(data.analysis);
      } catch (error) {
        console.error('Error generating analysis:', error);
        setAnalysis('Unable to generate performance analysis at this time.');
      } finally {
        setLoading(false);
      }
    };
    if (allRounds && allRounds.length >= 6) {
      generateAnalysis();
    }
  }, [allRounds]);

  // Format the Gemini response for branding
  const renderFormattedAnalysis = () => {
    if (!analysis) return null;
    // Try to split by numbered or bolded sections
    const majorMatch = analysis.match(/Major Insight[:：]?([\s\S]+?)(Specific Insight|Par [345]s? Insight|$)/i);
    const specificMatch = analysis.match(/(Specific Insight|Par [345]s? Insight)[:：]?([\s\S]+)/i);
    const major = majorMatch ? majorMatch[1].trim() : '';
    const specific = specificMatch ? specificMatch[2].trim() : '';
    // Detect trend for color
    const isPositive = /improve|improvement|decrease|lower|better|reduced|increased gir|more/i.test(major);
    const isNegative = /worsen|decline|increase|higher|worse|less gir|fewer/i.test(major);
    const accent = isPositive ? 'text-green-700' : isNegative ? 'text-red-700' : 'text-gray-700';
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
<h2 className="text-xl font-bold mb-6">AI-Powered Performance Analysis</h2>
        {major && (
          <div className={`mb-3 ${accent} font-medium`}><span className="font-bold">Major Insight:</span> {major}</div>
        )}
        {specific && (
          <div className="text-gray-700"><span className="font-bold">Key Detail:</span> {specific}</div>
        )}
        {!major && !specific && (
          <div className="text-gray-700">{analysis}</div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
        <h2 className="text-xl font-bold mb-4">Performance Analysis</h2>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div>{renderFormattedAnalysis()}</div>
  );
};

function AIPoweredChatBox({ allRounds }: { allRounds: GolfRound[] }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const suggestedQuestions = [
    'How can I lower my average score?',
    'What is my biggest area for improvement?',
    'How does my putting compare to my GIR percentage?'
  ];

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  const handleSend = async (question?: string) => {
    if (!question && !input) return;
    const userQuestion = question || input;
    setMessages((prev) => [...prev, { role: 'user', text: userQuestion }]);
    setInput('');
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/ai-chat-gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userQuestion, allRounds })
      });
      if (!res.ok) throw new Error('Failed to get AI response');
      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'ai', text: data.answer }]);
    } catch (error) {
      setError('Unable to get AI response. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm px-4 py-5 mb-8">
      <h2 className="text-xl font-bold mb-3">Ask Fairway AI</h2>
      <div className="flex flex-wrap gap-2 mb-3">
        {suggestedQuestions.map((q, i) => (
          <button
            key={i}
            className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-xs hover:bg-green-100 hover:text-green-700 transition"
            onClick={() => handleSend(q)}
            disabled={loading}
          >
            {q}
          </button>
        ))}
      </div>
      <div className="border rounded-lg bg-gray-50 p-3 h-48 overflow-y-auto mb-3 flex flex-col gap-2 text-sm">
        {messages.length === 0 && (
          <div className="text-gray-400 text-center my-auto">Ask a question about your golf data!</div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={msg.role === 'user' ? 'text-right' : 'text-left'}>
            <span className={msg.role === 'user' ? 'inline-block bg-green-100 text-green-800 px-2 py-1 rounded-lg' : 'inline-block bg-gray-200 text-gray-700 px-2 py-1 rounded-lg'}>
              {msg.text}
            </span>
          </div>
        ))}
        {loading && <div className="text-gray-400 text-center">AI is thinking...</div>}
        {error && <div className="text-red-500 text-center">{error}</div>}
        <div ref={messagesEndRef} />
      </div>
      <form
        className="flex gap-2"
        onSubmit={e => { e.preventDefault(); handleSend(undefined); }}
      >
        <input
          type="text"
          className="flex-1 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#15803D] focus:border-transparent"
          placeholder="Ask anything about your golf stats..."
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={loading}
        />
        <button
          type="submit"
          className="bg-[#15803D] text-white px-4 py-2 rounded-lg font-semibold hover:bg-[#126c33] transition"
          disabled={loading || !input.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
}

// --- Simulate Round Modal Placeholder ---
function SimulateRoundModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:w-[400px] max-w-full p-0 sm:p-6 animate-slideup relative">
      <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700" onClick={onClose} aria-label="Close">
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 6L18 18M6 18L18 6"/></svg>
      </button>
      <div className="mb-4">
        <h2 className="text-xl font-bold mb-3">Simulate a Round</h2>
        <p className="text-gray-600 text-sm">(Coming soon) Use your stats to simulate a round of golf and see projected outcomes!</p>
      </div>
      {/* Simulation UI will go here */}
      <div className="text-center text-gray-400 py-8">Simulation feature coming soon.</div>
    </div>
  );
}

export default function Dashboard() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [golfRounds, setGolfRounds] = useState<GolfRound[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    currentHcp: "",
    hcpChange: "0%",
    avgScore: "",
    scoreChange: "0%",
    girPercentage: "",
    girChange: "0%",
    puttsPerRound: "",
    puttsChange: "0%"
  });
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    let isSubscribed = true;
    const fetchData = async (user: User | null) => {
      setIsLoading(true);
      
      if (!user) {
        router.push("/auth");
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("firebase_uid", user.uid)
        .single();
      
      if (userError || !userData) {
        console.error("Error fetching user data:", userError);
        if (isSubscribed) {
          setFetchError("User data not found in Supabase. Please sign up again or contact support.");
        }
        return;
      }

      if (!userData.id) {
        console.error("User data found but missing ID");
        setFetchError("Invalid user data format. Please contact support.");
        return;
      }

      if (isSubscribed) {
        setUserData(userData);
      }

      // Ensure user_id is treated as a number.
      const userId = parseInt(userData.id.toString(), 10);
      
      const { data: roundsData, error: roundsError } = await supabase
        .from("golf_rounds")
        .select("*")
        .eq("user_id", userId);
      
      if (roundsError) {
        console.error("Error fetching golf rounds:", roundsError);
        setFetchError("Error loading your golf rounds. Please try again later.");
        return;
      }

      if (roundsData && isSubscribed) {
        setGolfRounds(roundsData);
      }
      setIsLoading(false);
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push("/auth");
        return;
      }
      fetchData(user);
    });

    return () => {
      isSubscribed = false;
      unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (golfRounds.length === 0) {
      setStats({
        currentHcp: "0.0",
        hcpChange: "0%",
        avgScore: "0",
        scoreChange: "0%",
        girPercentage: "0%",
        girChange: "0%",
        puttsPerRound: "0.0",
        puttsChange: "0%"
      });
      return;
    }

    try {
      // Sort rounds by date (most recent first)
      const sortedRounds = [...golfRounds].sort((a, b) => 
        new Date(b.date_played).getTime() - new Date(a.date_played).getTime()
      );

      // Get the most recent 5 rounds
      const recentRounds = sortedRounds.slice(0, 5);
      // Get the next 5 most recent rounds (or all remaining if less than 5)
      const previousRounds = sortedRounds.slice(5, 10);

      // Calculate averages for recent rounds
      const recentAvgScore = recentRounds.reduce((sum, round) => sum + (round.total_score || 0), 0) / recentRounds.length;
      const recentAvgPutts = recentRounds.reduce((sum, round) => sum + (round.total_putts || 0), 0) / recentRounds.length;
      const recentTotalGir = recentRounds.reduce((sum, round) => sum + (round.total_gir || 0), 0);
      const recentGirPercentage = (recentTotalGir / (recentRounds.length * 18)) * 100;

      // Calculate averages for previous rounds if they exist
      let previousAvgScore = 0;
      let previousAvgPutts = 0;
      let previousGirPercentage = 0;
      let scoreChange = "0%";
      let puttsChange = "0%";
      let girChange = "0%";

      if (previousRounds.length > 0) {
        previousAvgScore = previousRounds.reduce((sum, round) => sum + (round.total_score || 0), 0) / previousRounds.length;
        previousAvgPutts = previousRounds.reduce((sum, round) => sum + (round.total_putts || 0), 0) / previousRounds.length;
        const previousTotalGir = previousRounds.reduce((sum, round) => sum + (round.total_gir || 0), 0);
        previousGirPercentage = (previousTotalGir / (previousRounds.length * 18)) * 100;

        console.log('Recent Rounds:', recentRounds.map(r => ({
          date: r.date_played,
          score: r.total_score,
          putts: r.total_putts,
          gir: r.total_gir
        })));
        console.log('Previous Rounds:', previousRounds.map(r => ({
          date: r.date_played,
          score: r.total_score,
          putts: r.total_putts,
          gir: r.total_gir
        })));

        console.log('Recent Averages:', {
          score: recentAvgScore,
          putts: recentAvgPutts,
          gir: recentGirPercentage
        });
        console.log('Previous Averages:', {
          score: previousAvgScore,
          putts: previousAvgPutts,
          gir: previousGirPercentage
        });

        // Calculate percentage changes
        // For score and putts, a positive change is bad (getting worse)
        const scoreDiff = recentAvgScore - previousAvgScore;
        const puttsDiff = recentAvgPutts - previousAvgPutts;
        const girDiff = recentGirPercentage - previousGirPercentage;

        console.log('Raw Differences:', {
          score: scoreDiff,
          putts: puttsDiff,
          gir: girDiff
        });

        scoreChange = `${Math.round((scoreDiff / previousAvgScore) * 100)}%`;
        puttsChange = `${Math.round((puttsDiff / previousAvgPutts) * 100)}%`;
        girChange = `${Math.round((girDiff / previousGirPercentage) * 100)}%`;

        console.log('Final Percentage Changes:', {
          score: scoreChange,
          putts: puttsChange,
          gir: girChange
        });
      }

      // Simple handicap calculation
      const courseRating = 72;
      const avgScoreDiff = recentAvgScore - courseRating;
      const estimatedHcp = Math.max(0, avgScoreDiff * 0.96);

      setStats({
        currentHcp: estimatedHcp.toFixed(1),
        hcpChange: "0%",
        avgScore: Math.round(recentAvgScore).toString(),
        scoreChange: golfRounds.length >= 6 ? scoreChange : "0%",
        girPercentage: `${Math.round(recentGirPercentage)}%`,
        girChange: golfRounds.length >= 6 ? girChange : "0%",
        puttsPerRound: recentAvgPutts.toFixed(1),
        puttsChange: golfRounds.length >= 6 ? puttsChange : "0%"
      });
    } catch (error) {
      console.error("Error calculating stats:", error);
      setStats({
        currentHcp: "ERR",
        hcpChange: "0%",
        avgScore: "ERR",
        scoreChange: "0%",
        girPercentage: "ERR",
        girChange: "0%",
        puttsPerRound: "ERR",
        puttsChange: "0%"
      });
    }
  }, [golfRounds]);

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/auth");
  };

  if (fetchError) return <div className="p-4 text-red-500">{fetchError}</div>;
  if (!userData) return <div className="p-4">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full flex items-center justify-center">
                <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="100" cy="100" r="90" fill="#15803D" />
                  <circle cx="100" cy="85" r="35" fill="white" />
                  <circle cx="100" cy="85" r="35" fill="url(#golfBallPattern)" />
                  <defs>
                    <pattern id="golfBallPattern" patternUnits="userSpaceOnUse" width="10" height="10">
                      <circle cx="5" cy="5" r="1" fill="#E5E7EB" opacity="0.3" />
                      <line x1="0" y1="5" x2="10" y2="5" stroke="#E5E7EB" strokeWidth="0.5" opacity="0.2" />
                      <line x1="5" y1="0" x2="5" y2="10" stroke="#E5E7EB" strokeWidth="0.5" opacity="0.2" />
                    </pattern>
                  </defs>
                  <path d="M100 120 L100 150" stroke="#A37B43" strokeWidth="10" strokeLinecap="round" />
                </svg>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button className="w-8 h-8 text-[#15803D] hover:text-[#126c33] transition-colors flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22C10.8954 22 10 21.1046 10 20H14C14 21.1046 13.1046 22 12 22Z" fill="currentColor"/>
                  <path d="M18 9C18 5.68629 15.3137 3 12 3C8.68629 3 6 5.68629 6 9C6 16 3 17 3 17H21C21 17 18 16 18 9" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </button>
              <div className="relative" ref={userMenuRef}>
              <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="w-8 h-8 bg-[#15803D] text-white rounded-full flex items-center justify-center hover:bg-[#126c33] transition-colors"
              >
                {userData.email.charAt(0).toUpperCase()}
              </button>
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-10">
                    <button
                      onClick={handleSignOut}
                      className="w-full px-4 py-2 text-left text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M16 17L21 12L16 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col gap-6 mb-8">
          <h1 className="text-2xl font-bold">Welcome back, {userData.email.split("@")[0]}!</h1>
          <div className="grid grid-cols-2 gap-3 sm:w-[400px]">
            <button
              onClick={() => router.push('/recent-rounds')}
              className="flex-1 border-2 border-[#15803D] text-[#15803D] h-11 rounded-lg hover:bg-[#15803D] hover:text-white transition-colors flex items-center justify-center gap-2"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 7C4 5.89543 4.89543 5 6 5H18C19.1046 5 20 5.89543 20 7V17C20 18.1046 19.1046 19 18 19H6C4.89543 19 4 18.1046 4 17V7Z" stroke="currentColor" strokeWidth="2"/>
                <path d="M8 3V7M16 3V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <path d="M8 12H16M8 16H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Recent Rounds
            </button>
            <button
              onClick={() => router.push('/add-round')}
              className="flex-1 bg-[#15803D] text-white h-11 rounded-lg hover:bg-[#126c33] transition-colors flex items-center justify-center gap-2"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Add New Round
            </button>
          </div>
        </div>

        {/* Performance Stats */}
        {isLoading ? (
          <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
            <h2 className="text-xl font-bold mb-6">Recent Performance</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="border-b md:border-b-0 md:border-r border-gray-100 pb-4 md:pb-0 md:pr-6 last:border-0">
                  <div className="h-[72px] animate-pulse flex flex-col">
                    <div className="h-5 bg-gray-200 rounded w-20 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm px-4 py-3 mb-6">
            <h2 className="text-xl font-bold mb-6">Recent Performance</h2>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
              <div className="flex flex-wrap gap-2 w-full justify-between">
                {/* HCP */}
                <div className="flex flex-col items-center flex-1 min-w-[70px]">
                  <span className="text-xs text-gray-500 mb-0.5">Current HCP</span>
                  <span className="text-xl font-bold text-gray-900">{stats.currentHcp || "0.0"}</span>
                  <span className={`text-xs flex items-center gap-1 ${parseFloat(stats.hcpChange) > 0 ? 'text-red-500' : 'text-green-600'}`}>{stats.hcpChange}</span>
                </div>
                {/* Avg Score */}
                <div className="flex flex-col items-center flex-1 min-w-[70px]">
                  <span className="text-xs text-gray-500 mb-0.5">Avg. Score</span>
                  <span className="text-xl font-bold text-gray-900">{stats.avgScore || "0"}</span>
                  <span className={`text-xs flex items-center gap-1 ${parseFloat(stats.scoreChange) > 0 ? 'text-red-500' : 'text-green-600'}`}>{stats.scoreChange}</span>
                </div>
                {/* GIR % */}
                <div className="flex flex-col items-center flex-1 min-w-[70px]">
                  <span className="text-xs text-gray-500 mb-0.5">GIR %</span>
                  <span className="text-xl font-bold text-gray-900">{stats.girPercentage || "0%"}</span>
                  <span className={`text-xs flex items-center gap-1 ${parseFloat(stats.girChange) > 0 ? 'text-green-600' : 'text-red-500'}`}>{stats.girChange}</span>
                </div>
                {/* Putts */}
                <div className="flex flex-col items-center flex-1 min-w-[70px]">
                  <span className="text-xs text-gray-500 mb-0.5">Putts/Round</span>
                  <span className="text-xl font-bold text-gray-900">{stats.puttsPerRound || "0.0"}</span>
                  <span className={`text-xs flex items-center gap-1 ${parseFloat(stats.puttsChange) > 0 ? 'text-red-500' : 'text-green-600'}`}>{stats.puttsChange}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Interactive Features */}
        <AIDashboardInteractives allRounds={golfRounds} />
      </main>
    </div>
  );
}

// --- Interactives Section with Modals ---
function AIDashboardInteractives({ allRounds }: { allRounds: GolfRound[] }) {
  const [showChat, setShowChat] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [showSimulate, setShowSimulate] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm">
      <h2 className="text-xl font-bold mb-6">Interactives</h2>
      <div className="flex flex-col gap-3">
        {/* Ask Fairway AI */}
        <button
          onClick={() => setShowChat(true)}
          className="flex items-center justify-between w-full p-4 border-2 border-gray-100 rounded-lg group relative hover:bg-green-50 transition"
        >
          <div className="flex items-center gap-3">
            <div className="text-[#15803D]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 8V12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="text-left">
              <span className="text-gray-900 font-medium">Ask Fairway AI</span>
              <p className="text-sm text-gray-500">Chat with AI about your game</p>
            </div>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-400">
            <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {/* Analyze Game (AI-Powered Insights) */}
        <button
          onClick={() => setShowInsights(true)}
          className="flex items-center justify-between w-full p-4 border-2 border-gray-100 rounded-lg group relative hover:bg-green-50 transition"
        >
          <div className="flex items-center gap-3">
            <div className="text-[#15803D]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 9L12 3L21 9V21H3V9Z" stroke="currentColor" strokeWidth="2"/>
                <path d="M9 21V12H15V21" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <div className="text-left">
              <span className="text-gray-900 font-medium">Analyze Game</span>
              <p className="text-sm text-gray-500">AI-powered insights</p>
            </div>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-400">
            <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {/* Simulate Round */}
        <button
          onClick={() => setShowSimulate(true)}
          className="flex items-center justify-between w-full p-4 border-2 border-gray-100 rounded-lg group relative hover:bg-green-50 transition"
        >
          <div className="flex items-center gap-3">
            <div className="text-[#15803D]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 8V12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="text-left">
              <span className="text-gray-900 font-medium">Simulate Round</span>
              <p className="text-sm text-gray-500">Project a round using your stats</p>
            </div>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-400">
            <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        {/* Other interactives (disabled) */}
        <button
          disabled
          className="flex items-center justify-between w-full p-4 border-2 border-gray-100 rounded-lg group relative opacity-75"
        >
          <div className="flex items-center gap-3">
            <div className="text-[#15803D]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 5.02944 7.02944 1 12 1C16.9706 1 21 5.02944 21 10Z" stroke="currentColor" strokeWidth="2"/>
                <circle cx="12" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <div className="text-left">
              <span className="text-gray-900 font-medium">View Courses</span>
              <p className="text-sm text-gray-500">Browse local courses</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#15803D] font-medium">Coming Soon</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-400">
              <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </button>
        <button
          disabled
          className="flex items-center justify-between w-full p-4 border-2 border-gray-100 rounded-lg group relative opacity-75"
        >
          <div className="flex items-center gap-3">
            <div className="text-[#15803D]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 5H5C3.89543 5 3 5.89543 3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V7C21 5.89543 20.1046 5 19 5Z" stroke="currentColor" strokeWidth="2"/>
                <path d="M7 9H17M7 13H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="text-left">
              <span className="text-gray-900 font-medium">PGA News</span>
              <p className="text-sm text-gray-500">Latest tour updates</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#15803D] font-medium">Coming Soon</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-400">
              <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </button>
      </div>

      {/* Slide-up Modals */}
      {showChat && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center modal-backdrop bg-black/30" onClick={() => setShowChat(false)}>
          <div
            className={`modal-content bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full ${isClosing ? 'closing' : ''}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 pt-8 sm:p-8">
              <h2 className="text-xl font-semibold mb-4">Chat with AI</h2>
              <AIPoweredChatBox allRounds={allRounds} />
            </div>
          </div>
        </div>
      )}
      {showInsights && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center modal-backdrop bg-black/30" onClick={() => setShowInsights(false)}>
          <div
            className={`modal-content bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full ${isClosing ? 'closing' : ''}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 pt-8 sm:p-8">
              <h2 className="text-xl font-semibold mb-4">AI-Powered Insights</h2>
              <PerformanceAnalysis allRounds={allRounds} />
            </div>
          </div>
        </div>
      )}
      {showSimulate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center modal-backdrop bg-black/30" onClick={() => setShowSimulate(false)}>
          <div
            className={`modal-content bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full ${isClosing ? 'closing' : ''}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 pt-8 sm:p-8">
              <SimulateRoundModal onClose={() => {
                setIsClosing(true);
                setTimeout(() => setShowSimulate(false), 300);
              }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}