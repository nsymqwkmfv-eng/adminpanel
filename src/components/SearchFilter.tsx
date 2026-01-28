import React from 'react';
import '../styles/SearchFilter.css';

interface SearchFilterProps {
  value: string;
  onChange: (value: string) => void;
}

const SearchFilter: React.FC<SearchFilterProps> = ({ value, onChange }) => {
  return (
    <div className="search-filter">
      <input
        type="text"
        placeholder="🔍 Search in data..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="search-input"
      />
      {value && (
        <button
          className="btn-clear"
          onClick={() => onChange('')}
          title="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  );
};

export default SearchFilter;
