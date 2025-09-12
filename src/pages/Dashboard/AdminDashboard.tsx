import React, { useState, useEffect } from 'react';
import { Package, PoundSterling, AlertCircle, Plus, TrendingDown, RefreshCw } from 'lucide-react';
import StatsCard, { StatsCardSkeleton } from '../../components/dashboard/StatsCard';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { db } from '../../config/firebase';
import { collection, query, orderBy, limit, getDocs, Timestamp, where } from 'firebase/firestore';
import { subDays, formatDistanceToNow, startOfDay, endOfDay } from 'date-fns';
// import { Order } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';

interface DashboardStats {
  totalOrders: number;
  totalStock: number;
  totalInventoryValue: number;
  todayDamagedProducts: number;
  yesterdayDamagedProducts: number;
  yesterdayOrders: number;
  yesterdayStockChange: number;
  yesterdayRevenue: number;
  totalDeductions: number;
  yesterdayDeductions: number;
  todayStockAdditions: number;
  todayInventoryValueAdditions: number;
}

interface ActivityLog {
  id: string;
  user: string;
  role: string;
  detail: string;
  time: string;
}

interface StockItem {
  id: string;
  name: string;
  quantity: number;
  locationCode: string;
  shelfNumber: string;
}


const AdminDashboard: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<ActivityLog[]>([]);
  const [criticalStockItems, setCriticalStockItems] = useState<StockItem[]>([]);
  const [lowStockItems, setLowStockItems] = useState<StockItem[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    totalStock: 0,
    totalInventoryValue: 0,
    todayDamagedProducts: 0,
    yesterdayDamagedProducts: 0,
    yesterdayOrders: 0,
    yesterdayStockChange: 0,
    yesterdayRevenue: 0,
    totalDeductions: 0,
    yesterdayDeductions: 0,
    todayStockAdditions: 0,
    todayInventoryValueAdditions: 0
  });
  
  const { isDarkMode } = useTheme();



  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const endDate = new Date();
      const startDate = subDays(endDate, 30); // Last 30 days
      const yesterdayStart = subDays(endDate, 1);
      const yesterdayEnd = endDate;

      // Fetch orders for last 30 days
      const ordersQuery = query(
        collection(db, 'orders'),
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        where('createdAt', '<=', Timestamp.fromDate(endDate))
      );

      // Fetch yesterday's orders
      const yesterdayOrdersQuery = query(
        collection(db, 'orders'),
        where('createdAt', '>=', Timestamp.fromDate(yesterdayStart)),
        where('createdAt', '<=', Timestamp.fromDate(yesterdayEnd))
      );

      // Fetch inventory changes
      const inventoryQuery = query(collection(db, 'inventory'));
      const yesterdayInventoryQuery = query(
        collection(db, 'inventory'),
        where('lastUpdated', '>=', Timestamp.fromDate(yesterdayStart)),
        where('lastUpdated', '<=', Timestamp.fromDate(yesterdayEnd))
      );

      const [ordersSnapshot, yesterdayOrdersSnapshot, inventorySnapshot, yesterdayInventorySnapshot] = await Promise.all([
        getDocs(ordersQuery),
        getDocs(yesterdayOrdersQuery),
        getDocs(inventoryQuery),
        getDocs(yesterdayInventoryQuery)
      ]);

      const ordersData = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];

      const yesterdayOrdersData = yesterdayOrdersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];

      const yesterdayOrders = yesterdayOrdersSnapshot.docs.length;

      // Calculate total stock
      const totalStock = inventorySnapshot.docs.reduce((sum, doc) => {
        const data = doc.data();
        return sum + (data.quantity || 0);
      }, 0);

      // Calculate yesterday's stock changes
      const yesterdayStockChange = yesterdayInventorySnapshot.docs.reduce((sum, doc) => {
        const data = doc.data();
        return sum + (data.quantityChange || 0);
      }, 0);

      // Calculate total inventory value
      const totalInventoryValue = inventorySnapshot.docs.reduce((sum, doc) => {
        const data = doc.data();
        return sum + ((data.quantity || 0) * (data.price || 0));
      }, 0);

      // Calculate statistics
      const totalOrders = ordersData.length;
      //const totalRevenue = ordersData.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      const yesterdayRevenue = yesterdayOrdersData.reduce((sum, order) => sum + (order.totalAmount || 0), 0);


      // Fetch and process stock items
      const stockQuery = query(collection(db, 'inventory'));
      const stockSnapshot = await getDocs(stockQuery);
      const stockItems = stockSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as StockItem[];

      // Separate critical and low stock items
      // Critical: quantity <= 10
      // Low: quantity > 10 && quantity <= 25
      const critical = stockItems.filter(item => item.quantity <= 10);
      const low = stockItems.filter(item => 
        item.quantity > 10 && 
        item.quantity <= 25
      );


      setCriticalStockItems(critical);
      setLowStockItems(low);

      // Calculate total deductions from today's activity logs
      const today = new Date();
      const startOfToday = startOfDay(today);
      const endOfToday = endOfDay(today);
      const startOfYesterday = startOfDay(subDays(today, 1));
      const endOfYesterday = endOfDay(subDays(today, 1));
      
      // Fetch today's logs
      const todayLogsQuery = query(
        collection(db, 'activityLogs'),
        where('time', '>=', startOfToday.toISOString()),
        where('time', '<=', endOfToday.toISOString())
      );
      
      // Fetch yesterday's logs
      const yesterdayLogsQuery = query(
        collection(db, 'activityLogs'),
        where('time', '>=', startOfYesterday.toISOString()),
        where('time', '<=', endOfYesterday.toISOString())
      );
      
      const [todayLogsSnapshot, yesterdayLogsSnapshot] = await Promise.all([
        getDocs(todayLogsQuery),
        getDocs(yesterdayLogsQuery)
      ]);
      
      const todayLogs = todayLogsSnapshot.docs.map(doc => doc.data());
      const yesterdayLogs = yesterdayLogsSnapshot.docs.map(doc => doc.data());
      
      const totalDeductions = todayLogs.reduce((sum, log) => {
        const match = log.detail.match(/(\d+) units deducted/);
        return sum + (match ? parseInt(match[1]) : 0);
      }, 0);

      const yesterdayDeductions = yesterdayLogs.reduce((sum, log) => {
        const match = log.detail.match(/(\d+) units deducted/);
        return sum + (match ? parseInt(match[1]) : 0);
      }, 0);

      // Calculate today's stock additions and their value
      const todayStockAdditions = todayLogs.reduce((sum, log) => {
        const match = log.detail.match(/added new product "[^"]+" with total quantity (\d+)/);
        return sum + (match ? parseInt(match[1]) : 0);
      }, 0);

      // Calculate today's inventory value additions
      const todayInventoryValueAdditions = todayLogs.reduce((sum, log) => {
        const match = log.detail.match(/added new product "([^"]+)" with total quantity (\d+)/);
        if (match) {
          const [, productName, quantity] = match;
          // Find the product in inventory to get its price
          const product = inventorySnapshot.docs.find(doc => doc.data().name === productName);
          if (product) {
            const price = product.data().price || 0;
            return sum + (parseInt(quantity) * price);
          }
        }
        return sum;
      }, 0);

      // Calculate today's damaged products
      const todayDamagedProducts = todayLogs.reduce((sum, log) => {
        const detail = log.detail.toLowerCase();
        // Check for various damage-related patterns
        if (/reason:\s*damaged/i.test(detail) || 
            /damaged/i.test(detail) || 
            /damageditems/i.test(detail) || 
            /damaged items/i.test(detail)) {
          
          // Try to extract units damaged from various patterns
          const patterns = [
            /(\d+)\s*units?\s*damaged/i,
            /damageditems?:\s*(\d+)/i,
            /quantity:\s*(\d+)/i,
            /edited product "[^"]+": quantity from (\d+) to (\d+)/i
          ];
          
          for (const pattern of patterns) {
            const match = detail.match(pattern);
              if (match) {
                if (match.length === 3) {
                // For "from X to Y" pattern, calculate the absolute difference
                  const fromValue = parseInt(match[1]);
                  const toValue = parseInt(match[2]);
                return sum + Math.abs(fromValue - toValue);
                } else {
                return sum + parseInt(match[1]);
              }
            }
          }
          
          // If no specific number found, count as 1 incident
          return sum + 1;
        }
        return sum;
      }, 0);

      // Calculate yesterday's damaged products
      const yesterdayDamagedProducts = yesterdayLogs.reduce((sum, log) => {
        const detail = log.detail.toLowerCase();
        // Check for various damage-related patterns
        if (/reason:\s*damaged/i.test(detail) || 
            /damaged/i.test(detail) || 
            /damageditems/i.test(detail) || 
            /damaged items/i.test(detail)) {
          
          // Try to extract units damaged from various patterns
          const patterns = [
            /(\d+)\s*units?\s*damaged/i,
            /damageditems?:\s*(\d+)/i,
            /quantity:\s*(\d+)/i,
            /edited product "[^"]+": quantity from (\d+) to (\d+)/i
          ];
          
          for (const pattern of patterns) {
            const match = detail.match(pattern);
              if (match) {
                if (match.length === 3) {
                // For "from X to Y" pattern, calculate the absolute difference
                  const fromValue = parseInt(match[1]);
                  const toValue = parseInt(match[2]);
                return sum + Math.abs(fromValue - toValue);
                } else {
                return sum + parseInt(match[1]);
              }
            }
          }
          
          // If no specific number found, count as 1 incident
          return sum + 1;
        }
        return sum;
      }, 0);

      setStats({
        totalOrders,
        totalStock,
        totalInventoryValue,
        todayDamagedProducts,
        yesterdayDamagedProducts,
        yesterdayOrders,
        yesterdayStockChange,
        yesterdayRevenue,
        totalDeductions,
        yesterdayDeductions,
        todayStockAdditions,
        todayInventoryValueAdditions
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecentActivities = async () => {
    try {
      const activitiesQuery = query(
        collection(db, 'activityLogs'),
        orderBy('time', 'desc'),
        limit(5)
      );
      
      const snapshot = await getDocs(activitiesQuery);
      const activities = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ActivityLog[];
      
      setRecentActivities(activities);
    } catch (error) {
      console.error('Error fetching recent activities:', error);
    }
  };

  const refreshDashboard = async () => {
    await Promise.all([fetchStats(), fetchRecentActivities()]);
  };

  useEffect(() => {
    refreshDashboard();
  }, []);

  // Loading skeleton for table rows
  const TableSkeleton = () => {
    const { isDarkMode } = useTheme();
    return (
      <div className="animate-pulse">
        <div className={`h-10 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'} rounded mb-4`}></div>
        {[...Array(5)].map((_, index) => (
          <div key={index} className={`h-16 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'} rounded mb-2`}></div>
        ))}
      </div>
    );
  };
  

  return (
    <div className={`space-y-6 ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-800'}`}>
      <div className="flex justify-between items-center">
        <div>
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Admin Dashboard</h1>
          <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mt-1`}>View your warehouse performance at a glance</p>
        </div>
        <Button
          variant="secondary"
          onClick={refreshDashboard}
          className={`flex items-center gap-2 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={isLoading}
        >
          <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
        </Button>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isLoading ? (
          <>
            {/*<StatsCardSkeleton />*/}
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </>
        ) : (
          <>
            {/*<StatsCard 
              title="Total Orders" 
              value={stats.totalOrders}
              icon={<ShoppingCart size={24} className="text-blue-600" />}
              change={{ 
                value: stats.yesterdayOrders,
                isPositive: stats.yesterdayOrders > 0,
                label: stats.yesterdayOrders === 1 ? 'order yesterday' : 'orders yesterday'
              }}
            />*/}
            <StatsCard 
              title="Total Stock" 
              value={stats.totalStock}
              icon={<Package size={24} className="text-blue-600" />}
              change={{ 
                value: stats.todayStockAdditions,
                isPositive: true,
                customIcon: <Plus size={16} className="text-green-500 mr-1" />,
                label: stats.todayStockAdditions === 0 ? 'no additions today' : 
                       stats.todayStockAdditions === 1 ? 'unit added today' : 'units added today'
              }}
        />
        <StatsCard 
              title="Total Units Deducted Today" 
              value={stats.totalDeductions}
              icon={<TrendingDown size={24} className="text-blue-600" />}
              change={{ 
                value: stats.yesterdayDeductions,
                isPositive: stats.totalDeductions >= stats.yesterdayDeductions,
                label: stats.yesterdayDeductions === 1 ? 'unit deducted yesterday' : 'units deducted yesterday'
              }}
        />
        <StatsCard 
              title="Damaged Products Today" 
              value={stats.todayDamagedProducts}
              icon={<AlertCircle size={24} className="text-red-600" />}
              change={{ 
                value: stats.yesterdayDamagedProducts,
                isPositive: stats.todayDamagedProducts <= stats.yesterdayDamagedProducts,
                label: stats.yesterdayDamagedProducts === 0 ? 'no damage yesterday' : 
                       stats.yesterdayDamagedProducts === 1 ? 'unit damaged yesterday' : 'units damaged yesterday'
              }}
            />
        
        <StatsCard 
              title="Total Inventory Value" 
              value={stats.totalInventoryValue}
              icon={<PoundSterling size={24} className="text-blue-600" />}
              animateValue={true}
              formatValue={(value) => `£${value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              change={{ 
                value: stats.todayInventoryValueAdditions,
                isPositive: true,
                customIcon: <Plus size={16} className="text-green-500 mr-1" />,
                label: stats.todayInventoryValueAdditions === 0 ? 'no value added today' : 
                       `£ added today`
              }}
        />
        
            
          </>
        )}
      </div>
      
      {/* Top Products and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card title="Recent Activity" className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          {isLoading ? (
            <TableSkeleton />
          ) : recentActivities.length > 0 ? (
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
                  {recentActivities.slice(0, 5).map((activity) => (
                    <tr key={activity.id} className={`${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {activity.user}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {activity.role}
                      </td>
                      <td className={`px-6 py-4 text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        <div className="max-w-xs truncate" title={activity.detail}>
                          {activity.detail}
                        </div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {formatDistanceToNow(new Date(activity.time), { addSuffix: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={`text-center py-8 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              No recent activities found
            </div>
          )}
        </Card>
        
        {/* Top Products */}
        {/*
        <Card title="Top Selling Products" className={`h-[400px] overflow-hidden ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          {isLoading ? (
            <TableSkeleton />
          ) : topProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} border-b`}>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider`}>Product</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider`}>Quantity Sold</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider`}>Revenue</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-slate-700' : 'divide-slate-200'}`}>
            {topProducts.map((product, index) => (
                    <tr key={index} className={`${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {product.name}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {product.quantity}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        ${product.revenue.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={`text-center py-8 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              No product data available
            </div>
          )}
        </Card>
        */}
        <Card title="Low Stock Items" className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          {isLoading ? (
            <TableSkeleton />
          ) : lowStockItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} border-b`}>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider`}>Product</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider`}>Location</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider`}>Current Stock</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider`}>Status</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-slate-700' : 'divide-slate-200'}`}>
                  {lowStockItems.slice(0, 5).map((item) => (
                    <tr key={item.id} className={`${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}>
                      <td className={`px-6 py-4 text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        <div className="max-w-xs truncate" title={item.name}>
                          {item.name}
                        </div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {item.locationCode}-{item.shelfNumber}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-amber-100 text-amber-800">
                          Low
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={`text-center py-8 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              No low stock items found
            </div>
          )}
        </Card>
      </div>

      {/* Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Critical Stock Items */}
        <Card title="Critical Stock Items" className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          {isLoading ? (
            <TableSkeleton />
          ) : criticalStockItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} border-b`}>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider`}>Product</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider`}>Location</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider`}>Current Stock</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider`}>Status</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-slate-700' : 'divide-slate-200'}`}>
                  {criticalStockItems.slice(0, 5).map((item) => (
                    <tr key={item.id} className={`${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}>
                      <td className={`px-6 py-4 text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        <div className="max-w-xs truncate" title={item.name}>
                          {item.name}
                        </div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {item.locationCode}-{item.shelfNumber}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          Critical
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={`text-center py-8 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              No critical stock items found
            </div>
          )}
        </Card>
        
        {/* Low Stock Items */}
        {/*}
        <Card title="Low Stock Items" className={`h-[400px] overflow-hidden ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          {isLoading ? (
            <TableSkeleton />
          ) : lowStockItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} border-b`}>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider`}>Product</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider`}>Location</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider`}>Current Stock</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider`}>Status</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-slate-700' : 'divide-slate-200'}`}>
                  {lowStockItems.map((item) => (
                    <tr key={item.id} className={`${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {item.name}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {item.locationCode}-{item.shelfNumber}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-amber-100 text-amber-800">
                          Low
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={`text-center py-8 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              No low stock items found
            </div>
          )}
        </Card> */}
      </div>

      {/* Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Returned Orders */}
        {/*}
        <Card title="Recent Returned Orders" className={`h-[400px] overflow-hidden ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          {isLoading ? (
            <TableSkeleton />
          ) : returnedOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} border-b`}>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider`}>Order #</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider`}>Customer</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider`}>Amount</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider`}>Date</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-slate-700' : 'divide-slate-200'}`}>
                  {returnedOrders.slice(0, 5).map((order) => (
                    <tr key={order.id} className={`${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {order.orderNumber}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {order.customerName}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        ${order.totalAmount.toFixed(2)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={`text-center py-8 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              No returned orders found
            </div>
          )}
        </Card>*/}

        {/* Shipped Orders */}
        {/*<Card title="Recent Shipped Orders" className={`h-[400px] overflow-hidden ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          {isLoading ? (
            <TableSkeleton />
          ) : shippedOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} border-b`}>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider`}>Order #</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider`}>Customer</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider`}>Amount</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider`}>Date</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-slate-700' : 'divide-slate-200'}`}>
                  {shippedOrders.slice(0, 5).map((order) => (
                    <tr key={order.id} className={`${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {order.orderNumber}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {order.customerName}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        ${order.totalAmount.toFixed(2)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={`text-center py-8 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              No shipped orders found
          </div>
          )}
        </Card>*/}
      </div>

      {/* Warehouse Locations Section */}
      {/* 
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Warehouse Locations</h2>
            <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mt-1`}>View and manage your warehouse storage locations</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${isDarkMode ? 'border-white' : 'border-slate-800'}`}></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.values(locationSummaries).map(summary => {
              const isExpanded = expandedLocations.has(summary.locationCode);

              return (
                <div 
                  key={summary.locationCode} 
                  className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} 
                    rounded-lg shadow-sm border transition-all duration-200 ease-in-out
                    hover:shadow-md ${isExpanded ? 'ring-2 ring-blue-500' : ''}`}
                >
                  <div 
                    className={`p-4 border-b ${isDarkMode ? 'border-slate-700 hover:bg-slate-700/50' : 'border-slate-200 hover:bg-slate-100'} 
                      cursor-pointer transition-colors duration-200`}
                    onClick={() => toggleLocation(summary.locationCode)}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                          <Package className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                        </div>
                        <h3 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                          Location {summary.locationCode}
                        </h3>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} transition-transform duration-200`} />
                      ) : (
                        <ChevronDown className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} transition-transform duration-200`} />
                      )}
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total Stock</p>
                          <p className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                            {summary.totalStock} units
                          </p>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium
                          ${summary.totalStock > 0 
                            ? isDarkMode 
                              ? 'bg-green-900/50 text-green-400' 
                              : 'bg-green-100 text-green-800'
                            : isDarkMode
                              ? 'bg-slate-700 text-slate-400'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {summary.products.length} {summary.products.length === 1 ? 'product' : 'products'}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="p-4 space-y-4 overflow-hidden transition-all duration-300 ease-in-out">
                      <h4 className={`font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        Products in this location:
                      </h4>
                      <div className="space-y-4">
                        {summary.products.map(location => {
                          const percentageOfTotal = summary.totalStock === 0 ? 0 : (location.quantity / summary.totalStock) * 100;

                          return (
                            <div key={location.id} className="space-y-2">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                    {location.name}
                                  </h4>
                                  <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    Shelf {location.shelfNumber}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                    {location.quantity} units
                                  </p>
                                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                    {percentageOfTotal.toFixed(1)}% of total
                                  </p>
                                </div>
                              </div>
                              <div className={`w-full ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'} rounded-full h-2`}>
                                <div
                                  className={`h-2 rounded-full transition-all duration-300 ease-in-out
                                    ${percentageOfTotal > 75 ? 'bg-green-500' : 
                                      percentageOfTotal > 25 ? 'bg-blue-500' : 'bg-orange-500'}`}
                                  style={{ width: `${percentageOfTotal}%` }}
                                  title={`${location.quantity} out of ${summary.totalStock} units (${percentageOfTotal.toFixed(1)}%)`}
                                ></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
      */}
    </div>
  );
};

export default AdminDashboard; 