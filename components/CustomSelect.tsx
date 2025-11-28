
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, CheckIcon } from './icons';

export interface Option {
  label: string;
  value: string | number;
}

interface CustomSelectProps {
  options: Option[];
  value: string | number;
  onChange: (value: any) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Selecione...',
  label,
  className = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  const handleSelect = (optionValue: string | number) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          relative w-full bg-white border rounded-xl px-4 py-2.5 text-left text-sm cursor-pointer transition-all duration-200 flex items-center justify-between
          ${isOpen ? 'border-primary ring-2 ring-primary/10 shadow-sm' : 'border-border hover:border-gray-300'}
          ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'text-text-primary'}
        `}
      >
        <span className={`block truncate ${!selectedOption ? 'text-text-muted' : ''}`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="pointer-events-none flex items-center pl-2">
          <ChevronDownIcon
            className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-primary' : ''}`}
          />
        </span>
      </button>

      {isOpen && (
        <div className="absolute z-[60] mt-1 w-full bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden animate-fade-in origin-top">
          <ul className="max-h-60 overflow-auto py-1 custom-scrollbar focus:outline-none">
            {options.map((option) => {
              const isSelected = String(option.value) === String(value);
              return (
                <li
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={`
                    relative cursor-pointer select-none py-2.5 pl-4 pr-9 text-sm transition-colors
                    ${isSelected ? 'bg-orange-50 text-primary font-medium' : 'text-text-primary hover:bg-gray-50'}
                  `}
                >
                  <span className="block truncate">{option.label}</span>
                  {isSelected && (
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-primary">
                      <CheckIcon className="h-4 w-4" />
                    </span>
                  )}
                </li>
              );
            })}
            {options.length === 0 && (
                <li className="relative cursor-default select-none py-2 pl-3 pr-9 text-text-muted text-sm text-center">
                    Sem opções
                </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
