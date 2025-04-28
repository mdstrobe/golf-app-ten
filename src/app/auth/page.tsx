"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { supabase } from "@/supabase";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleAuth = async () => {
    try {
      setError(null);

      if (!isLogin && password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }

      let userCredential;
      if (isLogin) {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const { user } = userCredential;
        
        await updateProfile(user, {
          displayName: fullName
        });

        const { error: supabaseError } = await supabase.from("users").insert([
          { firebase_uid: user.uid, email: user.email, full_name: fullName },
        ]);
        if (supabaseError) {
          console.error("Failed to insert user into Supabase:", supabaseError);
          throw new Error(`Supabase insertion failed: ${supabaseError.message}`);
        }
      }
      router.push("/dashboard");
    } catch (err: unknown) {
      console.error("Auth error:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="mb-8 flex flex-col items-center">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3 relative z-10">
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Golf Performance App</h1>
        <p className="text-gray-600">Master Your Game with Data</p>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex justify-center mb-8">
          <button
            className={`px-6 py-2 text-lg font-medium transition-colors ${
              isLogin 
                ? "text-green-600 border-b-2 border-green-600" 
                : "text-gray-500 hover:text-green-600"
            }`}
            onClick={() => setIsLogin(true)}
          >
            Log In
          </button>
          <button
            className={`px-6 py-2 text-lg font-medium transition-colors ${
              !isLogin 
                ? "text-green-600 border-b-2 border-green-600" 
                : "text-gray-500 hover:text-green-600"
            }`}
            onClick={() => setIsLogin(false)}
          >
            Sign Up
          </button>
        </div>

        <div className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          )}

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <button
            onClick={handleAuth}
            className="w-full bg-green-600 text-white p-4 rounded-xl font-medium hover:bg-green-700 transition-colors"
          >
            {isLogin ? "Sign In" : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}