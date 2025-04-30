"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { supabase } from "@/supabase";

interface UserData {
  id: number;
  firebase_uid: string;
  email: string;
  created_at: string;
}

export default function Dashboard() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/auth");
        return;
      }
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("firebase_uid", user.uid)
        .single();
      if (error || !data) {
        console.error("Error fetching user data:", error);
        setFetchError("User data not found in Supabase. Please sign up again or contact support.");
        return;
      }
      setUserData(data);
    });
    return () => unsubscribe();
  }, [router]);

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
              <span className="ml-2 text-xl font-semibold">Golf Performance App</span>
            </div>
            <div className="flex items-center gap-4">
              <button className="w-8 h-8 text-[#15803D] hover:text-[#126c33] transition-colors flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 22C10.8954 22 10 21.1046 10 20H14C14 21.1046 13.1046 22 12 22Z" fill="currentColor"/>
                  <path d="M18 9C18 5.68629 15.3137 3 12 3C8.68629 3 6 5.68629 6 9C6 16 3 17 3 17H21C21 17 18 16 18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
              <div className="relative">
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
                <path d="M4 7C4 5.89543 4.89543 5 6 5H18C19.1046 5 20 5.89543 20 7V19C20 20.1046 19.1046 21 18 21H6C4.89543 21 4 20.1046 4 19V7Z" stroke="currentColor" strokeWidth="2"/>
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
        <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
          <h2 className="text-xl font-bold mb-6">Recent Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="border-b md:border-b-0 md:border-r border-gray-100 pb-4 md:pb-0 md:pr-6">
              <h3 className="text-gray-600 mb-2">Current HCP</h3>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold">12.4</p>
                <span className="text-green-600 text-sm flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 20V4M5 11L12 4L19 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  8.3%
                </span>
              </div>
            </div>

            <div className="border-b md:border-b-0 md:border-r border-gray-100 pb-4 md:pb-0 md:pr-6">
              <h3 className="text-gray-600 mb-2">Avg. Score</h3>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold">87</p>
                <span className="text-red-600 text-sm flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 4V20M5 13L12 20L19 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  2.1%
                </span>
              </div>
            </div>

            <div className="border-b md:border-b-0 md:border-r border-gray-100 pb-4 md:pb-0 md:pr-6">
              <h3 className="text-gray-600 mb-2">GIR %</h3>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold">42%</p>
                <span className="text-green-600 text-sm flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 20V4M5 11L12 4L19 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  5.7%
                </span>
              </div>
            </div>

            <div>
              <h3 className="text-gray-600 mb-2">Putts Per Round</h3>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold">31.5</p>
                <span className="text-red-600 text-sm flex items-center gap-1">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 4V20M5 13L12 20L19 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  1.2%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Features */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-xl font-bold mb-6">Interactives</h2>
          <div className="flex flex-col gap-3">
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
                    <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 8V12L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="text-left">
                  <span className="text-gray-900 font-medium">Simulate Round</span>
                  <p className="text-sm text-gray-500">Test different scenarios</p>
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
                    <path d="M3 9L12 3L21 9V21H3V9Z" stroke="currentColor" strokeWidth="2"/>
                    <path d="M9 21V12H15V21" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                </div>
                <div className="text-left">
                  <span className="text-gray-900 font-medium">Analyze Game</span>
                  <p className="text-sm text-gray-500">Deep dive into stats</p>
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
        </div>
      </main>
    </div>
  );
}