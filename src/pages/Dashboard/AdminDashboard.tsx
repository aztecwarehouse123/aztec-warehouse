import React, { useState, useEffect } from 'react';
import { Package, PoundSterling, AlertCircle, Plus, TrendingDown, RefreshCw, BarChart3, BarChart, PackagePlus, Clock, ExternalLink, Briefcase } from 'lucide-react';
import StatsCard, { StatsCardSkeleton } from '../../components/dashboard/StatsCard';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { db } from '../../config/firebase';
import { collection, query, orderBy, limit, getDocs, Timestamp, where } from 'firebase/firestore';
import { subDays, formatDistanceToNow, startOfDay, endOfDay } from 'date-fns';
// import { Order } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { canSeePrices } from '../../utils/roleUtils';

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
  const [currentTime, setCurrentTime] = useState<{time: string, date: string}>({
    time: new Date().toLocaleTimeString(),
    date: new Date().toLocaleDateString()
  });
  const [inventoryData, setInventoryData] = useState<{
    stockByLocation: {location: string, quantity: number, value: number}[];
    stockByStore: {store: string, quantity: number, value: number}[];
  }>({
    stockByLocation: [],
    stockByStore: []
  });
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
  const { user } = useAuth();
  const navigate = useNavigate();



  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const endDate = new Date();
      // const startDate = subDays(endDate, 30); // Last 30 days
      const yesterdayStart = subDays(endDate, 1);
      const yesterdayEnd = endDate;

    

      // Fetch inventory changes
      const inventoryQuery = query(collection(db, 'inventory'));
      const yesterdayInventoryQuery = query(
        collection(db, 'inventory'),
        where('lastUpdated', '>=', Timestamp.fromDate(yesterdayStart)),
        where('lastUpdated', '<=', Timestamp.fromDate(yesterdayEnd))
      );

      const [inventorySnapshot, yesterdayInventorySnapshot] = await Promise.all([
       
        getDocs(inventoryQuery),
        getDocs(yesterdayInventoryQuery)
      ]);

      

      
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
        totalOrders: 0,
        totalStock,
        totalInventoryValue,
        todayDamagedProducts,
        yesterdayDamagedProducts,
        yesterdayOrders: 0,
        yesterdayStockChange,
        yesterdayRevenue: 0,
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


  const updateTime = () => {
    const now = new Date();
    setCurrentTime({
      time: now.toLocaleTimeString(),
      date: now.toLocaleDateString()
    });
  };

  const fetchInventoryData = async () => {
    try {
      // Fetch all inventory items
      const inventoryQuery = query(collection(db, 'inventory'));
      const inventorySnapshot = await getDocs(inventoryQuery);
      const inventoryItems = inventorySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];

      // Process stock by location
      const locationMap = new Map<string, {quantity: number, value: number}>();
      inventoryItems.forEach(item => {
        const location = item.locationCode || 'Unknown';
        const quantity = item.quantity || 0;
        const value = quantity * (item.price || 0);
        
        if (locationMap.has(location)) {
          const existing = locationMap.get(location)!;
          locationMap.set(location, {
            quantity: existing.quantity + quantity,
            value: existing.value + value
          });
        } else {
          locationMap.set(location, { quantity, value });
        }
      });

      const stockByLocation = Array.from(locationMap.entries()).map(([location, data]) => ({
        location,
        quantity: data.quantity,
        value: data.value
      })).sort((a, b) => b.quantity - a.quantity);

      // Process stock by store
      const storeMap = new Map<string, {quantity: number, value: number}>();
      inventoryItems.forEach(item => {
        const store = item.storeName || 'Unknown';
        const quantity = item.quantity || 0;
        const value = quantity * (item.price || 0);
        
        if (storeMap.has(store)) {
          const existing = storeMap.get(store)!;
          storeMap.set(store, {
            quantity: existing.quantity + quantity,
            value: existing.value + value
          });
        } else {
          storeMap.set(store, { quantity, value });
        }
      });

      const stockByStore = Array.from(storeMap.entries()).map(([store, data]) => ({
        store,
        quantity: data.quantity,
        value: data.value
      })).sort((a, b) => b.value - a.value);

      setInventoryData({
        stockByLocation,
        stockByStore
      });

    } catch (error) {
      console.error('Error fetching inventory data:', error);
    }
  };

  const refreshDashboard = async () => {
    await Promise.all([fetchStats(), fetchRecentActivities(), fetchInventoryData()]);
  };

  useEffect(() => {
    refreshDashboard();
    
    // Update time every second
    const timeInterval = setInterval(updateTime, 1000);
    
    return () => clearInterval(timeInterval);
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
        <div className="flex items-center gap-4">
          {/* Time Widget */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isDarkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-200'}`}>
            <Clock size={20} className="text-blue-500" />
            <div>
              <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                {currentTime.time}
              </p>
              <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                {currentTime.date}
              </p>
            </div>
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
      </div>
      
      {/* Quick Actions */}
      <Card title="Quick Actions" className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Button
            variant="outline"
            onClick={() => navigate('/add')}
            className={`flex flex-col items-center gap-2 p-4 h-20 ${isDarkMode ? 'hover:bg-slate-700 border-slate-600' : 'hover:bg-slate-100 border-slate-300'}`}
          >
            <PackagePlus size={24} className="text-blue-600" />
            <span className="text-sm font-medium">Add Product</span>
          </Button>
          
          <Button
            variant="outline"
            onClick={() => navigate('/jobs')}
            className={`flex flex-col items-center gap-2 p-4 h-20 ${isDarkMode ? 'hover:bg-slate-700 border-slate-600' : 'hover:bg-slate-100 border-slate-300'}`}
          >
            <Briefcase size={24} className="text-green-600" />
            <span className="text-sm font-medium">Manage Jobs</span>
          </Button>
          
          <Button
            variant="outline"
            onClick={() => navigate('/stock')}
            className={`flex flex-col items-center gap-2 p-4 h-20 ${isDarkMode ? 'hover:bg-slate-700 border-slate-600' : 'hover:bg-slate-100 border-slate-300'}`}
          >
            <Package size={24} className="text-purple-600" />
            <span className="text-sm font-medium">Manage Stock</span>
          </Button>
          
          <Button
            variant="outline"
            onClick={() => navigate('/reports-analytics')}
            className={`flex flex-col items-center gap-2 p-4 h-20 ${isDarkMode ? 'hover:bg-slate-700 border-slate-600' : 'hover:bg-slate-100 border-slate-300'}`}
          >
            <BarChart size={24} className="text-orange-600" />
            <span className="text-sm font-medium">View Reports</span>
          </Button>
          
          <Button
            variant="outline"
            onClick={() => navigate('/warehouse-locations')}
            className={`flex flex-col items-center gap-2 p-4 h-20 ${isDarkMode ? 'hover:bg-slate-700 border-slate-600' : 'hover:bg-slate-100 border-slate-300'}`}
          >
            <ExternalLink size={24} className="text-indigo-600" />
            <span className="text-sm font-medium">Locations</span>
          </Button>
          
          <Button
            variant="outline"
            onClick={() => navigate('/warehouse-operations')}
            className={`flex flex-col items-center gap-2 p-4 h-20 ${isDarkMode ? 'hover:bg-slate-700 border-slate-600' : 'hover:bg-slate-100 border-slate-300'}`}
          >
            <Clock size={24} className="text-teal-600" />
            <span className="text-sm font-medium">Activity Logs</span>
          </Button>
        </div>
      </Card>
      
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
        
        {canSeePrices(user) ? (
          <StatsCard 
                title="Total Inventory Value" 
                value={stats.totalInventoryValue}
                icon={<PoundSterling size={24} className="text-blue-600" />}
                formatValue={(value: number) => `£${value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                change={{ 
                  value: stats.todayInventoryValueAdditions,
                  isPositive: true,
                  customIcon: <Plus size={16} className="text-green-500 mr-1" />,
                  label: stats.todayInventoryValueAdditions === 0 ? 'no value added today' : 
                         `£ added today`
                }}
          />
        ) : (
          <StatsCard 
                title="Total Products" 
                value={inventoryData.stockByLocation.length}
                icon={<Package size={24} className="text-purple-600" />}
                change={{ 
                  value: stats.todayStockAdditions,
                  isPositive: true,
                  customIcon: <Plus size={16} className="text-green-500 mr-1" />,
                  label: stats.todayStockAdditions === 0 ? 'no additions today' : 
                         stats.todayStockAdditions === 1 ? 'addition today' : 'additions today'
                }}
          />
        )}
        
            
          </>
        )}
      </div>
      
      
      
      {/* Stock Value by Store - Horizontal Bar Chart */}
      <Card title="Stock Value by Store" className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className={`h-4 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'} rounded w-3/4`}></div>
            <div className={`h-32 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'} rounded`}></div>
          </div>
        ) : inventoryData.stockByStore.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={20} className="text-blue-500" />
              <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                {canSeePrices(user) ? (
                  <>Total Value: £{inventoryData.stockByStore.reduce((sum, store) => sum + store.value, 0).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} across {inventoryData.stockByStore.length} stores</>
                ) : (
                  <>Total Quantity: {inventoryData.stockByStore.reduce((sum, store) => sum + store.quantity, 0)} units across {inventoryData.stockByStore.length} stores</>
                )}
              </span>
            </div>
            
            <div className="space-y-3">
              {inventoryData.stockByStore.slice(0, 5).map((store, index) => {
                const maxValue = Math.max(...inventoryData.stockByStore.slice(0, 5).map(s => s.value));
                const percentage = maxValue > 0 ? (store.value / maxValue) * 100 : 0;
                const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'];
                
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        {store.store.toUpperCase()}
                      </span>
                      <div className="text-right">
                        <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {store.quantity.toLocaleString()} units
                        </span>
                        {canSeePrices(user) && (
                          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            £{store.value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className={`w-full ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'} rounded-full h-3`}>
                      <div
                        className={`h-3 rounded-full transition-all duration-700 ease-out ${colors[index % colors.length]}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className={`text-center py-8 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            <Package size={48} className="mx-auto mb-4 opacity-50" />
            <p>No store data available</p>
          </div>
        )}
      </Card>

      {/* Stock Distribution by Location - Full Width Bar Chart */}
      <Card title="Stock Distribution by Location" className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className={`h-4 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'} rounded w-3/4`}></div>
            <div className={`h-32 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'} rounded`}></div>
          </div>
        ) : inventoryData.stockByLocation.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={20} className="text-blue-500" />
              <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Total: {inventoryData.stockByLocation.reduce((sum, loc) => sum + loc.quantity, 0)} units across {inventoryData.stockByLocation.length} locations
              </span>
            </div>
            
            <div className="space-y-3">
              {inventoryData.stockByLocation.slice(0, 5).map((location, index) => {
                const maxQuantity = Math.max(...inventoryData.stockByLocation.slice(0, 5).map(l => l.quantity));
                const percentage = maxQuantity > 0 ? (location.quantity / maxQuantity) * 100 : 0;
                const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'];
                
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                        Location {location.location}
                      </span>
                      <div className="text-right">
                        <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {location.quantity} units
                        </span>
                        {canSeePrices(user) && (
                          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            £{location.value.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className={`w-full ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'} rounded-full h-3`}>
                      <div
                        className={`h-3 rounded-full transition-all duration-700 ease-out ${colors[index % colors.length]}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className={`text-center py-8 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            <Package size={48} className="mx-auto mb-4 opacity-50" />
            <p>No inventory data available</p>
          </div>
        )}
      </Card>
      
      
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

      {/* Low Stock Items */}
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

      
    </div>
  );
};

export default AdminDashboard; 