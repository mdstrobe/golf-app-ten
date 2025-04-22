"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { supabase } from "@/supabase";

// Define the shape of the user data from Supabase
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
    <div className="min-h-screen bg-gray-100 p-4">
      <header className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-2">
            <div className="w-4 h-4 bg-white rounded-full" />
          </div>
          <h1 className="text-lg font-bold">Golf Performance App</h1>
        </div>
        <button onClick={handleSignOut} className="text-2xl">
          M
        </button>
      </header>
      <h2 className="text-xl mb-2">
        Welcome back, {userData.email.split("@")[0]}
      </h2>
      <p className="text-gray-600 mb-4">Current Handicap: 0.0</p>
      <div className="flex space-x-4 mb-6">
        <button className="bg-green-500 text-white px-4 py-2 rounded">
          📷 SCAN CARD
        </button>
        <button className="border border-gray-300 px-4 py-2 rounded">
          ≡ RECENT ROUNDS
        </button>
      </div>
      <button className="border border-gray-300 px-4 py-2 rounded mb-6">
        ⛳ PRACTICE SESSION
      </button>
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">PERFORMANCE OVERVIEW</h3>
          <a href="#" className="text-blue-500">VIEW DETAILS</a>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600">ROUNDS PLAYED</p>
            <p className="text-2xl">0</p>
          </div>
          <div>
            <p className="text-gray-600">AVERAGE SCORE</p>
            <p className="text-2xl">0.0</p>
          </div>
        </div>
        <div className="mt-4">
          <p className="text-gray-600">HANDICAP TREND</p>
          <p className="text-lg">↝ STEADY</p>
        </div>
      </div>
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-bold mb-2">TRAINING & ANALYSIS</h3>
        <div className="flex items-center">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-2">
            📊
          </div>
          <div>
            <p className="font-semibold">Game Analysis</p>
            <p className="text-gray-600">Deep dive into your statistics and identify areas for improvement</p>
          </div>
          <span className="ml-auto">→</span>
        </div>
      </div>
    </div>
  );
}