"use client";

import Link from "next/link";
import Image from "next/image";

const courseImages = [
  "/images/course1.jpg",
  "/images/course2.jpg",
  "/images/course3.jpg",
  "/images/course4.jpg",
  "/images/course5.jpg",
  "/images/course6.jpg",
  "/images/course1.jpg",
  "/images/course2.jpg",
  "/images/course3.jpg",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 flex flex-col items-center px-4">
      {/* Image Grid with Fade */}
      <div className="relative w-full max-w-md mx-auto mt-6">
        <div className="grid grid-cols-3 grid-rows-3 gap-2 rounded-xl overflow-hidden">
          {courseImages.map((src, i) => (
            <div key={i} className="relative aspect-square">
              <Image
                src={src}
                alt={`Golf course ${i + 1}`}
                fill
                className="object-cover"
                priority={i === 0}
              />
            </div>
          ))}
        </div>
        {/* Fade overlay at bottom */}
        <div className="pointer-events-none absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-gray-100 to-transparent z-10" />
      </div>

      {/* Logo and Content */}
      <div className="flex flex-col items-center w-full max-w-md mx-auto mt-0 z-20 relative px-4">
        {/* Logo (from signup page, no white background) */}
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
        {/* App Title */}
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-2">
          Golf Performance App
        </h1>
        {/* Tagline */}
        <p className="text-base text-gray-600 text-center mb-8">
          Master Your Game with Data
        </p>
        {/* Buttons */}
        <Link
          href="/auth"
          className="w-full mb-3 bg-[#15803D] text-white py-3 rounded-full text-lg font-medium hover:bg-[#126c33] transition-colors duration-200 shadow-md text-center"
        >
          Join the Experience
        </Link>
      </div>
    </main>
  );
}