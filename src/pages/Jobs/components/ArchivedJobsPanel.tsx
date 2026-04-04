import React from 'react';
import { Search } from 'lucide-react';
import Button from '../../../components/ui/Button';
import DateRangePicker from '../../../components/ui/DateRangePicker';

export type ArchivedJobsPanelProps = {
  isDarkMode: boolean;
  showArchived: boolean;
  archivedJobsSearchQuery: string;
  onArchivedSearchChange: (value: string) => void;
  selectedUser: string;
  onSelectedUserChange: (value: string) => void;
  uniqueUsers: string[];
  startDate: Date | null;
  endDate: Date | null;
  onStartDateChange: (d: Date | null) => void;
  onEndDateChange: (d: Date | null) => void;
  onClearDateRange: () => void;
  onClearAllFilters: () => void;
  filteredJobCount: number;
};

const ArchivedJobsPanel: React.FC<ArchivedJobsPanelProps> = ({
  isDarkMode,
  showArchived,
  archivedJobsSearchQuery,
  onArchivedSearchChange,
  selectedUser,
  onSelectedUserChange,
  uniqueUsers,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onClearDateRange,
  onClearAllFilters,
  filteredJobCount,
}) => {
  if (!showArchived) return null;

  const hasSummary =
    startDate ||
    endDate ||
    selectedUser !== 'all' ||
    archivedJobsSearchQuery.trim().length > 0;

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="w-full">
          <div className="flex flex-col gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1">
                <label className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Search Jobs:
                </label>
                <div className="relative">
                  <Search
                    className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  />
                  <input
                    type="text"
                    placeholder="Search by job ID or item name..."
                    value={archivedJobsSearchQuery}
                    onChange={(e) => onArchivedSearchChange(e.target.value)}
                    className={`pl-10 pr-3 py-2 border rounded-md text-sm w-full ${
                      isDarkMode
                        ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400'
                        : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'
                    }`}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Filter by User:
                </label>
                <select
                  value={selectedUser}
                  onChange={(e) => onSelectedUserChange(e.target.value)}
                  className={`px-3 py-2 border rounded-md text-sm w-full ${
                    isDarkMode
                      ? 'bg-slate-700 border-slate-600 text-white'
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="all">All Users</option>
                  {uniqueUsers.map((userName) => (
                    <option key={userName} value={userName}>
                      {userName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Filter by Date Range:
                </label>
                <DateRangePicker
                  startDate={startDate}
                  endDate={endDate}
                  onStartDateChange={onStartDateChange}
                  onEndDateChange={onEndDateChange}
                  onClear={onClearDateRange}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="secondary" onClick={onClearAllFilters} size="sm" className="w-full sm:w-auto">
                Clear All Filters
              </Button>
            </div>
          </div>
        </div>
      </div>

      {hasSummary && (
        <div
          className={`p-3 rounded-lg border ${
            isDarkMode
              ? 'bg-slate-800 border-slate-700 text-slate-300'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-sm">
            <span className="font-medium">Active Filters:</span>
            <div className="flex flex-wrap gap-2">
              {archivedJobsSearchQuery.trim() && (
                <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-xs">
                  Search: &quot;{archivedJobsSearchQuery}&quot;
                </span>
              )}
              {selectedUser !== 'all' && (
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">
                  User: {selectedUser}
                </span>
              )}
              {startDate && (
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs">
                  From: {startDate.toLocaleDateString()}
                </span>
              )}
              {endDate && (
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs">
                  To: {endDate.toLocaleDateString()}
                </span>
              )}
              <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-xs">
                {filteredJobCount} jobs found
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ArchivedJobsPanel;
