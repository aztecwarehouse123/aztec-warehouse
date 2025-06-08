import React, { useState, useEffect } from 'react';
import { Package, ShoppingCart, DollarSign, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import StatsCard, { StatsCardSkeleton } from '../../components/dashboard/StatsCard';
import Card from '../../components/ui/Card';
import { db } from '../../config/firebase';
import { collection, query, orderBy, limit, getDocs, Timestamp, where } from 'firebase/firestore';
import { subDays, formatDistanceToNow } from 'date-fns';
import { Order } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';

interface DashboardStats {
  totalOrders: number;
  totalStock: number;
  totalRevenue: number;
  returnRate: number;
  yesterdayOrders: number;
  yesterdayStockChange: number;
  yesterdayRevenue: number;
}

interface ActivityLog {
  id: string;
  user: string;
  role: string;
  detail: string;
  time: string;
}

interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
}

interface StockItem {
  id: string;
  name: string;
  quantity: number;
  locationCode: string;
  shelfNumber: string;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  totalAmount: number;
  createdAt: string;
}

interface StockLocation {
  id: string;
  name: string;
  quantity: number;
  locationCode: string;
  shelfNumber: string;
  lastUpdated: Date;
}

interface LocationSummary {
  locationCode: string;
  totalStock: number;
  products: StockLocation[];
}

const AdminDashboard: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<ActivityLog[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [criticalStockItems, setCriticalStockItems] = useState<StockItem[]>([]);
  const [lowStockItems, setLowStockItems] = useState<StockItem[]>([]);
  const [returnedOrders, setReturnedOrders] = useState<RecentOrder[]>([]);
  const [shippedOrders, setShippedOrders] = useState<RecentOrder[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    totalStock: 0,
    totalRevenue: 0,
    returnRate: 0,
    yesterdayOrders: 0,
    yesterdayStockChange: 0,
    yesterdayRevenue: 0
  });
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());
  const { showToast } = useToast();
  const { isDarkMode } = useTheme();

  const formatDate = (date: Date | string | { toDate: () => Date }): string => {
    try {
      const dateObj = date as { toDate?: () => Date };
      if (dateObj && typeof dateObj.toDate === 'function') {
        return dateObj.toDate().toISOString();
      }
      if (date instanceof Date) {
        return date.toISOString();
      }
      return new Date(date as string).toISOString();
    } catch (error) {
      console.error('Error formatting date:', error);
      return new Date().toISOString(); // fallback to current date
    }
  };

  useEffect(() => {
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

        // Calculate statistics
        const totalOrders = ordersData.length;
        const totalRevenue = ordersData.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
        const yesterdayRevenue = yesterdayOrdersData.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
        const returnedOrders = ordersData.filter(order => order.status === 'returned').length;
        const returnRate = totalOrders > 0 ? (returnedOrders / totalOrders) * 100 : 0;

        // Fetch and process stock items
        const stockQuery = query(collection(db, 'inventory'));
        const stockSnapshot = await getDocs(stockQuery);
        const stockItems = stockSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as StockItem[];

        // Separate critical and low stock items
        // Critical: quantity <= 5
        // Low: quantity > 5 and quantity <= 10
        const critical = stockItems.filter(item => item.quantity <= 5);
        const low = stockItems.filter(item => item.quantity > 5 && item.quantity <= 10);

        console.log('All stock items:', stockItems);
        console.log('Critical items:', critical);
        console.log('Low stock items:', low);

        setCriticalStockItems(critical);
        setLowStockItems(low);

        // Process returned orders
        const returned = ordersData
          .filter(order => order.status === 'returned')
          .map(order => ({
            id: order.id,
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            totalAmount: order.totalAmount,
            createdAt: formatDate(order.createdAt)
          }))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        // Process shipped orders
        const shipped = ordersData
          .filter(order => order.status === 'shipped')
          .map(order => ({
            id: order.id,
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            totalAmount: order.totalAmount,
            createdAt: formatDate(order.createdAt)
          }))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        setReturnedOrders(returned);
        setShippedOrders(shipped);

        setStats({
          totalOrders,
          totalStock,
          totalRevenue,
          returnRate,
          yesterdayOrders,
          yesterdayStockChange,
          yesterdayRevenue
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

    const fetchTopProducts = async () => {
      try {
        const ordersQuery = query(collection(db, 'orders'));
        const snapshot = await getDocs(ordersQuery);
        
        // Aggregate product data from all orders
        const productMap = new Map<string, { quantity: number; revenue: number }>();
        
        snapshot.docs.forEach(doc => {
          const order = doc.data() as Order;
          order.items.forEach(item => {
            const existing = productMap.get(item.productName) || { quantity: 0, revenue: 0 };
            // Calculate revenue by multiplying quantity with unit price
            const itemRevenue = item.quantity * item.unitPrice;
            productMap.set(item.productName, {
              quantity: existing.quantity + item.quantity,
              revenue: existing.revenue + itemRevenue
            });
          });
        });
        
        // Convert to array and sort by quantity
        const products = Array.from(productMap.entries())
          .map(([name, data]) => ({
            name,
            quantity: data.quantity,
            revenue: data.revenue
          }))
          .sort((a, b) => b.quantity - a.quantity)
          .slice(0, 5);
        
        setTopProducts(products);
      } catch (error) {
        console.error('Error fetching top products:', error);
      }
    };

    fetchStats();
    fetchRecentActivities();
    fetchTopProducts();
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

  const fetchLocations = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'inventory'), orderBy('locationCode'));
      const snapshot = await getDocs(q);
      const locationsData = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Raw inventory data:', data);
        return {
          id: doc.id,
          name: data.name || '',
          quantity: data.quantity || 0,
          locationCode: data.locationCode || '',
          shelfNumber: data.shelfNumber || '',
          lastUpdated: data.lastUpdated instanceof Timestamp ? data.lastUpdated.toDate() : new Date()
        } as StockLocation;
      });
      console.log('Processed locations:', locationsData);
      setLocations(locationsData);
    } catch (error) {
      console.error('Error fetching locations:', error);
      showToast('Failed to fetch locations. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const locationSummaries = locations.reduce((acc, location) => {
    if (!acc[location.locationCode]) {
      acc[location.locationCode] = {
        locationCode: location.locationCode,
        totalStock: 0,
        products: []
      };
    }
    acc[location.locationCode].totalStock += location.quantity;
    acc[location.locationCode].products.push(location);
    return acc;
  }, {} as Record<string, LocationSummary>);

  const toggleLocation = (locationCode: string) => {
    setExpandedLocations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(locationCode)) {
        newSet.delete(locationCode);
      } else {
        newSet.add(locationCode);
      }
      return newSet;
    });
  };

  return (
    <div className={`space-y-6 ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-800'}`}>
      <div>
        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Admin Dashboard</h1>
        <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mt-1`}>View your warehouse performance at a glance</p>
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
              title="Total Orders" 
              value={stats.totalOrders}
              icon={<ShoppingCart size={24} className="text-blue-600" />}
              change={{ 
                value: stats.yesterdayOrders,
                isPositive: stats.yesterdayOrders > 0,
                label: stats.yesterdayOrders === 1 ? 'order yesterday' : 'orders yesterday'
              }}
        />
        <StatsCard 
              title="Total Stock" 
              value={stats.totalStock}
              icon={<Package size={24} className="text-blue-600" />}
              change={{ 
                value: Math.abs(stats.yesterdayStockChange),
                isPositive: stats.yesterdayStockChange > 0,
                label: stats.yesterdayStockChange === 0 ? 'no change' : 
                       stats.yesterdayStockChange > 0 ? 'items added' : 'items removed'
              }}
        />
        <StatsCard 
              title="Total Revenue" 
              value={`$${stats.totalRevenue.toFixed(2)}`}
              icon={<DollarSign size={24} className="text-blue-600" />}
              change={{ 
                value: Math.abs(stats.yesterdayRevenue),
                isPositive: stats.yesterdayRevenue > 0,
                label: stats.yesterdayRevenue === 0 ? 'no change' : 
                       stats.yesterdayRevenue > 0 ? 'revenue yesterday' : 'revenue yesterday'
              }}
        />
        <StatsCard 
              title="Return Rate" 
              value={`${stats.returnRate.toFixed(1)}%`}
              icon={<AlertCircle size={24} className="text-blue-600" />}
              change={{ 
                value: 0,
                isPositive: false,
                label: 'based on total orders'
              }}
            />
          </>
        )}
      </div>
      
      {/* Top Products and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card title="Recent Activity" className={`h-[400px] overflow-hidden ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          {isLoading ? (
            <TableSkeleton />
          ) : recentActivities.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} border-b`}>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider`}>Activity</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider`}>Time</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-slate-700' : 'divide-slate-200'}`}>
                  {recentActivities.map((activity) => (
                    <tr key={activity.id} className={`${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-50'}`}>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                        {activity.detail}
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
      </div>

      {/* Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Critical Stock Items */}
        <Card title="Critical Stock Items" className={`h-[400px] overflow-hidden ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
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
                  {criticalStockItems.map((item) => (
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
        </Card>
      </div>

      {/* Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Returned Orders */}
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
        </Card>

        {/* Shipped Orders */}
        <Card title="Recent Shipped Orders" className={`h-[400px] overflow-hidden ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
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
        </Card>
      </div>

      {/* Warehouse Locations Section */}
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
                          {summary.products.length} Products
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
    </div>
  );
};

export default AdminDashboard; 