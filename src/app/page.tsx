"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/firebase";
import { onAuthStateChanged } from "firebase/auth";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push("/dashboard");
      }
    });
    return () => unsubscribe();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 gap-2 p-4">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="bg-gray-300 rounded-lg" />
        ))}
      </div>
      <div className="relative text-center">
        <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <div className="w-6 h-6 bg-white rounded-full" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Golf Performance App</h1>
        <p className="text-gray-600 mb-6">Master Your Game with Data</p>
        <button
          onClick={() => router.push("/auth")}
          className="bg-green-500 text-white px-6 py-3 rounded-full"
        >
          JOIN the Beta Experience
        </button>
      </div>
    </div>
  );
}