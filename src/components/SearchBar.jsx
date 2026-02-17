import { useState, useRef, useEffect, useCallback } from 'react';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

export default function SearchBar({ onFlyTo, onLocate, onAddressSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, []);

  const search = useCallback(async (text) => {
    if (!text || text.length < 3) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(text)}.json?access_token=${MAPBOX_TOKEN}&limit=5&types=address,poi,place,neighborhood,locality`
      );
      const data = await res.json();
      setResults(data.features || []);
      setShowResults(true);
    } catch (err) {
      console.error('Geocoding error:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 300);
  };

  const handleSelect = (feature) => {
    setQuery(feature.place_name);
    setShowResults(false);
    setResults([]);
    onFlyTo(feature.center);
    onAddressSelect?.(feature.place_name);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && results.length > 0) {
      handleSelect(results[0]);
    } else if (e.key === 'Escape') {
      setShowResults(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  return (
    <div ref={containerRef} className="w-full relative flex gap-2">
      <div className="relative flex-1">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => results.length > 0 && setShowResults(true)}
          placeholder="Search for an address..."
          className="w-full glass-panel rounded-xl pl-9 pr-8 py-2.5 text-[13px] text-slate-200 placeholder-slate-600 outline-none focus:border-emerald-500/30 transition-colors"
        />
        {query && !loading && (
          <button
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        {loading && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
            <div className="w-3.5 h-3.5 border-2 border-slate-700 border-t-emerald-400 rounded-full animate-spin" />
          </div>
        )}

        {showResults && results.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 glass-panel rounded-xl overflow-hidden z-50 animate-slide-up">
            {results.map((feature) => (
              <button
                key={feature.id}
                onClick={() => handleSelect(feature)}
                className="w-full text-left px-3.5 py-2.5 hover:bg-white/[0.04] transition-colors border-b border-white/[0.04] last:border-b-0 group"
              >
                <div className="text-[12px] font-medium text-slate-300 group-hover:text-slate-100 truncate transition-colors">{feature.text}</div>
                <div className="text-[10px] text-slate-600 truncate">{feature.place_name}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={onLocate}
        className="glass-panel rounded-xl w-11 sm:w-10 flex items-center justify-center hover:bg-white/[0.06] transition-colors shrink-0 active:scale-95"
        title="Go to my location"
      >
        <svg className="w-4.5 h-4.5 sm:w-4 sm:h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v2m0 16v2M2 12h2m16 0h2" />
        </svg>
      </button>
    </div>
  );
}
