import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isWithinInterval, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface CalendarDateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onStartDateChange: (date: Date | null) => void;
  onEndDateChange: (date: Date | null) => void;
  onClear: () => void;
  className?: string;
}

const CalendarDateRangePicker: React.FC<CalendarDateRangePickerProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onClear,
  className = ''
}) => {
  const { isDarkMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.calendar-date-range-picker')) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleDateClick = (date: Date) => {
    if (!startDate || (startDate && endDate)) {
      // Start new selection
      onStartDateChange(date);
      onEndDateChange(null);
    } else if (startDate && !endDate) {
      // Complete the selection
      if (date < startDate) {
        // If clicked date is before start date, swap them
        onEndDateChange(startDate);
        onStartDateChange(date);
      } else {
        onEndDateChange(date);
      }
    }
  };

  const handleClear = () => {
    onClear();
    setIsOpen(false);
  };

  const getDisplayText = () => {
    if (!startDate && !endDate) {
      return 'Select date range';
    }
    if (startDate && endDate) {
      return `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`;
    }
    if (startDate) {
      return `From ${format(startDate, 'MMM d, yyyy')}`;
    }
    if (endDate) {
      return `To ${format(endDate, 'MMM d, yyyy')}`;
    }
    return 'Select date range';
  };

  const isDateInRange = (date: Date) => {
    if (!startDate || !endDate) return false;
    return isWithinInterval(date, { start: startDate, end: endDate });
  };

  const isDateSelected = (date: Date) => {
    return (startDate && isSameDay(date, startDate)) || (endDate && isSameDay(date, endDate));
  };

  const isDateHovered = (date: Date) => {
    if (!hoveredDate || !startDate || endDate) return false;
    return isWithinInterval(date, { 
      start: startDate < hoveredDate ? startDate : hoveredDate, 
      end: startDate < hoveredDate ? hoveredDate : startDate 
    });
  };

  const getDateClassName = (date: Date) => {
    const baseClasses = "w-8 h-8 flex items-center justify-center text-sm rounded-full cursor-pointer transition-colors";
    const isCurrentMonth = isSameMonth(date, currentMonth);
    const isSelected = isDateSelected(date);
    const isInRange = isDateInRange(date);
    const isHovered = isDateHovered(date);

    if (!isCurrentMonth) {
      return `${baseClasses} ${isDarkMode ? 'text-slate-500' : 'text-slate-300'}`;
    }

    if (isSelected) {
      return `${baseClasses} ${isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'} font-semibold`;
    }

    if (isInRange) {
      return `${baseClasses} ${isDarkMode ? 'bg-blue-100 text-blue-900' : 'bg-blue-100 text-blue-900'}`;
    }

    if (isHovered) {
      return `${baseClasses} ${isDarkMode ? 'bg-slate-600 text-white' : 'bg-slate-200 text-slate-800'}`;
    }

    return `${baseClasses} ${isDarkMode ? 'text-slate-200 hover:bg-slate-600' : 'text-slate-700 hover:bg-slate-100'}`;
  };

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const startDate_cal = startOfWeek(monthStart);
  const endDate_cal = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: startDate_cal, end: endDate_cal });

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className={`relative calendar-date-range-picker ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 ${
          isDarkMode
            ? 'border-slate-600 text-slate-200 bg-slate-700 hover:bg-slate-600 focus:ring-slate-400'
            : 'border-slate-300 text-slate-700 bg-white hover:bg-slate-50 focus:ring-slate-500'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Calendar className="h-4 w-4 flex-shrink-0" />
          <span className="whitespace-nowrap overflow-hidden text-ellipsis">{getDisplayText()}</span>
        </div>
        {(startDate || endDate) && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className={`ml-3 p-1 rounded-full hover:bg-opacity-80 flex-shrink-0 cursor-pointer ${
              isDarkMode ? 'hover:bg-slate-600' : 'hover:bg-slate-200'
            }`}
            title="Clear date range"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClear();
              }
            }}
          >
            <X className="h-3 w-3" />
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className={`absolute top-full left-0 mt-1 z-50 p-4 border rounded-lg shadow-lg w-80 ${
            isDarkMode
              ? 'bg-slate-800 border-slate-600 text-white'
              : 'bg-white border-slate-200 text-slate-800'
          }`}
        >
          <div className="space-y-4">
            {/* Calendar Header */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className={`p-1 rounded-md hover:bg-opacity-80 ${
                  isDarkMode ? 'hover:bg-slate-600' : 'hover:bg-slate-100'
                }`}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                {format(currentMonth, 'MMMM yyyy')}
              </h3>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className={`p-1 rounded-md hover:bg-opacity-80 ${
                  isDarkMode ? 'hover:bg-slate-600' : 'hover:bg-slate-100'
                }`}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Week Days Header */}
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((day) => (
                <div
                  key={day}
                  className={`text-center text-xs font-medium py-2 ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {days.map((day) => (
                <button
                  key={day.toISOString()}
                  onClick={() => handleDateClick(day)}
                  onMouseEnter={() => setHoveredDate(day)}
                  onMouseLeave={() => setHoveredDate(null)}
                  className={getDateClassName(day)}
                  disabled={!isSameMonth(day, currentMonth)}
                >
                  {format(day, 'd')}
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-600">
              <button
                onClick={() => setIsOpen(false)}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 ${
                  isDarkMode
                    ? 'border border-slate-600 text-slate-200 bg-slate-700 hover:bg-slate-600 focus:ring-slate-400'
                    : 'border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 focus:ring-slate-500'
                }`}
              >
                Apply
              </button>
              <button
                onClick={handleClear}
                className={`px-3 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 ${
                  isDarkMode
                    ? 'border border-red-600 text-red-200 bg-red-700 hover:bg-red-600 focus:ring-red-400'
                    : 'border border-red-300 text-red-700 bg-white hover:bg-red-50 focus:ring-red-500'
                }`}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarDateRangePicker;
