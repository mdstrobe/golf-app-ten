"use client";

import { use, useEffect, useState } from "react";
import { useRouter} from "next/navigation";
import Link from "next/link";
import { supabase } from "@/supabase";

interface TeeBox {
  id: string;
  tee_name: string;
  rating: number;
  slope: number;
  pars: number[];
  yardages: number[];
}

type SupabaseTeeBox = {
  id: string;
  tee_name: string;
  rating: number;
  slope: number;
  front_nine_par: number[];
  back_nine_par: number[];
  front_nine_distance: number[];
  back_nine_distance: number[];
};

interface Course {
  id: string;
  name: string;
  city: string;
  state: string;
}

export default function CoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [course, setCourse] = useState<Course | null>(null);
  const [teeBoxes, setTeeBoxes] = useState<TeeBox[]>([]);
  const [selectedTee, setSelectedTee] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchCourse = async () => {
      setLoading(true);
      const { data: courseData } = await supabase
        .from("golf_courses")
        .select("id, name, city, state")
        .eq("id", id)
        .single();
      setCourse(courseData);
      const { data: teeData } = await supabase
        .from("tee_boxes")
        .select("id, tee_name, rating, slope, total_distance, front_nine_par, back_nine_par, front_nine_distance, back_nine_distance")
        .eq("course_id", id);
      if (teeData) {
        setTeeBoxes(
          (teeData as SupabaseTeeBox[]).map((tb) => ({
            id: tb.id,
            tee_name: tb.tee_name,
            rating: tb.rating,
            slope: tb.slope,
            pars: [...(tb.front_nine_par || []), ...(tb.back_nine_par || [])],
            yardages: [...(tb.front_nine_distance || []), ...(tb.back_nine_distance || [])],
          }))
        );
        if (teeData.length > 0) setSelectedTee(teeData[0].id);
      }
      setLoading(false);
    };
    fetchCourse();
  }, [id]);

  const selectedTeeBox = teeBoxes.find(tb => tb.id === selectedTee);

  return (
    <main className="min-h-screen bg-gray-50 py-4">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <Link 
              href="/explore-courses" 
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
        </div>
        {/* Course Name and CTAs */}
        {loading ? (
          <div className="bg-white rounded-xl shadow-sm p-8 flex flex-col items-center animate-pulse">
            <div className="h-6 w-1/2 bg-gray-100 rounded mb-4"></div>
            <div className="h-10 w-1/3 bg-gray-100 rounded mb-2"></div>
            <div className="h-4 w-1/4 bg-gray-100 rounded"></div>
          </div>
        ) : !course ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">Course not found.</div>
        ) : (
          <>
            <div className="flex flex-col items-center mb-6">
              {/* Golf Course Icon */}
              <div className="mb-2">
                <svg width="48" height="48" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
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
              <h1 className="text-2xl font-bold text-center mb-2">{course.name}</h1>
              <div className="text-gray-500 text-sm mb-4">{course.city}, {course.state}</div>
              <div className="flex gap-3 mb-4">
                <button 
                  className="bg-[#15803D] text-white px-5 py-2 rounded-lg font-semibold hover:bg-[#126c33] transition"
                  onClick={() => router.push('/add-round')}
                >
                  Add Round
                </button>
                <div className="flex items-center gap-1 bg-gray-100 px-4 py-2 rounded-lg text-gray-700 font-medium">
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 17.75l-6.16 3.24 1.18-6.88-5-4.87 6.91-1L12 2.5l3.09 6.24 6.91 1-5 4.87 1.18 6.88z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span className="text-sm">4.2</span>
                  <span className="text-xs text-gray-400">(rating)</span>
                </div>
              </div>
              {/* Tee Box Pills */}
              <div className="flex flex-wrap gap-2 mb-4">
                {teeBoxes.map(tb => (
                  <button
                    key={tb.id}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${selectedTee === tb.id ? 'bg-green-100 text-green-700' : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'}`}
                    onClick={() => setSelectedTee(tb.id)}
                  >
                    {tb.tee_name}
                  </button>
                ))}
              </div>
            </div>
            {/* Course Details Card */}
            {selectedTeeBox && (
              <>
                <h2 className="text-lg font-bold mb-2">Course Details</h2>
                <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500">Total Yardage</div>
                      <div className="font-semibold text-gray-900">{selectedTeeBox.yardages.reduce((a, b) => a + b, 0) || 'N/A'} yds</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Slope</div>
                      <div className="font-semibold text-gray-900">{selectedTeeBox.slope || 'N/A'}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Rating</div>
                      <div className="font-semibold text-gray-900">{selectedTeeBox.rating || 'N/A'}</div>
                    </div>
                  </div>
                </div>
              </>
            )}
            {/* Hole Details Tables - Front and Back Nine */}
            {selectedTeeBox && (
              <>
                {/* Front Nine */}
                <h2 className="text-lg font-bold mb-2">Front Nine</h2>
                <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="py-2 px-2 text-left font-semibold text-gray-700">Hole</th>
                          {[...Array(9)].map((_, i) => (
                            <th key={i} className="py-2 px-2 text-center font-semibold text-gray-700">{i + 1}</th>
                          ))}
                          <th className="py-2 px-2 text-center font-semibold text-gray-700">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="py-2 px-2 font-medium text-gray-600">Par</td>
                          {selectedTeeBox.pars.slice(0, 9).map((par, i) => (
                            <td key={i} className="py-2 px-2 text-center">{par}</td>
                          ))}
                          <td className="py-2 px-2 text-center font-semibold">{selectedTeeBox.pars.slice(0, 9).reduce((a, b) => a + b, 0)}</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-2 font-medium text-gray-600">Yardage</td>
                          {selectedTeeBox.yardages.slice(0, 9).map((y, i) => (
                            <td key={i} className="py-2 px-2 text-center">{y}</td>
                          ))}
                          <td className="py-2 px-2 text-center font-semibold">{selectedTeeBox.yardages.slice(0, 9).reduce((a, b) => a + b, 0)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                {/* Back Nine */}
                <h2 className="text-lg font-bold mb-2">Back Nine</h2>
                <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="py-2 px-2 text-left font-semibold text-gray-700">Hole</th>
                          {[...Array(9)].map((_, i) => (
                            <th key={i} className="py-2 px-2 text-center font-semibold text-gray-700">{i + 10}</th>
                          ))}
                          <th className="py-2 px-2 text-center font-semibold text-gray-700">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="py-2 px-2 font-medium text-gray-600">Par</td>
                          {selectedTeeBox.pars.slice(9, 18).map((par, i) => (
                            <td key={i} className="py-2 px-2 text-center">{par}</td>
                          ))}
                          <td className="py-2 px-2 text-center font-semibold">{selectedTeeBox.pars.slice(9, 18).reduce((a, b) => a + b, 0)}</td>
                        </tr>
                        <tr>
                          <td className="py-2 px-2 font-medium text-gray-600">Yardage</td>
                          {selectedTeeBox.yardages.slice(9, 18).map((y, i) => (
                            <td key={i} className="py-2 px-2 text-center">{y}</td>
                          ))}
                          <td className="py-2 px-2 text-center font-semibold">{selectedTeeBox.yardages.slice(9, 18).reduce((a, b) => a + b, 0)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
} 