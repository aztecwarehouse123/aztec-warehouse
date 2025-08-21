import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import {  Download, RefreshCw, Search } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { format, startOfDay, endOfDay } from 'date-fns';
import Select from '../../components/ui/Select';
import DateRangePicker from '../../components/ui/DateRangePicker';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useTheme } from '../../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../../components/ui/Button';
import { User } from '../../types';
import Input from '../../components/ui/Input';
import { useAuth } from '../../contexts/AuthContext';

interface ActivityLog {
  id: string;
  user: string;
  role: string;
  detail: string;
  time: string;
}

const WarehouseOperations: React.FC = () => {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(true);
  const [startDate, setStartDate] = useState<Date | null>(new Date());
  const [endDate, setEndDate] = useState<Date | null>(new Date());
  const [userFilter, setUserFilter] = useState('all');
  const [activityFilter, setActivityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const { showToast } = useToast();
  const { isDarkMode } = useTheme();
  const { user } = useAuth();

  // Fetch all users for the user filter
  const fetchUsers = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      showToast('Failed to fetch users', 'error');
    }
  };

  // Fetch activity logs
  const fetchActivityLogs = async () => {
    setIsLogsLoading(true);
    try {
      let logsQuery = query(collection(db, 'activityLogs'), orderBy('time', 'desc'));
      
      // Apply date filter
      if (startDate && endDate) {
        logsQuery = query(
          collection(db, 'activityLogs'),
          where('time', '>=', startOfDay(startDate).toISOString()),
          where('time', '<=', endOfDay(endDate).toISOString()),
          orderBy('time', 'desc')
        );
      } else if (startDate) {
        logsQuery = query(
          collection(db, 'activityLogs'),
          where('time', '>=', startOfDay(startDate).toISOString()),
          orderBy('time', 'desc')
        );
      } else if (endDate) {
        logsQuery = query(
          collection(db, 'activityLogs'),
          where('time', '<=', endOfDay(endDate).toISOString()),
          orderBy('time', 'desc')
        );
      }

      const snapshot = await getDocs(logsQuery);
      let logs = snapshot.docs.map(doc => ({
        id: doc.id,
        user: doc.data().user,
        role: doc.data().role,
        detail:  doc.data().detail,
        time: doc.data().time,
      })) as ActivityLog[];

      // If current user is staff, filter out admin logs
      if (user && user.role === 'staff') {
        logs = logs.filter(log => log.role !== 'admin');
      }

      // Apply user filter
      if (userFilter !== 'all') {
        logs = logs.filter(log => log.user === userFilter);
      }

      // Apply activity filter
      if (activityFilter !== 'all') {
        logs = logs.filter(log => {
          const detail = log.detail.toLowerCase();
          if (activityFilter === 'inbound') {
            return detail.includes('added new product') || 
                   detail.includes('edited product') ||
                   detail.includes('quantity from') ||
                   detail.includes('quantity to');
          } else if (activityFilter === 'outbound') {
            return detail.includes('units deducted from stock') ||
                   detail.includes('deducted from stock');
          }
          return true;
        });
      }

      // Apply search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        logs = logs.filter(log => {
          const detail = log.detail.toLowerCase();
          const user = log.user.toLowerCase();
          const role = log.role.toLowerCase();
          
          // Search in activity detail, user name, role, and extract product names from quotes
          const productNameMatch = detail.match(/"([^"]+)"/);
          const productName = productNameMatch ? productNameMatch[1].toLowerCase() : '';
          
          return detail.includes(query) || 
                 user.includes(query) || 
                 role.includes(query) ||
                 productName.includes(query);
        });
      }

      setActivityLogs(logs);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      showToast('Failed to fetch activity logs', 'error');
    } finally {
      setIsLogsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchActivityLogs();
  }, [startDate, endDate, userFilter, activityFilter, searchQuery, user]);

  const getUserFilterOptions = () => {
    let filteredUsers  = users;

    // If current user is staff, filter out admin users
    if (user && user.role === 'staff') {
      filteredUsers = users.filter(user => user.role !== 'admin');
    }

    return [
      { value: 'all', label: 'All Users' },
      ...filteredUsers.map(user => ({
        value: user.name,
        label: user.name
      }))
    ];

  }

  // const userFilterOptions = [
  //   { value: 'all', label: 'All Users' },
  //   ...users.map(user => ({
  //     value: user.name,
  //     label: user.name
  //   }))
  // ];

  const activityFilterOptions = [
    { value: 'all', label: 'All Activities' },
    { value: 'inbound', label: 'Inbound' },
    { value: 'outbound', label: 'Outbound' }
  ];

  const clearDateRange = () => {
    setStartDate(null);
    setEndDate(null);
  };

  const exportToCSV = () => {
    try {
      // Create CSV content
      const headers = ['User', 'Role', 'Activity', 'Time'];
      const csvContent = [
        headers.join(','),
        ...activityLogs.map(log => [
          log.user,
          log.role,
          `"${log.detail.replace(/"/g, '""')}"`,
          format(new Date(log.time), 'MMM d, yyyy h:mm a')
        ].join(','))
      ].join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `activity_logs_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      showToast('Failed to export to CSV', 'error');
    }
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(16);
      doc.text('Activity Logs Report', 14, 15);
      
      // Add filters info
      doc.setFontSize(10);
      const dateRangeText = startDate && endDate 
        ? `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`
        : startDate 
        ? `From ${format(startDate, 'MMM d, yyyy')}`
        : endDate 
        ? `To ${format(endDate, 'MMM d, yyyy')}`
        : 'All Time';
      doc.text(`Date Range: ${dateRangeText}`, 14, 25);
      // doc.text(`User Filter: ${userFilterOptions.find(opt => opt.value === userFilter)?.label}`, 14, 30);
      doc.text(`User Filter: ${getUserFilterOptions().find(opt => opt.value === userFilter)?.label}`, 14, 30);
      doc.text(`Activity Filter: ${activityFilterOptions.find(opt => opt.value === activityFilter)?.label}`, 14, 35);
      
      // Add table
      autoTable(doc, {
        startY: 40,
        head: [['User', 'Role', 'Activity', 'Time']],
        body: activityLogs.map(log => [
          log.user,
          log.role,
          log.detail,
          format(new Date(log.time), 'MMM d, yyyy h:mm a')
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [51, 65, 85] }
      });

      // Save the PDF
      doc.save(`activity_logs_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      showToast('Failed to export to PDF', 'error');
    }
  };

  return (
    <div className={`space-y-6 ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-white text-slate-800'}`}>
      {/* Activity Logs Section */}
      <div className={`rounded-lg shadow-sm border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        {/* Header with Title and Export Buttons */}
        <div className={`flex flex-col sm:flex-row sm:justify-between sm:items-center p-6 border-b gap-4 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Activity Logs</h2>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              onClick={exportToCSV}
              className={`inline-flex items-center px-3 py-2 border shadow-sm text-sm leading-4 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 w-full sm:w-auto ${
                isDarkMode 
                  ? 'border-slate-600 text-slate-200 bg-slate-700 hover:bg-slate-600' 
                  : 'border-slate-300 text-slate-700 bg-white hover:bg-slate-50'
              }`}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </button>
            <button
              onClick={exportToPDF}
              className={`inline-flex items-center px-3 py-2 border shadow-sm text-sm leading-4 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 w-full sm:w-auto ${
                isDarkMode 
                  ? 'border-slate-600 text-slate-200 bg-slate-700 hover:bg-slate-600' 
                  : 'border-slate-300 text-slate-700 bg-white hover:bg-slate-50'
              }`}
            >
              <Download className="h-4 w-4 mr-2" />
              Export PDF
            </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className={`flex flex-col sm:flex-row sm:justify-between sm:items-center p-6 border-b gap-2 ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-stretch sm:items-center">
            <Input
              type="text"
              placeholder="Search activities, product names, users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-96"
              icon={<Search size={16} />}
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-1 w-full sm:w-auto items-stretch sm:items-center">
            <Select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              options={getUserFilterOptions()}
              className="w-full sm:w-40"
            />
            <Select
              value={activityFilter}
              onChange={(e) => setActivityFilter(e.target.value)}
              options={activityFilterOptions}
              className="w-full sm:w-40"
            />
            <DateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
              onClear={clearDateRange}
              className="w-full sm:w-80"
            />
            <Button
              variant="secondary"
              onClick={fetchActivityLogs}
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              <RefreshCw size={16} />
            </Button>
          </div>
        </div>

        {isLogsLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${isDarkMode ? 'border-white' : 'border-slate-800'}`}></div>
          </div>
        ) : activityLogs.length > 0 ? (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} border-b`}>
                    <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider`}>User</th>
                    <th className={`px-2 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider`}>Role</th>
                    <th className={`px-2 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider`}>Activity</th>
                    <th className={`px-2 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider`}>Time</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-slate-700' : 'divide-slate-200'}`}>
                  <AnimatePresence>
                    {activityLogs.map((log) => (
                      <motion.tr
                        key={log.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className={`${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}
                      >
                        <td className={`px-4 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{log.user}</td>
                        <td className={`px-2 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{log.role}</td>
                        <td className={`px-2 py-4 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{log.detail}</td>
                        <td className={`px-2 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{format(new Date(log.time), 'MMM d, yyyy h:mm:ss a')}</td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
            {/* Mobile Card List */}
            <div className="block md:hidden space-y-4 p-4">
              {activityLogs.map((log) => (
                <div
                  key={log.id}
                  className={`rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} p-4 shadow-sm flex flex-col gap-2`}
                >
                  <div className="flex justify-between items-center">
                    <span className={`font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>{log.user}</span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${isDarkMode ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700'}`}>{log.role}</span>
                  </div>
                  <div className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>
                    <span className="block text-xs font-medium mb-1">Activity:</span>
                    <span className="text-sm">{log.detail}</span>
                  </div>
                  <div className="text-xs mt-1">
                    <span className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>Time: <span className="font-medium">{format(new Date(log.time), 'MMM d, yyyy h:mm:ss a')}</span></span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className={`text-center py-8 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>No activity logs found</div>
        )}
      </div>
    </div>
  );
};

export default WarehouseOperations; 