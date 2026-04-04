import React from 'react';
import { RefreshCw } from 'lucide-react';
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
import type { ProductivityDataState } from '../types';

export type JobsProductivitySectionProps = {
  isDarkMode: boolean;
  productivityDate: Date;
  setProductivityDate: React.Dispatch<React.SetStateAction<Date>>;
  generateProductivityData: () => void;
  isLoadingProductivity: boolean;
  productivityData: ProductivityDataState;
};

const JobsProductivitySection: React.FC<JobsProductivitySectionProps> = ({
  isDarkMode,
  productivityDate,
  setProductivityDate,
  generateProductivityData,
  isLoadingProductivity,
  productivityData,
}) => {
  return (
    <>
{/* Productivity Header with Date Picker */}
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
  <div className="flex items-center gap-3">
    <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
      Productivity Analytics
    </h2>
    <span className={`px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300`}>
      {productivityDate.toLocaleDateString()}
    </span>
  </div>
  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
    <div className="flex items-center gap-2">
      <label className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
        Date:
      </label>
      <input
        type="date"
        value={`${productivityDate.getFullYear()}-${String(productivityDate.getMonth() + 1).padStart(2, '0')}-${String(productivityDate.getDate()).padStart(2, '0')}`}
        onChange={(e) => {
          const dateString = e.target.value;
          const [year, month, day] = dateString.split('-').map(Number);
          const newDate = new Date(year, month - 1, day); // month is 0-indexed
          setProductivityDate(newDate);
          generateProductivityData();
        }}
        className={`px-3 py-2 border rounded-md text-sm ${
          isDarkMode 
            ? 'bg-slate-700 border-slate-600 text-white' 
            : 'bg-white border-slate-300 text-slate-900'
        }`}
      />
    </div>
    <Button 
      variant="secondary" 
      onClick={generateProductivityData} 
      className="flex items-center gap-2"
      size='sm'
      disabled={isLoadingProductivity}
    >
      <RefreshCw size={16} className={isLoadingProductivity ? 'animate-spin' : ''} />
    </Button>
  </div>
</div>

{isLoadingProductivity ? (
  <div className={`text-center py-12 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
    <div className="flex flex-col items-center space-y-4">
      <RefreshCw size={32} className="animate-spin text-green-500" />
      <div className="space-y-2">
        <p className="text-lg font-medium">Analyzing Worker Productivity...</p>
        <p className="text-sm opacity-75">Please wait while we calculate performance metrics</p>
      </div>
    </div>
  </div>
) : (
  <div className="space-y-6">
    {/* Productivity Summary Stats */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <div className={`p-3 sm:p-4 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
        <div className={`text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mb-1`}>Total Workers</div>
        <div className={`text-xl sm:text-2xl font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
          {productivityData.workerStats.length}
        </div>
      </div>
      <div className={`p-3 sm:p-4 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
        <div className={`text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mb-1`}>Total Jobs Completed</div>
        <div className={`text-xl sm:text-2xl font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
          {productivityData.workerStats.reduce((sum, worker) => sum + worker.completedJobs, 0)}
        </div>
      </div>
      <div className={`p-3 sm:p-4 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
        <div className={`text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mb-1`}>Total Items Picked</div>
        <div className={`text-xl sm:text-2xl font-bold ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
          {productivityData.workerStats.reduce((sum, worker) => sum + worker.itemsPicked, 0)}
        </div>
      </div>
      <div className={`p-3 sm:p-4 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
        <div className={`text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mb-1`}>Avg Efficiency</div>
        <div className={`text-xl sm:text-2xl font-bold ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>
          {productivityData.workerStats.length > 0 
            ? (productivityData.workerStats.reduce((sum, worker) => sum + worker.efficiency, 0) / productivityData.workerStats.length).toFixed(1)
            : '0'} items/min
        </div>
      </div>
    </div>

    {/* Worker Performance Table */}
    <div className={`p-4 sm:p-6 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
      <h3 className={`text-base sm:text-lg font-semibold mb-3 sm:mb-4 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
        Worker Performance Ranking
      </h3>
      {productivityData.workerStats.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className={`border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                <th className={`text-left py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Rank</th>
                <th className={`text-left py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Worker</th>
                <th className={`text-center py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Jobs</th>
                <th className={`text-center py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Items</th>
                <th className={`text-center py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Efficiency</th>
                <th className={`text-center py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Avg Time</th>
                <th className={`text-center py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Performance</th>
              </tr>
            </thead>
            <tbody>
              {productivityData.workerStats.map((worker, index) => (
                <tr key={worker.name} className={`border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                  <td className={`py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                    #{index + 1}
                  </td>
                  <td className={`py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                    {worker.name}
                  </td>
                  <td className={`text-center py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    {worker.completedJobs}
                  </td>
                  <td className={`text-center py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} font-semibold`}>
                    {worker.itemsPicked}
                  </td>
                  <td className={`text-center py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm ${isDarkMode ? 'text-green-400' : 'text-green-600'} font-semibold`}>
                    {worker.efficiency} items/min
                  </td>
                  <td className={`text-center py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                    {Math.round(worker.avgPickingTime / 60)}m {worker.avgPickingTime % 60}s
                  </td>
                  <td className={`text-center py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm`}>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      worker.performance === 'excellent' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                      worker.performance === 'good' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                      worker.performance === 'average' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                    }`}>
                      {worker.performance === 'needs_improvement' ? 'Needs Improvement' : 
                       worker.performance.charAt(0).toUpperCase() + worker.performance.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={`text-center py-6 sm:py-8 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          No productivity data available for the selected date range
        </div>
      )}
    </div>

    {/* Hourly Productivity Chart */}
    <div className={`p-4 sm:p-6 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
      <h3 className={`text-base sm:text-lg font-semibold mb-3 sm:mb-4 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
        Hourly Productivity Trends
      </h3>
      <div className="h-80 w-full overflow-x-auto">
        <ResponsiveContainer width="100%" height="100%" minWidth={800}>
          <LineChart data={productivityData.hourlyProductivity} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
            <XAxis 
              dataKey="hour" 
              stroke={isDarkMode ? '#94a3b8' : '#64748b'} 
              fontSize={10}
              interval={1}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis stroke={isDarkMode ? '#94a3b8' : '#64748b'} fontSize={12} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
                color: isDarkMode ? '#e2e8f0' : '#1e293b'
              }}
              formatter={(value: number, name: string) => {
                if (name === 'Total Items') {
                  return [`${value} items`, name];
                } else if (name === 'Total Jobs') {
                  return [`${value} jobs`, name];
                } else if (name === 'Avg Picking Time') {
                  return [`${Math.round(value / 60)}m ${value % 60}s`, name];
                }
                return [value, name];
              }}
              labelFormatter={(label) => `Hour: ${label}`}
            />
            <Legend />
            <Line type="monotone" dataKey="totalJobs" stroke="#10b981" name="Total Jobs" strokeWidth={2} />
            <Line type="monotone" dataKey="totalItems" stroke="#3b82f6" name="Total Items" strokeWidth={2} />
            <Line type="monotone" dataKey="avgPickingTime" stroke="#f59e0b" name="Avg Picking Time" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>
)}

    </>
  );
};

export default JobsProductivitySection;
