import React, { useState, useEffect } from 'react';
import { TrendingDown, AlertTriangle, Loader2, Clock, Filter } from 'lucide-react';
import { StockItem } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';
import { db } from '../../config/firebase';
import { collection, getDocs, query, orderBy, where, Timestamp, limit } from 'firebase/firestore';
import { startOfDay, endOfDay, format, parseISO, subDays } from 'date-fns';
import Select from '../../components/ui/Select';

interface ActivityLog {
  id: string;
  user: string;
  role: string;
  detail: string;
  time: string;
}

const OutboundDashboard2: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [stats, setStats] = useState({
    lowStockItems: 0,
    totalDeductions: 0
  });
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [dateFilter, setDateFilter] = useState('today');
  const [roleFilter, setRoleFilter] = useState('all');
  const { showToast } = useToast();
  const { isDarkMode } = useTheme();

  const getDateRange = (filter: string) => {
    const today = new Date();
    switch (filter) {
      case 'today':
        return {
          start: startOfDay(today),
          end: endOfDay(today)
        };
      case 'yesterday':
        return {
          start: startOfDay(subDays(today, 1)),
          end: endOfDay(subDays(today, 1))
        };
      case 'last7days':
        return {
          start: startOfDay(subDays(today, 7)),
          end: endOfDay(today)
        };
      case 'last30days':
        return {
          start: startOfDay(subDays(today, 30)),
          end: endOfDay(today)
        };
      default:
        return {
          start: startOfDay(today),
          end: endOfDay(today)
        };
    }
  };

  // Fetch stock items and stats from Firestore
  const fetchStats = async () => {
    setIsLoading(true);
    try {
      // Fetch stock items
      const stockQuery = query(collection(db, 'inventory'), orderBy('name'));
      const querySnapshot = await getDocs(stockQuery);
      const stockItems = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          lastUpdated: data.lastUpdated instanceof Timestamp 
            ? data.lastUpdated.toDate() 
            : new Date(data.lastUpdated)
        };
      }) as StockItem[];

      // Fetch today's activity logs
      const today = new Date();
      const startOfToday = startOfDay(today);
      const endOfToday = endOfDay(today);
      
      const logsQuery = query(
        collection(db, 'activityLogs'),
        where('time', '>=', startOfToday.toISOString()),
        where('time', '<=', endOfToday.toISOString())
      );
      
      const logsSnapshot = await getDocs(logsQuery);
      const todayLogs = logsSnapshot.docs.map(doc => doc.data());
      
      // Calculate stats
      const lowStockItems = stockItems.filter(item => 
        item.quantity > 10 && 
        item.quantity <= 25
      ).length;
      const totalDeductions = todayLogs.reduce((sum, log) => {
        const match = log.detail.match(/(\d+) units deducted from stock/);
        return sum + (match ? parseInt(match[1]) : 0);
      }, 0);

      setStats({
        lowStockItems,
        totalDeductions
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      showToast('Failed to fetch stats', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch activity logs with filters
  const fetchLogs = async () => {
    setIsLogsLoading(true);
    try {
      const dateRange = getDateRange(dateFilter);
      const outboundLogsQuery = query(
        collection(db, 'activityLogs'),
        where('time', '>=', dateRange.start.toISOString()),
        where('time', '<=', dateRange.end.toISOString()),
        orderBy('time', 'desc'),
        limit(500)
      );

      const outboundLogsSnapshot = await getDocs(outboundLogsQuery);
      const outboundLogs = outboundLogsSnapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            user: data.user,
            role: data.role,
            detail: data.detail,
            time: data.time
          } as ActivityLog;
        })
        .filter(log => {
          const isOutbound = log.detail.includes('units deducted');
          const matchesRole = roleFilter === 'all' || log.role === roleFilter;
          return isOutbound && matchesRole;
        });

      setActivityLogs(outboundLogs);
    } catch (error) {
      console.error('Error fetching logs:', error);
      showToast('Failed to fetch activity logs', 'error');
    } finally {
      setIsLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [showToast]);

  useEffect(() => {
    fetchLogs();
  }, [dateFilter, roleFilter]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Outbound Dashboard
          </h1>
          <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mt-1`}>
            Track today's inventory deductions
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-white'} border ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total Units Deducted Today</p>
              {isLoading ? (
                <div className="flex flex-col gap-2 mt-1">
                  <div className={`h-8 w-24 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'} animate-pulse rounded`} />
                  <div className={`h-4 w-32 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'} animate-pulse rounded`} />
                </div>
              ) : (
                <p className={`text-2xl font-semibold mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {stats.totalDeductions}
                </p>
              )}
            </div>
            <div className={`p-3 rounded-full ${isDarkMode ? 'bg-green-500/10' : 'bg-green-100'}`}>
              <TrendingDown className={`w-6 h-6 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-slate-800' : 'bg-white'} border ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Low Stock Items</p>
              {isLoading ? (
                <div className="flex flex-col gap-2 mt-1">
                  <div className={`h-8 w-24 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'} animate-pulse rounded`} />
                  <div className={`h-4 w-32 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'} animate-pulse rounded`} />
                </div>
              ) : (
                <p className={`text-2xl font-semibold mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {stats.lowStockItems}
                </p>
              )}
            </div>
            <div className={`p-3 rounded-full ${isDarkMode ? 'bg-yellow-500/10' : 'bg-yellow-100'}`}>
              <AlertTriangle className={`w-6 h-6 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Operations Log Section */}
      <div className={`rounded-lg border ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
        <div className={`p-4 border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <div className="flex items-center justify-between">
            <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Recent Outbound Activities
            </h2>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className={`w-4 h-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} />
                <Select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  options={[
                    { value: 'today', label: 'Today' },
                    { value: 'yesterday', label: 'Yesterday' },
                    { value: 'last7days', label: 'Last 7 Days' },
                    { value: 'last30days', label: 'Last 30 Days' }
                  ]}
                  className="w-40"
                />
              </div>
              <Select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Roles' },
                  { value: 'admin', label: 'Admin' },
                  { value: 'staff', label: 'Staff' }
                ]}
                className="w-40"
              />
            </div>
          </div>
        </div>
        <div className="divide-y divide-slate-200">
          {isLogsLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : activityLogs.length === 0 ? (
            <div className={`p-4 text-center ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              No activities found for the selected filters
            </div>
          ) : (
            activityLogs.map((log) => (
              <div key={log.id} className={`p-4 ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className={`${isDarkMode ? 'text-white' : 'text-gray-900'} font-medium`}>
                      {log.detail}
                    </p>
                    <div className="flex items-center mt-1 space-x-4">
                      <span className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {log.user}
                      </span>
                      <span className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {log.role}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center ml-4">
                    <Clock className={`w-4 h-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mr-2`} />
                    <span className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {format(parseISO(log.time), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default OutboundDashboard2; 