"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { supabase } from "@/supabase";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleAuth = async () => {
    try {
      setError(null);
      let userCredential;
      if (isLogin) {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const { user } = userCredential;
        // Sync user to Supabase with error handling
        const { error: supabaseError } = await supabase.from("users").insert([
          { firebase_uid: user.uid, email: user.email },
        ]);
        if (supabaseError) {
          console.error("Failed to insert user into Supabase:", supabaseError);
          throw new Error(`Supabase insertion failed: ${supabaseError.message}`);
        }
        console.log("User successfully inserted into Supabase:", user.uid, user.email);
      }
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Auth error:", err);
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-2 p-4">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="bg-gray-300 rounded-lg" />
        ))}
      </div>
      <div className="relative bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
            <div className="w-6 h-6 bg-white rounded-full" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center mb-2">Golf Performance App</h1>
        <div className="flex justify-center mb-6">
          <button
            className={`px-4 py-2 ${isLogin ? "border-b-2 border-green-500" : ""}`}
            onClick={() => setIsLogin(true)}
          >
            Log In
          </button>
          <button
            className={`px-4 py-2 ${!isLogin ? "border-b-2 border-green-500" : ""}`}
            onClick={() => setIsLogin(false)}
          >
            Sign Up
          </button>
        </div>
        <div className="flex justify-between mb-4">
          <button className="flex items-center px-4 py-2 border rounded">
            <span className="mr-2">📧</span> Email
          </button>
          <button className="flex items-center px-4 py-2 border rounded">
            <span className="mr-2">📞</span> Phone
          </button>
        </div>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 mb-4 border rounded"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 mb-4 border rounded"
        />
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <button
          onClick={handleAuth}
          className="w-full bg-green-500 text-white p-3 rounded"
        >
          {isLogin ? "SIGN IN" : "SIGN UP"}
        </button>
      </div>
    </div>
  );
}