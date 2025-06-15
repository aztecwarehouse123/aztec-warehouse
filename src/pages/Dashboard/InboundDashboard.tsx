import React, { useState, useEffect } from 'react';
import { Package, AlertTriangle, Plus, AlertCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { collection, query, getDocs, Timestamp, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { StockItem } from '../../types';
import StatsCard from '../../components/dashboard/StatsCard';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { useTheme } from '../../contexts/ThemeContext';

const InboundDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [stockItems, setStockItems] = useState<StockItem[]>([]);
  const [todayEntries, setTodayEntries] = useState<StockItem[]>([]);
  const [yesterdayEntries, setYesterdayEntries] = useState<StockItem[]>([]);
  const [criticalLowItems, setCriticalLowItems] = useState<StockItem[]>([]);
  const [lowStockItems, setLowStockItems] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch stock items from Firestore
  useEffect(() => {
    const fetchStockItems = async () => {
      try {
        setIsLoading(true);
        const stockQuery = query(collection(db, 'inventory'));
        const querySnapshot = await getDocs(stockQuery);
        const items = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            lastUpdated: data.lastUpdated instanceof Timestamp 
              ? data.lastUpdated.toDate() 
              : new Date(data.lastUpdated)
          };
        }) as StockItem[];

        setStockItems(items);

        // Get today's entries from activity logs
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
        
        // Filter logs for product additions and extract data
        const todayEntries = todayLogs
          .filter(log => log.detail.startsWith('added new product'))
          .map(log => {
            const match = log.detail.match(/added new product "([^"]+)" with total quantity (\d+) \(([^)]+)\)/);
            if (match) {
              const [, name, totalQuantity] = match;
              // Get the first location for display
              const firstLocation = match[3].split(', ')[0];
              const locationMatch = firstLocation.match(/(\d+) at ([A-Z]+)-(\d+)/);
              if (locationMatch) {
                return {
                  id: log.id,
                  name: name,
                  quantity: parseInt(totalQuantity),
                  locationCode: locationMatch[2],
                  shelfNumber: locationMatch[3],
                  lastUpdated: new Date(log.time)
                };
              }
            }
            return null;
          })
          .filter((entry): entry is StockItem => entry !== null);
        
        setTodayEntries(todayEntries);

        // Filter yesterday's entries
        const yesterday = subDays(today, 1);
        const yesterdayItems = items.filter(item => {
          const itemDate = new Date(item.lastUpdated);
          return itemDate >= startOfDay(yesterday) && itemDate <= endOfDay(yesterday);
        });
        setYesterdayEntries(yesterdayItems);

        // Filter critical low items (less than or equal to 10)
        const criticalItems = items.filter(item => item.quantity <= 10);
        setCriticalLowItems(criticalItems);

        // Filter low stock items (more than 10 but less than or equal to 25)
        const lowItems = items.filter(item => 
          item.quantity > 10 && 
          item.quantity <= 25
        );
        setLowStockItems(lowItems);

      } catch (error) {
        console.error('Error fetching stock items:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStockItems();
  }, []);

  // Prepare data for pie chart
  const pieChartData = todayEntries.map(entry => ({
    name: entry.name.length > 15 ? entry.name.substring(0, 12) + '...' : entry.name,
    value: entry.quantity,
    fullName: entry.name // Keep full name for tooltip
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57'];

  interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{
      name: string;
      value: number;
      payload: {
        name: string;
        value: number;
        fullName: string;
      };
    }>;
    darkMode?: boolean;
  }

  const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, darkMode = false }) => {
    if (active && payload && payload.length) {
      return (
        <div className={`${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-lg shadow-lg p-3`}>
          <p className={`font-medium ${darkMode ? 'text-white' : 'text-slate-800'}`}>{payload[0].payload.fullName}</p>
          <p className={`${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>Quantity: {payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  interface LabelProps {
    cx: number;
    cy: number;
    midAngle: number;
    innerRadius: number;
    outerRadius: number;
    percent: number;
  }

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: LabelProps) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const handleAddNewStock = () => {
    navigate('/stock');
  };

  // Loading skeleton for StatsCard
  const StatsCardSkeleton = () => (
    <div className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-lg border shadow-sm p-5`}>
      <div className="flex items-center justify-between">
        <div className="w-full">
          <div className={`h-4 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'} rounded w-24 mb-2`}></div>
          <div className={`h-8 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'} rounded w-16 mb-2`}></div>
          <div className={`h-4 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'} rounded w-32`}></div>
        </div>
        <div className={`p-3 rounded-full ${isDarkMode ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
          <Loader2 size={24} className="animate-spin" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
      <div>
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Inbound Dashboard</h1>
          <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mt-1`}>Track your inbound operations and inventory status</p>
        </div>
        <button
          onClick={handleAddNewStock}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
        >
          <Plus size={16} />
          Add New Stock
        </button>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </>
        ) : (
          <>
        <StatsCard 
          title="Products Received Today" 
              value={todayEntries.length}
          icon={<Package size={24} className="text-blue-600" />}
              change={{ 
                value: yesterdayEntries.length,
                isPositive: true,
                customIcon: <Plus size={16} className="text-green-500 mr-1" />,
                label: 'products received yesterday'
              }}
        />
        <StatsCard 
          title="Critical Low Items" 
              value={criticalLowItems.length}
          icon={<AlertTriangle size={24} className="text-blue-600" />}
              change={{ 
                value: criticalLowItems.filter(item => item.quantity === 0).length,
                isPositive: false,
                label: 'items out of stock',
                customIcon: <AlertCircle size={16} className="text-red-500 mr-1" />
              }}
        />
        <StatsCard 
              title="Low Stock Items" 
              value={lowStockItems.length}
              icon={<AlertTriangle size={24} className="text-blue-600" />}
              change={{ 
                value: lowStockItems.length,
                isPositive: false,
                label: 'items need attention',
                customIcon: <AlertTriangle size={16} className="text-orange-500 mr-1" />
              }}
        />
        <StatsCard 
              title="Total Products" 
              value={stockItems.length}
              icon={<Package size={24} className="text-blue-600" />}
              change={{ 
                value: stockItems.filter(item => {
                  const itemDate = new Date(item.lastUpdated);
                  const today = new Date();
                  return itemDate >= new Date(today.getFullYear(), today.getMonth(), 1) && 
                         itemDate <= new Date(today.getFullYear(), today.getMonth() + 1, 0);
                }).length,
                isPositive: true,
                label: 'products added this month',
                customIcon: <Plus size={16} className="text-green-500 mr-1" />
              }}
            />
          </>
        )}
      </div>

      {!isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's Entries */}
          <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow p-6`}>
            <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'} mb-4`}>Today's Entries</h2>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className={`${isDarkMode ? 'bg-slate-700/50' : 'bg-slate-50'} sticky top-0`}>
                  <tr>
                    <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Product</th>
                    <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Quantity</th>
                    <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Time</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-slate-700' : 'divide-slate-200'} ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>
                  {todayEntries.map((entry) => (
                    <tr key={entry.id} className={`hover:${isDarkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                      <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{entry.name}</td>
                      <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{entry.quantity}</td>
                      <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                        {format(new Date(entry.lastUpdated), 'h:mm a')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Today's Entries Pie Chart */}
          <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow p-6`}>
            <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'} mb-4`}>Today's Entries by Product</h2>
            <div className="flex flex-col h-96">
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={90}
                      fill="#8884d8"
                      dataKey="value"
                      label={renderCustomizedLabel}
                      className="cursor-pointer"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]}
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip darkMode={isDarkMode} />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Legend */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 max-h-24 overflow-y-auto">
                {pieChartData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-2 text-sm">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className={`${isDarkMode ? 'text-slate-300' : 'text-slate-600'} truncate text-xs`} title={entry.fullName}>
                      {entry.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Critical Low Items */}
          <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow p-6`}>
            <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'} mb-4`}>Critical Low Items</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className={isDarkMode ? 'bg-slate-700/50' : 'bg-slate-50'}>
                  <tr>
                    <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Product</th>
                    <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Quantity</th>
                    <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Location</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-slate-700' : 'divide-slate-200'}`}>
                  {criticalLowItems.map((item) => (
                    <tr key={item.id} className={`hover:${isDarkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                      <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{item.name}</td>
                      <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{item.quantity}</td>
                      <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                        {item.locationCode} - {item.shelfNumber}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Low Stock Items */}
          <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow p-6`}>
            <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'} mb-4`}>Low Stock Items</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
                <thead className={isDarkMode ? 'bg-slate-700/50' : 'bg-slate-50'}>
                  <tr>
                    <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Product</th>
                    <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Quantity</th>
                    <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Location</th>
              </tr>
            </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-slate-700' : 'divide-slate-200'}`}>
                  {lowStockItems.map((item) => (
                    <tr key={item.id} className={`hover:${isDarkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                      <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{item.name}</td>
                      <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{item.quantity}</td>
                      <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                        {item.locationCode} - {item.shelfNumber}
                      </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Loading state for Today's Entries */}
          <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow p-6`}>
            <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'} mb-4`}>Today's Entries</h2>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <div className="animate-pulse">
                <div className={`h-10 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'} rounded mb-4`}></div>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className={`h-12 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'} rounded mb-2`}></div>
                ))}
              </div>
            </div>
          </div>

          {/* Loading state for Pie Chart */}
          <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow p-6`}>
            <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'} mb-4`}>Today's Entries by Product</h2>
            <div className="flex flex-col h-96">
              <div className="flex-1 min-h-0 flex items-center justify-center">
                <div className="text-center">
                  <Loader2 size={48} className={`animate-spin ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} mx-auto mb-4`} />
                  <p className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>Loading chart data...</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`w-3 h-3 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'} rounded-full`}></div>
                    <div className={`h-4 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'} rounded w-20`}></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Loading state for Critical Low Items */}
          <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow p-6`}>
            <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'} mb-4`}>Critical Low Items</h2>
            <div className="overflow-x-auto">
              <div className="animate-pulse">
                <div className={`h-10 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'} rounded mb-4`}></div>
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`h-12 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'} rounded mb-2`}></div>
                ))}
              </div>
            </div>
          </div>

          {/* Loading state for Low Stock Items */}
          <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow p-6`}>
            <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'} mb-4`}>Low Stock Items</h2>
            <div className="overflow-x-auto">
              <div className="animate-pulse">
                <div className={`h-10 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'} rounded mb-4`}></div>
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`h-12 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'} rounded mb-2`}></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InboundDashboard; 