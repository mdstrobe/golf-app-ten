"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/supabase";
import Link from "next/link";
import SearchBar from "@/components/SearchBar"; // Adjust the import path as needed
import SortPill from '../../components/SortPill';

interface Course {
  id: string;
  name: string;
  city: string;
  state: string;
}

// Configure the sort fields
const SORT_FIELDS = [
  { key: 'name', label: 'Course Name' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
];

export default function ExploreCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<'name' | 'city' | 'state'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("golf_courses")
        .select("id, name, city, state");
      if (!error && data) setCourses(data);
      setLoading(false);
    };
    fetchCourses();
  }, []);

  const filteredCourses = courses
    .filter((course) => {
      const q = search.toLowerCase();
      return (
        course.name.toLowerCase().includes(q) ||
        course.city.toLowerCase().includes(q) ||
        course.state.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const aField = a[sortBy].toLowerCase();
      const bField = b[sortBy].toLowerCase();
      if (sortOrder === 'asc') {
        return aField.localeCompare(bField);
      } else {
        return bField.localeCompare(aField);
      }
    });

  return (
    <main className="min-h-screen bg-gray-50 py-4">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        {/* Header */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Link 
                href="/dashboard" 
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
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Total Courses: {courses.length}</span>
            </div>
          </div>
        </div>
        {/* Search and Sort Pills */}
        <div className="w-full flex flex-col items-center gap-2 mb-4">
          <div className="w-full max-w-md">
            <SearchBar search={search} setSearch={setSearch} />
          </div>
          <div className="w-full max-w-md flex gap-2 justify-center">
            {SORT_FIELDS.map(field => (
              <SortPill
                key={field.key}
                label={field.label}
                active={sortBy === field.key}
                direction={sortBy === field.key ? sortOrder : undefined}
                onClick={() => setSortBy(field.key as 'name' | 'city' | 'state')}
                onToggleDirection={dir => setSortOrder(dir)}
              />
            ))}
          </div>
        </div>
        {/* Course List */}
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white rounded-xl shadow-sm p-6 animate-pulse">
              <div className="h-6 bg-gray-100 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-gray-100 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-100 rounded w-1/4"></div>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-6 text-center text-gray-500">No courses found.</div>
          ) : (
            filteredCourses.map(course => (
              <Link
                key={course.id}
                href={`/explore-courses/${course.id}`}
                className="w-full block bg-white rounded-xl shadow-sm p-4 flex items-center justify-between hover:bg-green-50 transition-colors group"
              >
                <div>
                  <div className="font-semibold text-gray-900 text-base group-hover:text-[#15803D]">{course.name}</div>
                  <div className="text-sm text-gray-500 mt-0.5">{course.city}, {course.state}</div>
                </div>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-300 group-hover:text-[#15803D]">
                  <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
            ))
          )}
        </div>
      </div>
    </main>
  );
}