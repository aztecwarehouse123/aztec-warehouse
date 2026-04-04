import React from 'react';
import { RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import Button from '../../../components/ui/Button';
import type { Job, ReportDataState } from '../types';
import { formatElapsedTime } from '../utils/formatters';

export type JobsReportsSectionProps = {
  isDarkMode: boolean;
  reportDate: Date;
  setReportDate: React.Dispatch<React.SetStateAction<Date>>;
  generateReports: (date: Date) => void;
  isLoadingReports: boolean;
  reportData: ReportDataState;
  jobs: Job[];
  dateRange: { start: Date; end: Date };
  setDateRange: React.Dispatch<React.SetStateAction<{ start: Date; end: Date }>>;
  selectedUserForChart: string;
  setSelectedUserForChart: React.Dispatch<React.SetStateAction<string>>;
};

const JobsReportsSection: React.FC<JobsReportsSectionProps> = ({
  isDarkMode,
  reportDate,
  setReportDate,
  generateReports,
  isLoadingReports,
  reportData,
  jobs,
  dateRange,
  setDateRange,
  selectedUserForChart,
  setSelectedUserForChart,
}) => {
  return (
    <>
{/* Reports Header with Date Picker */}
<div className="flex items-center justify-between mb-6">
  <div className="flex items-center gap-3">
    <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
      Warehouse Performance Reports
    </h2>
    <span className={`px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300`}>
      {(() => {
        const day = String(reportDate.getDate()).padStart(2, '0');
        const month = String(reportDate.getMonth() + 1).padStart(2, '0');
        const year = reportDate.getFullYear();
        return `${day}/${month}/${year}`;
      })()}
    </span>
  </div>
  <div className="flex items-center gap-3">
    <input
      type="date"
      value={(() => {
        const year = reportDate.getFullYear();
        const month = String(reportDate.getMonth() + 1).padStart(2, '0');
        const day = String(reportDate.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      })()}
      onChange={(e) => {
        const newDate = new Date(e.target.value);
        setReportDate(newDate);
        // Regenerate reports for the new date
        generateReports(newDate);
      }}
      className={`px-3 py-2 border rounded-md text-sm ${
        isDarkMode 
          ? 'bg-slate-700 border-slate-600 text-white' 
          : 'bg-white border-slate-300 text-slate-900'
      }`}
    />
    <Button 
      variant="secondary" 
      onClick={() => generateReports(reportDate)} 
      className="flex items-center gap-2"
      size='sm'
      disabled={isLoadingReports}
    >
      <RefreshCw size={16} className={isLoadingReports ? 'animate-spin' : ''} />
    </Button>
  </div>
</div>

{isLoadingReports ? (
  <div className={`text-center py-12 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
    <div className="flex flex-col items-center space-y-4">
      <RefreshCw size={32} className="animate-spin text-blue-500" />
      <div className="space-y-2">
        <p className="text-lg font-medium">Generating Reports...</p>
        <p className="text-sm opacity-75">Please wait while we analyze the data</p>
      </div>
    </div>
  </div>
) : (
  <div className="space-y-6">

                        {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <div className={`p-3 sm:p-4 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <div className={`text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mb-1`}>Total Items Picked Today</div>
          <div className={`text-xl sm:text-2xl font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
            {reportData.userStats.reduce((sum, user) => sum + user.itemsPicked, 0)}
          </div>
        </div>
        <div className={`p-3 sm:p-4 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <div className={`text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mb-1`}>Total Jobs Completed</div>
          <div className={`text-xl sm:text-2xl font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
            {reportData.userStats.reduce((sum, user) => sum + user.jobsCompleted, 0)}
          </div>
        </div>
        <div className={`p-3 sm:p-4 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} sm:col-span-2 lg:col-span-1`}>
          <div className={`text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mb-1`}>Active Users Today</div>
          <div className={`text-xl sm:text-2xl font-bold ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
            {reportData.userStats.length}
          </div>
        </div>
      </div>

                     {/* User Performance Table */}
      <div className={`p-4 sm:p-6 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
        <h3 className={`text-base sm:text-lg font-semibold mb-3 sm:mb-4 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
          User Performance - {reportDate.toLocaleDateString()}
        </h3>
        {reportData.userStats.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className={`border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                  <th className={`text-left py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>User</th>
                  <th className={`text-center py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Jobs Created</th>
                  <th className={`text-center py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Jobs Completed</th>
                  <th className={`text-center py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Items Picked</th>
                  <th className={`text-center py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Avg Time/Job</th>
                  <th className={`text-center py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>Total Time</th>
                </tr>
              </thead>
              <tbody>
                {reportData.userStats.map((user, index) => (
                  <tr key={index} className={`border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                    <td className={`py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                      {user.name}
                    </td>
                    <td className={`text-center py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      {user.jobsCreated}
                    </td>
                    <td className={`text-center py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      {user.jobsCompleted}
                    </td>
                    <td className={`text-center py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} font-semibold`}>
                      {user.itemsPicked}
                    </td>
                    <td className={`text-center py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      {formatElapsedTime(user.avgTimePerJob)}
                    </td>
                    <td className={`text-center py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      {formatElapsedTime(user.totalTime)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={`text-center py-6 sm:py-8 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            No data available for selected date
          </div>
        )}
      </div>

      {/* Verifier Productivity Table */}
      <div className={`p-4 sm:p-6 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
        <h3 className={`text-base sm:text-lg font-semibold mb-3 sm:mb-4 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
          Verifier Productivity - {reportDate.toLocaleDateString()}
        </h3>
        {reportData.verifierStats.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className={`border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                  <th className={`text-left py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Verifier</th>
                  <th className={`text-center py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Jobs Verified</th>
                  <th className={`text-center py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Items Verified</th>
                  <th className={`text-center py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Avg Verifying Time</th>
                  <th className={`text-center py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Total Verifying Time</th>
                </tr>
              </thead>
              <tbody>
                {reportData.verifierStats.map((verifier, index) => (
                  <tr key={index} className={`border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                    <td className={`py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                      {verifier.name}
                    </td>
                    <td className={`text-center py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      {verifier.jobsVerified}
                    </td>
                    <td className={`text-center py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'} font-semibold`}>
                      {verifier.itemsVerified}
                    </td>
                    <td className={`text-center py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      {formatElapsedTime(verifier.avgVerifyingTime)}
                    </td>
                    <td className={`text-center py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      {formatElapsedTime(verifier.totalVerifyingTime)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className={`text-center py-6 sm:py-8 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            No verifier productivity data for selected date
          </div>
        )}
      </div>

                    {/* Performance Overview - Last 7 Days */}
      <div className={`p-4 sm:p-6 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
        <h3 className={`text-base sm:text-lg font-semibold mb-3 sm:mb-4 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
          Last 7 Days Performance Overview
        </h3>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1 sm:gap-2">
        {(() => {
          const data: { date: string; itemsPicked: number; jobsCompleted: number }[] = [];

          // Generate data for the last 7 days
          for (let i = 6; i >= 0; i--) {
            const checkDate = new Date();
            checkDate.setDate(checkDate.getDate() - i);
            const checkStart = new Date(checkDate);
            checkStart.setHours(0, 0, 0, 0);
            const checkEnd = new Date(checkDate);
            checkEnd.setHours(23, 59, 59, 999);

            const dayJobs = jobs.filter(job => {
              const jobDate = job.createdAt;
              return jobDate >= checkStart && jobDate <= checkEnd;
            });

            const itemsPicked = dayJobs.reduce((sum, job) => 
              sum + job.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
            );
            const jobsCompleted = dayJobs.filter(job => job.status === 'completed').length;

            const dateKey = format(checkDate, 'MMM dd');
            data.push({ date: dateKey, itemsPicked, jobsCompleted });
          }

          return data;
        })().map((stat, index) => (
          <div key={index} className="text-center">
            <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mb-1`}>
                 {stat.date}
               </div>
            <div className={`text-lg font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
              {stat.itemsPicked}
             </div>
            <div className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-600'}`}>
              {stat.jobsCompleted} jobs
             </div>
           </div>
         ))}
       </div>
     </div>

                                              {/* Date Range Selector for Charts */}
        <div className={`p-3 sm:p-4 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <h3 className={`text-base sm:text-lg font-semibold mb-3 sm:mb-4 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
            Chart Date Range
          </h3>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1">
                <label className={`block text-xs sm:text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Start Date
                </label>
                <input
                  type="date"
                  value={(() => {
                    const year = dateRange.start.getFullYear();
                    const month = String(dateRange.start.getMonth() + 1).padStart(2, '0');
                    const day = String(dateRange.start.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                  })()}
                  onChange={(e) => {
                    const newStart = new Date(e.target.value);
                    newStart.setHours(0, 0, 0, 0);
                    // Ensure start date is not after end date
                    if (newStart <= dateRange.end) {
                      setDateRange(prev => ({ ...prev, start: newStart }));
                    }
                  }}
                  className={`w-full px-2 sm:px-3 py-2 border rounded-md text-xs sm:text-sm ${
                    isDarkMode 
                      ? 'bg-slate-700 border-slate-600 text-white' 
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>
              <div className="flex-1">
                <label className={`block text-xs sm:text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  End Date
                </label>
                <input
                  type="date"
                  value={(() => {
                    const year = dateRange.end.getFullYear();
                    const month = String(dateRange.end.getMonth() + 1).padStart(2, '0');
                    const day = String(dateRange.end.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                  })()}
                  onChange={(e) => {
                    const newEnd = new Date(e.target.value);
                    newEnd.setHours(23, 59, 59, 999);
                    // Ensure end date is not before start date
                    if (newEnd >= dateRange.start) {
                      setDateRange(prev => ({ ...prev, end: newEnd }));
                    }
                  }}
                  className={`w-full px-2 sm:px-3 py-2 border rounded-md text-xs sm:text-sm ${
                    isDarkMode 
                      ? 'bg-slate-700 border-slate-600 text-white' 
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => {
                  const end = new Date();
                  const start = new Date();
                  start.setDate(start.getDate() - 6);
                  start.setHours(0, 0, 0, 0);
                  end.setHours(23, 59, 59, 999);
                  setDateRange({ start, end });
                }}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                  (() => {
                    const end = new Date();
                    const start = new Date();
                    start.setDate(start.getDate() - 6);
                    start.setHours(0, 0, 0, 0);
                    end.setHours(23, 59, 59, 999);
                    return dateRange.start.getTime() === start.getTime() && dateRange.end.getTime() === end.getTime();
                  })() 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25' 
                    : 'bg-slate-600 hover:bg-slate-500 text-white hover:shadow-md'
                }`}
              >
                Last 7 Days
              </button>
              <button
                onClick={() => {
                  const end = new Date();
                  const start = new Date();
                  start.setDate(start.getDate() - 29);
                  start.setHours(0, 0, 0, 0);
                  end.setHours(23, 59, 59, 999);
                  setDateRange({ start, end });
                }}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                  (() => {
                    const end = new Date();
                    const start = new Date();
                    start.setDate(start.getDate() - 29);
                    start.setHours(0, 0, 0, 0);
                    end.setHours(23, 59, 59, 999);
                    return dateRange.start.getTime() === start.getTime() && dateRange.end.getTime() === end.getTime();
                  })() 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25' 
                    : 'bg-slate-600 hover:bg-slate-500 text-white hover:shadow-md'
                }`}
              >
                Last 30 Days
              </button>
            </div>
          </div>
        </div>

                            {/* Charts */}
        <div className="space-y-3 sm:space-y-4 md:space-y-6">
          {/* Jobs Performance Trends */}
          <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} p-3 sm:p-4 rounded-lg shadow-sm`}>
            <h3 className={`text-sm sm:text-base md:text-lg font-medium ${isDarkMode ? 'text-white' : 'text-slate-800'} mb-2 sm:mb-3 md:mb-4`}>Jobs Performance - Daily Overview ({dateRange.start.toLocaleDateString('en-GB')} to {dateRange.end.toLocaleDateString('en-GB')})</h3>
            <div className="h-48 sm:h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={(() => {
                const data: { date: string; itemsPicked: number; jobsCompleted: number; jobsCreated: number }[] = [];
                const groupedData = new Map<string, { itemsPicked: number; jobsCompleted: number; jobsCreated: number }>();

                // Generate data for the selected date range
                const startDate = new Date(dateRange.start);
                const endDate = new Date(dateRange.end);
                const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

                for (let i = 0; i <= daysDiff; i++) {
                  const checkDate = new Date(startDate);
                  checkDate.setDate(startDate.getDate() + i);
                  const checkStart = new Date(checkDate);
                  checkStart.setHours(0, 0, 0, 0);
                  const checkEnd = new Date(checkDate);
                  checkEnd.setHours(23, 59, 59, 999);

                  const dayJobs = jobs.filter(job => {
                    const jobDate = job.createdAt;
                    return jobDate >= checkStart && jobDate <= checkEnd;
                  });

                  const itemsPicked = dayJobs.reduce((sum, job) => 
                    sum + job.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
                  );
                  const jobsCompleted = dayJobs.filter(job => job.status === 'completed').length;
                  const jobsCreated = dayJobs.length;

                  const dateKey = format(checkDate, 'MMM dd');
                  groupedData.set(dateKey, { itemsPicked, jobsCompleted, jobsCreated });
                }

                groupedData.forEach((dataItem, date) => {
                  data.push({
                    date,
                    itemsPicked: dataItem.itemsPicked,
                    jobsCompleted: dataItem.jobsCompleted,
                    jobsCreated: dataItem.jobsCreated
                  });
                });

                return data.sort((a, b) => {
                  const dateA = new Date(a.date);
                  const dateB = new Date(b.date);
                  return dateA.getTime() - dateB.getTime();
                });
              })()}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
                <XAxis dataKey="date" stroke={isDarkMode ? '#94a3b8' : '#64748b'} />
                <YAxis stroke={isDarkMode ? '#94a3b8' : '#64748b'} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                    border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
                    color: isDarkMode ? '#e2e8f0' : '#1e293b'
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'Items Picked') {
                      return [`${value} items`, name];
                    } else if (name === 'Jobs Completed') {
                      return [`${value} jobs`, name];
                    } else if (name === 'Jobs Created') {
                      return [`${value} jobs`, name];
                    }
                    return [value, name];
                  }}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Legend />
                <Line type="monotone" dataKey="itemsPicked" stroke="#10b981" name="Items Picked" strokeWidth={2} />
                <Line type="monotone" dataKey="jobsCompleted" stroke="#3b82f6" name="Jobs Completed" strokeWidth={2} />
                <Line type="monotone" dataKey="jobsCreated" stroke="#f59e0b" name="Jobs Created" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
               </div>
             </div>

                              {/* User Performance Chart */}
          <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} p-3 sm:p-4 rounded-lg shadow-sm`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mb-2 sm:mb-3 md:mb-4">
              <h3 className={`text-sm sm:text-base md:text-lg font-medium ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>User Performance - {dateRange.start.toLocaleDateString('en-GB')} to {dateRange.end.toLocaleDateString('en-GB')}</h3>
              <select
                value={selectedUserForChart || (() => {
                  const uniqueUsers = Array.from(new Set(jobs.map(job => job.createdBy)));
                  return uniqueUsers.length > 0 ? uniqueUsers[0] : '';
                })()}
                onChange={(e) => {
                  setSelectedUserForChart(e.target.value);
                }}
                className={`px-2 sm:px-3 py-1 border rounded-md text-xs sm:text-sm ${
                  isDarkMode 
                    ? 'bg-slate-700 border-slate-600 text-white' 
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
              >
                {(() => {
                  const uniqueUsers = Array.from(new Set(jobs.map(job => job.createdBy)));
                  return uniqueUsers.map(userName => (
                    <option key={userName} value={userName}>{userName}</option>
                  ));
                })()}
              </select>
            </div>
            <div className="h-48 sm:h-64 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={(() => {
                const data: { date: string; itemsPicked: number; jobsCompleted: number; jobsCreated: number; totalPickingTime: number }[] = [];
                const groupedData = new Map<string, { itemsPicked: number; jobsCompleted: number; jobsCreated: number; totalPickingTime: number }>();

                // Get the selected user from state, or default to first user
                const uniqueUsers = Array.from(new Set(jobs.map(job => job.createdBy)));
                const selectedUser = selectedUserForChart || (uniqueUsers.length > 0 ? uniqueUsers[0] : '');

                // Generate data for the selected date range for the selected user
                const startDate = new Date(dateRange.start);
                const endDate = new Date(dateRange.end);
                const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

                for (let i = 0; i <= daysDiff; i++) {
                  const checkDate = new Date(startDate);
                  checkDate.setDate(startDate.getDate() + i);
                  const checkStart = new Date(checkDate);
                  checkStart.setHours(0, 0, 0, 0);
                  const checkEnd = new Date(checkDate);
                  checkEnd.setHours(23, 59, 59, 999);

                  const dayJobs = jobs.filter(job => {
                    const jobDate = job.createdAt;
                    return jobDate >= checkStart && jobDate <= checkEnd && job.createdBy === selectedUser;
                  });

                  const itemsPicked = dayJobs.reduce((sum, job) => 
                    sum + job.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
                  );
                  const jobsCompleted = dayJobs.filter(job => job.status === 'completed').length;
                  const jobsCreated = dayJobs.length;

                  // Calculate total picking time for the day
                  let totalPickingTime = 0;
                  dayJobs.forEach(job => {
                    if (job.pickingTime && job.pickingTime > 0) {
                      totalPickingTime += job.pickingTime;
                    }
                  });

                  const dateKey = format(checkDate, 'MMM dd');
                  groupedData.set(dateKey, { itemsPicked, jobsCompleted, jobsCreated, totalPickingTime });
                }

                groupedData.forEach((dataItem, date) => {
                  data.push({
                    date,
                    itemsPicked: dataItem.itemsPicked,
                    jobsCompleted: dataItem.jobsCompleted,
                    jobsCreated: dataItem.jobsCreated,
                    totalPickingTime: dataItem.totalPickingTime
                  });
                });

                return data.sort((a, b) => {
                  const dateA = new Date(a.date);
                  const dateB = new Date(b.date);
                  return dateA.getTime() - dateB.getTime();
                });
              })()}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
                <XAxis dataKey="date" stroke={isDarkMode ? '#94a3b8' : '#64748b'} />
                <YAxis stroke={isDarkMode ? '#94a3b8' : '#64748b'} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                    border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
                    color: isDarkMode ? '#e2e8f0' : '#1e293b'
                  }}
                  formatter={(value: number, name: string) => {
                    if (name === 'Items Picked') {
                      return [`${value} items`, name];
                    } else if (name === 'Jobs Completed') {
                      return [`${value} jobs`, name];
                    } else if (name === 'Jobs Created') {
                      return [`${value} jobs`, name];
                    } else if (name === 'Total Picking Time') {
                      return [`${formatElapsedTime(value)}`, name];
                    }
                    return [value, name];
                  }}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Legend />
                <Line type="monotone" dataKey="itemsPicked" stroke="#10b981" name="Items Picked" strokeWidth={2} />
                <Line type="monotone" dataKey="jobsCompleted" stroke="#3b82f6" name="Jobs Completed" strokeWidth={2} />
                <Line type="monotone" dataKey="jobsCreated" stroke="#f59e0b" name="Jobs Created" strokeWidth={2} />
                <Line type="monotone" dataKey="totalPickingTime" stroke="#8b5cf6" name="Total Picking Time" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
       </div>
     </div>
      </div>




  </div>
)}

    </>
  );
};

export default JobsReportsSection;
