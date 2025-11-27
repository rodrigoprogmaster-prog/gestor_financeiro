
import React, { useState, useEffect, useRef } from 'react';

interface AutocompleteInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  suggestions: string[];
  onValueChange?: (value: string) => void;
}

const AutocompleteInput: React.FC<AutocompleteInputProps> = ({ 
  suggestions, 
  value, 
  onChange, 
  onValueChange,
  className, 
  name,
  ...props 
}) => {
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Filter suggestions based on current value
    if (value && typeof value === 'string' && value.length > 0) {
      const lowerValue = value.toLowerCase();
      const filtered = suggestions.filter(
        item => item.toLowerCase().includes(lowerValue) && item.toLowerCase() !== lowerValue
      ).slice(0, 5); // Limit to 5 suggestions
      setFilteredSuggestions(filtered);
    } else {
      setFilteredSuggestions([]);
    }
  }, [value, suggestions]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) onChange(e);
    if (onValueChange) onValueChange(e.target.value);
    setShowSuggestions(true);
  };

  const handleSelect = (suggestion: string) => {
    // Create a synthetic event to mimic standard input change
    const syntheticEvent = {
      target: {
        name: name,
        value: suggestion,
      },
    } as React.ChangeEvent<HTMLInputElement>;

    if (onChange) onChange(syntheticEvent);
    if (onValueChange) onValueChange(suggestion);
    
    setShowSuggestions(false);
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <input
        {...props}
        name={name}
        value={value}
        onChange={handleChange}
        className={className}
        autoComplete="off"
        onFocus={() => {
            if (value && typeof value === 'string' && value.length > 0) setShowSuggestions(true);
        }}
      />
      {showSuggestions && filteredSuggestions.length > 0 && (
        <ul className="absolute z-50 w-full bg-white border border-border rounded-xl mt-1 shadow-lg max-h-48 overflow-y-auto animate-fade-in text-left">
          {filteredSuggestions.map((suggestion, index) => (
            <li
              key={index}
              onClick={() => handleSelect(suggestion)}
              className="px-4 py-2 hover:bg-secondary cursor-pointer text-sm text-text-primary transition-colors border-b border-border/30 last:border-none"
            >
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AutocompleteInput;
