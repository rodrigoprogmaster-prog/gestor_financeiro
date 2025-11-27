
import React, { useState, useEffect, useRef } from 'react';

interface AutocompleteInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  suggestions: string[];
  onSelect?: (value: string) => void;
}

const AutocompleteInput: React.FC<AutocompleteInputProps> = ({ 
  suggestions, 
  onSelect, 
  onChange, 
  value, 
  className, 
  ...props 
}) => {
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on input value
  useEffect(() => {
    if (typeof value === 'string' && value.trim().length > 0) {
      const inputValue = value.toLowerCase();
      // Filter distinct values, excluding the current exact match
      const filtered = Array.from(new Set(suggestions))
        .filter(suggestion => 
          suggestion && 
          suggestion.toLowerCase().includes(inputValue) && 
          suggestion.toLowerCase() !== inputValue
        )
        .slice(0, 5); // Limit to 5 suggestions
      
      setFilteredSuggestions(filtered);
    } else {
      setFilteredSuggestions([]);
    }
  }, [value, suggestions]);

  // Handle outside click to close suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [wrapperRef]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onChange) onChange(e);
    setShowSuggestions(true);
  };

  const handleSuggestionClick = (suggestion: string) => {
    // Create a synthetic event to update the parent state via standard onChange
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
    if (nativeInputValueSetter) {
        // We need to trigger the change on the underlying input for React to pick it up if complex logic relies on e.target
        // However, simpler is just calling onChange with a mock event
        const event = {
            target: { value: suggestion, name: props.name },
            currentTarget: { value: suggestion, name: props.name }
        } as React.ChangeEvent<HTMLInputElement>;
        
        if (onChange) onChange(event);
    }
    
    if (onSelect) onSelect(suggestion);
    
    setShowSuggestions(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
        if (showSuggestions && filteredSuggestions.length > 0) {
            e.preventDefault(); // Prevent form submission if selecting
            handleSuggestionClick(filteredSuggestions[activeSuggestionIndex]);
        }
    } else if (e.key === "ArrowUp") {
        if (filteredSuggestions.length > 0) {
            e.preventDefault();
            setActiveSuggestionIndex(prev => (prev === 0 ? filteredSuggestions.length - 1 : prev - 1));
        }
    } else if (e.key === "ArrowDown") {
        if (filteredSuggestions.length > 0) {
            e.preventDefault();
            setActiveSuggestionIndex(prev => (prev === filteredSuggestions.length - 1 ? 0 : prev + 1));
        }
    } else if (e.key === "Escape") {
        setShowSuggestions(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        {...props}
        value={value}
        onChange={handleChange}
        onFocus={() => {
            if(value && typeof value === 'string' && value.length > 0) setShowSuggestions(true);
        }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        className={className}
      />
      
      {showSuggestions && filteredSuggestions.length > 0 && (
        <ul className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto left-0 top-full">
          {filteredSuggestions.map((suggestion, index) => (
            <li
              key={suggestion}
              onClick={() => handleSuggestionClick(suggestion)}
              className={`px-4 py-2 cursor-pointer text-sm text-gray-700 hover:bg-gray-100 transition-colors ${
                index === activeSuggestionIndex ? "bg-gray-50 font-medium text-blue-600" : ""
              }`}
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
