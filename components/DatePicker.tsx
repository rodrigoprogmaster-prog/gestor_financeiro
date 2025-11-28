
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

  // Initialize viewDate based on value or current date
  useEffect(() => {
    if (value) {
      const [year, month, day] = value.split('-').map(Number);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        // Create date using UTC to avoid timezone shifts
        setViewDate(new Date(year, month - 1, day));
      }
    }
  }, [isOpen, value]); // Reset view when opening

  // Close on scroll or resize to prevent floating issues
  useEffect(() => {
    const handleClose = () => {
      if (isOpen) setIsOpen(false);
    };
    
    // Capture scroll events on window to handle scrolling of any parent container
    window.addEventListener('scroll', handleClose, true);
    window.addEventListener('resize', handleClose);
    
    return () => {
      window.removeEventListener('scroll', handleClose, true);
      window.removeEventListener('resize', handleClose);
    };
  }, [isOpen]);

  // Click outside handler
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

  // Calculate position for the portal
  useLayoutEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const scrollX = window.scrollX || window.pageXOffset;
      const scrollY = window.scrollY || window.pageYOffset;
      
      const calendarWidth = 280;
      const calendarHeight = 320; // approximate height
      const gap = 8;

      let top = rect.bottom + scrollY + gap;
      let left = rect.left + scrollX;

      // Smart positioning: Flip up if not enough space below
      if (rect.bottom + calendarHeight > window.innerHeight + scrollY && rect.top > calendarHeight) {
        top = rect.top + scrollY - calendarHeight - gap;
      }

      // Smart positioning: Shift left if off-screen to the right
      if (rect.left + calendarWidth > window.innerWidth + scrollX) {
        left = (rect.right + scrollX) - calendarWidth;
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

  const renderCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const days = [];
    
    // Empty slots for days before the 1st
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8 w-8" />);
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
            h-8 w-8 rounded-full flex items-center justify-center text-sm transition-all duration-200
            ${isSelected 
              ? 'bg-primary text-white font-bold shadow-md shadow-orange-200' 
              : isDisabled 
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-text-primary hover:bg-orange-50 hover:text-primary'
            }
            ${isToday && !isSelected ? 'text-primary font-bold border border-orange-100' : ''}
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
        position: 'absolute', 
        top: portalPosition.top, 
        left: portalPosition.left, 
        zIndex: 9999 
      }}
      className="w-[280px] bg-white rounded-2xl shadow-2xl border border-border animate-fade-in p-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button 
          onClick={(e) => { e.stopPropagation(); handlePrevMonth(); }}
          className="p-1 rounded-full hover:bg-secondary text-text-secondary hover:text-primary transition-colors"
        >
          <ChevronLeftIcon className="h-5 w-5" />
        </button>
        <span className="text-sm font-bold text-text-primary capitalize">
          {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
        </span>
        <button 
          onClick={(e) => { e.stopPropagation(); handleNextMonth(); }}
          className="p-1 rounded-full hover:bg-secondary text-text-secondary hover:text-primary transition-colors"
        >
          <ChevronRightIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Week Days Header */}
      <div className="grid grid-cols-7 mb-2 text-center">
        {WEEK_DAYS.map((d, i) => (
          <span key={i} className="text-xs font-medium text-text-muted">
            {d}
          </span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-y-1 justify-items-center">
        {renderCalendar()}
      </div>
    </div>
  );

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 ml-1">
          {label}
        </label>
      )}
      
      {/* Input Trigger */}
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          w-full bg-white border rounded-xl px-3 py-2 text-text-primary flex items-center justify-between cursor-pointer transition-all h-full min-h-[48px]
          ${isOpen ? 'border-primary ring-2 ring-primary/10' : 'border-border hover:border-gray-300'}
          ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''}
        `}
      >
        <span className={`text-sm ${!value ? 'text-text-muted' : ''}`}>
          {value ? formatDateDisplay(value) : placeholder}
        </span>
        <CalendarClockIcon className={`h-4 w-4 ${isOpen ? 'text-primary' : 'text-text-secondary'}`} />
      </div>

      {/* Render Portal if Open */}
      {isOpen && createPortal(calendarPopup, document.body)}
    </div>
  );
};

export default DatePicker;
