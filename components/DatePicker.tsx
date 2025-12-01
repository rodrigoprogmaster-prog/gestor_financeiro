
import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeftIcon, ChevronRightIcon, CalendarClockIcon } from './icons';

interface DatePickerProps {
  value: string; // ISO Format YYYY-MM-DD
  onChange: (date: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minDate?: string;
  maxDate?: string;
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const WEEK_DAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const DatePicker: React.FC<DatePickerProps> = ({ 
  value, 
  onChange, 
  label, 
  placeholder = 'Selecione uma data', 
  className = '',
  disabled = false,
  minDate,
  maxDate
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());
  const [portalPosition, setPortalPosition] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  const hasHeightClass = className.includes('h-');
  const defaultHeight = 'h-12';

  // If label is present, container should autosize (h-auto), input takes default height.
  // If no label, container takes default height (if not overridden) and input fills it.
  const containerClass = `${className} ${(!label && !hasHeightClass) ? defaultHeight : 'h-auto'}`;
  const inputHeightClass = (label && !hasHeightClass) ? defaultHeight : 'h-full';

  useEffect(() => {
    if (value) {
      const [year, month, day] = value.split('-').map(Number);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        setViewDate(new Date(year, month - 1, day));
      }
    }
  }, [isOpen, value]);

  useEffect(() => {
    const handleClose = () => {
      if (isOpen) setIsOpen(false);
    };
    // Capture scroll events to close picker if user scrolls parent containers
    window.addEventListener('scroll', handleClose, true);
    window.addEventListener('resize', handleClose);
    return () => {
      window.removeEventListener('scroll', handleClose, true);
      window.removeEventListener('resize', handleClose);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current && 
        !containerRef.current.contains(event.target as Node) &&
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useLayoutEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      
      const calendarWidth = 320; 
      const calendarHeight = 460; 
      const gap = 4;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let top = rect.bottom + gap;
      let left = rect.left;

      if (top + calendarHeight > viewportHeight) {
        if (rect.top > calendarHeight + gap) {
            top = rect.top - calendarHeight - gap;
        } else {
            const spaceBelow = viewportHeight - rect.bottom;
            const spaceAbove = rect.top;
            
            if (spaceAbove > spaceBelow) {
                 top = rect.top - calendarHeight - gap;
                 if (top < 0) top = gap; 
            } else {
                 top = rect.bottom + gap;
                 if (top + calendarHeight > viewportHeight) {
                     top = viewportHeight - calendarHeight - gap;
                 }
            }
        }
      }

      if (left + calendarWidth > viewportWidth) {
        left = viewportWidth - calendarWidth - gap;
      }
      if (left < 0) {
        left = gap;
      }

      setPortalPosition({ top, left });
    }
  }, [isOpen]);

  const formatDateDisplay = (isoDate: string) => {
    if (!isoDate) return '';
    const [year, month, day] = isoDate.split('-');
    return `${day}/${month}/${year}`;
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleDayClick = (day: number) => {
    const month = (viewDate.getMonth() + 1).toString().padStart(2, '0');
    const dayStr = day.toString().padStart(2, '0');
    const isoDate = `${viewDate.getFullYear()}-${month}-${dayStr}`;
    
    onChange(isoDate);
    setIsOpen(false);
  };

  const handleToday = () => {
    const today = new Date();
    const isoDate = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
    onChange(isoDate);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
  };

  const renderCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days = [];
    
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-9 w-9" />);
    }

    const today = new Date();
    const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
      const isSelected = value === dateStr;
      const isToday = isCurrentMonth && today.getDate() === day;
      
      let isDisabled = false;
      if (minDate && dateStr < minDate) isDisabled = true;
      if (maxDate && dateStr > maxDate) isDisabled = true;

      days.push(
        <button
          key={day}
          onClick={(e) => { e.stopPropagation(); handleDayClick(day); }}
          disabled={isDisabled}
          className={`
            h-9 w-9 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-200 relative
            ${isDisabled 
                ? 'text-gray-300 cursor-not-allowed' 
                : 'hover:bg-gray-100 text-text-primary'
            }
            ${isSelected 
              ? 'bg-primary/5 text-primary ring-1 ring-primary font-bold hover:bg-primary/10' 
              : ''
            }
            ${!isSelected && isToday ? 'font-bold text-primary ring-1 ring-primary/30' : ''}
            ${!isSelected && !isToday && !isDisabled ? 'text-text-primary' : ''}
          `}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  const calendarPopup = (
    <div 
      ref={calendarRef}
      style={{ 
        position: 'fixed', 
        top: portalPosition.top, 
        left: portalPosition.left, 
        zIndex: 99999 
      }}
      className="w-[320px] bg-white rounded-3xl shadow-2xl border border-gray-100 animate-fade-in p-6 select-none flex flex-col"
    >
      <div className="flex items-center justify-between mb-6 px-1">
        <button 
          onClick={(e) => { e.stopPropagation(); handlePrevMonth(); }}
          className="p-2 rounded-full hover:bg-gray-50 text-gray-400 hover:text-gray-900 transition-colors"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <span className="text-base font-bold text-gray-900 capitalize tracking-tight">
          {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
        </span>
        <button 
          onClick={(e) => { e.stopPropagation(); handleNextMonth(); }}
          className="p-2 rounded-full hover:bg-gray-50 text-gray-400 hover:text-gray-900 transition-colors"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-3 text-center">
        {WEEK_DAYS.map((d, i) => (
          <span key={i} className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            {d}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-2 justify-items-center mb-4">
        {renderCalendar()}
      </div>

      <div className="border-t border-gray-100 pt-4 flex justify-between items-center mt-auto">
          <button 
            onClick={handleClear}
            className="text-xs font-semibold text-gray-500 hover:text-red-500 transition-colors px-2 py-1 rounded-md hover:bg-red-50"
          >
            Limpar
          </button>
          <button 
            onClick={handleToday}
            className="text-xs font-bold text-primary hover:text-primary-hover transition-colors px-3 py-1.5 rounded-md bg-primary/5 hover:bg-primary/10"
          >
            Hoje
          </button>
      </div>
    </div>
  );

  return (
    <div className={`relative w-full flex flex-col ${containerClass}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">
          {label}
        </label>
      )}
      
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          w-full ${inputHeightClass} bg-white border rounded-xl px-4 text-text-primary flex items-center justify-between cursor-pointer transition-all min-h-[2.5rem]
          ${isOpen ? 'border-primary ring-2 ring-primary/10 bg-white' : 'border-transparent bg-secondary hover:bg-white hover:border-gray-200'}
          ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''}
        `}
      >
        <span className={`text-sm truncate ${!value ? 'text-gray-400' : ''}`}>
          {value ? formatDateDisplay(value) : placeholder}
        </span>
        <CalendarClockIcon className={`h-4 w-4 flex-shrink-0 ml-2 ${isOpen ? 'text-primary' : 'text-gray-400'}`} />
      </div>

      {isOpen && createPortal(calendarPopup, document.body)}
    </div>
  );
};

export default DatePicker;
