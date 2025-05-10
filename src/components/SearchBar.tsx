import React from 'react';

interface SearchBarProps {
  search: string;
  setSearch: (value: string) => void;
  className?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ search, setSearch, className = '' }) => {
  return (
    <div className={`flex items-center bg-gray-100 rounded-full p-2 w-full ${className}`}>
      <svg
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
        className="text-gray-500 mr-2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
        />
      </svg>
      <input
        type="text"
        className="flex-1 border-none bg-transparent outline-none text-sm text-gray-600 placeholder-gray-500"
        placeholder="Course name"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>
  );
};

export default SearchBar;