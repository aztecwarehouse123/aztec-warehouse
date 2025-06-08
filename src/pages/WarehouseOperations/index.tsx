import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import {  Download } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import Select from '../../components/ui/Select';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useTheme } from '../../contexts/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';


interface ActivityLog {
  id: string;
  user: string;
  role: string;
  detail: string;
  time: string;
}

const WarehouseOperations: React.FC = () => {
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  //const [isLoading, setIsLoading] = useState(true);
  const [isLogsLoading, setIsLogsLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('today');
  const [roleFilter, setRoleFilter] = useState('all');
  const { showToast } = useToast();
  const { isDarkMode } = useTheme();

  // Fetch activity logs
  const fetchActivityLogs = async () => {
    setIsLogsLoading(true);
    try {
      let logsQuery = query(collection(db, 'activityLogs'), orderBy('time', 'desc'));
      
      // Apply date filter
      const now = new Date();
      if (dateFilter === 'today') {
        logsQuery = query(
          collection(db, 'activityLogs'),
          where('time', '>=', startOfDay(now).toISOString()),
          where('time', '<=', endOfDay(now).toISOString()),
          orderBy('time', 'desc')
        );
      } else if (dateFilter === 'yesterday') {
        const yesterday = subDays(now, 1);
        logsQuery = query(
          collection(db, 'activityLogs'),
          where('time', '>=', startOfDay(yesterday).toISOString()),
          where('time', '<=', endOfDay(yesterday).toISOString()),
          orderBy('time', 'desc')
        );
      } else if (dateFilter === 'week') {
        logsQuery = query(
          collection(db, 'activityLogs'),
          where('time', '>=', startOfWeek(now).toISOString()),
          where('time', '<=', endOfWeek(now).toISOString()),
          orderBy('time', 'desc')
        );
      } else if (dateFilter === 'month') {
        logsQuery = query(
          collection(db, 'activityLogs'),
          where('time', '>=', startOfMonth(now).toISOString()),
          where('time', '<=', endOfMonth(now).toISOString()),
          orderBy('time', 'desc')
        );
      }

      const snapshot = await getDocs(logsQuery);
      let logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ActivityLog[];

      // Apply role filter
      if (roleFilter !== 'all') {
        logs = logs.filter(log => log.role === roleFilter);
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
    fetchActivityLogs();
  }, [dateFilter, roleFilter]);

  // Fetch stock locations


  const dateFilterOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' }
  ];

  const roleFilterOptions = [
    { value: 'all', label: 'All Roles' },
    { value: 'admin', label: 'Admin' },
    { value: 'inbound', label: 'Inbound' },
    { value: 'outbound', label: 'Outbound' }
  ];

  const exportToCSV = () => {
    try {
      // Create CSV content
      const headers = ['User', 'Role', 'Activity', 'Time'];
      const csvContent = [
        headers.join(','),
        ...activityLogs.map(log => [
          log.user,
          log.role,
          `"${log.detail.replace(/"/g, '""')}"`, // Escape quotes in detail
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
      doc.text(`Date Filter: ${dateFilterOptions.find(opt => opt.value === dateFilter)?.label}`, 14, 25);
      doc.text(`Role Filter: ${roleFilterOptions.find(opt => opt.value === roleFilter)?.label}`, 14, 30);
      
      // Add table
      autoTable(doc, {
        startY: 35,
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
        <div className={`flex justify-between items-center p-6 border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <h2 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Activity Logs</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={exportToCSV}
                className={`inline-flex items-center px-3 py-2 border shadow-sm text-sm leading-4 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 ${
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
                className={`inline-flex items-center px-3 py-2 border shadow-sm text-sm leading-4 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 ${
                  isDarkMode 
                    ? 'border-slate-600 text-slate-200 bg-slate-700 hover:bg-slate-600' 
                    : 'border-slate-300 text-slate-700 bg-white hover:bg-slate-50'
                }`}
              >
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </button>
            </div>
            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              options={roleFilterOptions}
              className="w-40"
            />
            <Select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              options={dateFilterOptions}
              className="w-40"
            />
          </div>
        </div>

        {isLogsLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${isDarkMode ? 'border-white' : 'border-slate-800'}`}></div>
          </div>
        ) : activityLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} border-b`}>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider`}>User</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider`}>Role</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider`}>Activity</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider`}>Time</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-slate-700' : 'divide-slate-200'}`}>
                <AnimatePresence>
                  {isLogsLoading ? (
                    <motion.tr
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <td colSpan={4} className="px-6 py-4">
                        <div className="flex justify-center items-center">
                          <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${isDarkMode ? 'border-white' : 'border-slate-800'}`}></div>
                        </div>
                      </td>
                    </motion.tr>
                  ) : activityLogs.length > 0 ? (
                    activityLogs.map((log, index) => (
                      <motion.tr
                        key={log.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className={`${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}
                      >
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {log.user}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} capitalize`}>
                          {log.role}
                        </td>
                        <td className={`px-6 py-4 text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                          {log.detail}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          {formatDistanceToNow(new Date(log.time), { addSuffix: true })}
                        </td>
                      </motion.tr>
                    ))
                  ) : (
                    <motion.tr
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <td colSpan={4} className={`px-6 py-4 text-center ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        No activity logs found
                      </td>
                    </motion.tr>
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        ) : (
          <div className={`text-center py-8 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            No activity logs found
          </div>
        )}
      </div>
    </div>
  );
};

export default WarehouseOperations; 