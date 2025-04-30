"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AddRound() {
  const [isManualEntry, setIsManualEntry] = useState(false);
  const router = useRouter();

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
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setIsManualEntry(false)}
              className={`flex-1 py-4 text-center font-medium ${
                !isManualEntry
                  ? "text-[#15803D] border-b-2 border-[#15803D]"
                  : "text-gray-500 hover:text-[#15803D]"
              }`}
            >
              Scan Scorecard
            </button>
            <button
              onClick={() => setIsManualEntry(true)}
              className={`flex-1 py-4 text-center font-medium ${
                isManualEntry
                  ? "text-[#15803D] border-b-2 border-[#15803D]"
                  : "text-gray-500 hover:text-[#15803D]"
              }`}
            >
              Manual Entry
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {!isManualEntry ? (
              <div>
                <div className="max-w-lg mx-auto mb-8">
                  <h2 className="text-2xl font-bold text-green-700 mb-2">Upload Scorecard</h2>
                  <p className="text-gray-600 text-md">
                    Upload a photo of your scorecard for automatic processing.
                  </p>
                </div>

                <div className="border-2 border-dashed border-gray-200 rounded-2xl p-12 max-w-lg mx-auto">
                  <div className="flex flex-col items-center">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-400 mb-4">
                      <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="2"/>
                      <path d="M4 16L8 12L12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M14 10L16 8L20 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="9" cy="8" r="2" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    <button className="text-green-500 font-medium mb-2">Upload a file</button>
                    <p className="text-gray-500 mb-1">or drag and drop</p>
                    <p className="text-gray-400 text-sm">PNG, JPG, GIF up to 10MB</p>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <h2 className="text-2xl font-bold text-green-700 mb-2">Enter Round Details</h2>
                <p className="text-gray-600 text-md mb-8">Enter the details of your round to add it to your profile.</p>
                <form className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                      <input
                        type="text"
                        placeholder="Select course"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#15803D] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date Played</label>
                      <input
                        type="date"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#15803D] focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tee Box</label>
                    <select className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#15803D] focus:border-transparent">
                      <option>Select tee box</option>
                      <option>Championship</option>
                      <option>Back</option>
                      <option>Middle</option>
                      <option>Forward</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Hole-by-Hole Scores</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {[...Array(18)].map((_, i) => (
                        <div key={i}>
                          <label className="block text-sm text-gray-600 mb-1">Hole {i + 1}</label>
                          <input
                            type="number"
                            min="1"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#15803D] focus:border-transparent"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#15803D] text-white py-3 rounded-lg hover:bg-[#126c33] transition-colors"
                  >
                    Save Round
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 