import React, { useState } from 'react';
import { format } from 'date-fns';
import { Calendar, X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface DateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onStartDateChange: (date: Date | null) => void;
  onEndDateChange: (date: Date | null) => void;
  onClear: () => void;
  className?: string;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onClear,
  className = ''
}) => {
  const { isDarkMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : null;
    onStartDateChange(date);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : null;
    onEndDateChange(date);
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

  return (
    <div className={`relative ${className}`}>
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
          className={`absolute top-full left-0 right-0 mt-1 z-50 p-4 border rounded-md shadow-lg ${
            isDarkMode
              ? 'bg-slate-800 border-slate-600 text-white'
              : 'bg-white border-slate-200 text-slate-800'
          }`}
        >
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-slate-200' : 'text-slate-700'
              }`}>
                Start Date
              </label>
              <input
                type="date"
                value={startDate ? format(startDate, 'yyyy-MM-dd') : ''}
                onChange={handleStartDateChange}
                className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 ${
                  isDarkMode
                    ? 'border-slate-600 text-slate-200 bg-slate-700 focus:ring-slate-400'
                    : 'border-slate-300 text-slate-700 bg-white focus:ring-slate-500'
                }`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-slate-200' : 'text-slate-700'
              }`}>
                End Date
              </label>
              <input
                type="date"
                value={endDate ? format(endDate, 'yyyy-MM-dd') : ''}
                onChange={handleEndDateChange}
                min={startDate ? format(startDate, 'yyyy-MM-dd') : undefined}
                className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 ${
                  isDarkMode
                    ? 'border-slate-600 text-slate-200 bg-slate-700 focus:ring-slate-400'
                    : 'border-slate-300 text-slate-700 bg-white focus:ring-slate-500'
                }`}
              />
            </div>
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

export default DateRangePicker;
