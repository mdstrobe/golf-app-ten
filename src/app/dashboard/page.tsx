"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { supabase } from "@/supabase";
import Link from "next/link";

interface UserData {
  id: number;
  firebase_uid: string;
  email: string;
  created_at: string;
}

export default function Dashboard() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
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
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                <div className="w-4 h-4 bg-white rounded-full" />
              </div>
              <span className="ml-2 text-xl font-semibold">Golf Performance App</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/add-round')}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Add Round
              </button>
              <button
                onClick={handleSignOut}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200"
              >
                {userData.email.charAt(0).toUpperCase()}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold mb-8">Welcome back, {userData.email.split("@")[0]}!</h1>

        {/* Performance Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-gray-600">Current HCP</h3>
              <div className="flex items-center gap-2">
                <span className="text-green-600 text-sm">↓ Trending Down</span>
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
              </div>
            </div>
            <p className="text-3xl font-bold">12.4</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-gray-600">Avg. Score</h3>
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
            </div>
            <p className="text-3xl font-bold">87</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-gray-600">GIR %</h3>
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            </div>
            <p className="text-3xl font-bold">42%</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-gray-600">Putts Per Round</h3>
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            </div>
            <p className="text-3xl font-bold">31.5</p>
          </div>
        </div>

        {/* AI Insights */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">AI-Powered Insights</h2>
            <button className="text-green-600 hover:text-green-700">Configure</button>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xl">📊</span>
            </div>
            <div>
              <h3 className="font-bold mb-2">Game Analysis</h3>
              <p className="text-gray-600">
                Based on your last 5 rounds, your approach shots from 125-150 yards are significantly impacting your score. 
                Your GIR percentage from this distance is only 28%, well below your overall average. 
                Focusing practice on consistent distance control with your 9-iron and wedges could lead to 3-4 fewer strokes per round.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}