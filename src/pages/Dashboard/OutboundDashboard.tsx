import React, { useState, useEffect } from 'react';
import { ShoppingCart, Package, Truck, AlertCircle, Loader2 } from 'lucide-react';
import { collection, query, getDocs, Timestamp, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import StatsCard from '../../components/dashboard/StatsCard';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';
import { useTheme } from '../../contexts/ThemeContext';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  status: 'pending' | 'shipped' | 'returned' | 'cancelled';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  items: Array<{
    productId: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
  shippedTime?: Timestamp | Date | null;
}

const OutboundDashboard: React.FC = () => {
  const { isDarkMode } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    ordersReceivedToday: 0,
    returnedOrdersToday: 0,
    shippedOrdersToday: 0,
    totalOrders: 0,
    ordersReceivedYesterday: 0,
    returnedOrdersYesterday: 0,
    shippedOrdersYesterday: 0
  });
  const [todayOrders, setTodayOrders] = useState<Order[]>([]);
  const [returnedOrders, setReturnedOrders] = useState<Order[]>([]);
  const [shippedOrders, setShippedOrders] = useState<Order[]>([]);

  useEffect(() => {
    const fetchOrderStats = async () => {
      setIsLoading(true);
      try {
        const today = new Date();
        const yesterday = subDays(today, 1);
        const startOfToday = startOfDay(today);
        const endOfToday = endOfDay(today);
        const startOfYesterday = startOfDay(yesterday);
        const endOfYesterday = endOfDay(yesterday);

        // Get all orders
        const ordersQuery = query(collection(db, 'orders'));
        const ordersSnapshot = await getDocs(ordersQuery);
        const totalOrders = ordersSnapshot.size;

        // Get today's orders
        const todayOrdersQuery = query(
          collection(db, 'orders'),
          where('createdAt', '>=', Timestamp.fromDate(startOfToday)),
          where('createdAt', '<=', Timestamp.fromDate(endOfToday))
        );
        const todayOrdersSnapshot = await getDocs(todayOrdersQuery);
        const todayOrdersData = todayOrdersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Order[];

        // Get yesterday's orders
        const yesterdayOrdersQuery = query(
          collection(db, 'orders'),
          where('createdAt', '>=', Timestamp.fromDate(startOfYesterday)),
          where('createdAt', '<=', Timestamp.fromDate(endOfYesterday))
        );
        const yesterdayOrdersSnapshot = await getDocs(yesterdayOrdersQuery);
        const yesterdayOrders = yesterdayOrdersSnapshot.docs.map(doc => doc.data()) as Order[];

        // Calculate statistics
        const ordersReceivedToday = todayOrdersData.length;
        const returnedOrdersToday = todayOrdersData.filter(order => order.status === 'returned').length;
        const shippedOrdersToday = todayOrdersData.filter(order => order.status === 'shipped').length;

        const ordersReceivedYesterday = yesterdayOrders.length;
        const returnedOrdersYesterday = yesterdayOrders.filter(order => order.status === 'returned').length;
        const shippedOrdersYesterday = yesterdayOrders.filter(order => order.status === 'shipped').length;

        // Set orders for tables
        setTodayOrders(todayOrdersData);
        setReturnedOrders(todayOrdersData.filter(order => order.status === 'returned'));
        setShippedOrders(todayOrdersData.filter(order => order.status === 'shipped'));

        setStats({
          ordersReceivedToday,
          returnedOrdersToday,
          shippedOrdersToday,
          totalOrders,
          ordersReceivedYesterday,
          returnedOrdersYesterday,
          shippedOrdersYesterday
        });
      } catch (error) {
        console.error('Error fetching order stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrderStats();
  }, []);

  // Loading skeleton for StatsCard
  const StatsCardSkeleton = () => (
    <div className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-lg shadow-sm p-5`}>
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

  // Loading skeleton for table
  const TableSkeleton = () => (
    <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow p-6`}>
      <div className={`h-6 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'} rounded w-48 mb-4`}></div>
      <div className="space-y-3">
        <div className={`h-10 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'} rounded`}></div>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={`h-12 ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'} rounded`}></div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Outbound Dashboard</h1>
        <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mt-1`}>Track your outbound operations and order status</p>
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
              title="Orders Received Today" 
              value={stats.ordersReceivedToday}
              icon={<ShoppingCart size={24} className="text-blue-600" />}
              change={{ 
                value: stats.ordersReceivedYesterday,
                isPositive: stats.ordersReceivedToday >= stats.ordersReceivedYesterday,
                label: stats.ordersReceivedYesterday === 1 ? 'order yesterday' : 'orders yesterday'
              }}
        />
        <StatsCard 
              title="Returned Orders Today" 
              value={stats.returnedOrdersToday}
              icon={<AlertCircle size={24} className="text-blue-600" />}
              change={{ 
                value: stats.returnedOrdersYesterday,
                isPositive: stats.returnedOrdersToday <= stats.returnedOrdersYesterday,
                label: stats.returnedOrdersYesterday === 1 ? 'return yesterday' : 'returns yesterday'
              }}
        />
        <StatsCard 
              title="Shipped Orders Today" 
              value={stats.shippedOrdersToday}
              icon={<Truck size={24} className="text-blue-600" />}
              change={{ 
                value: stats.shippedOrdersYesterday,
                isPositive: stats.shippedOrdersToday >= stats.shippedOrdersYesterday,
                label: stats.shippedOrdersYesterday === 1 ? 'shipped yesterday' : 'shipped yesterday'
              }}
        />
        <StatsCard 
              title="Total Orders" 
              value={stats.totalOrders}
              icon={<Package size={24} className="text-blue-600" />}
              change={{ 
                value: stats.ordersReceivedYesterday,
                isPositive: true,
                label: stats.ordersReceivedYesterday === 1 ? 'order yesterday' : 'orders yesterday'
              }}
            />
          </>
        )}
      </div>

      {/* Today's Orders Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Orders */}
        {isLoading ? (
          <TableSkeleton />
        ) : (
          <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow p-6`}>
            <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'} mb-4`}>Today's Orders</h2>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <table className="min-w-full divide-y divide-slate-200">
                <thead className={isDarkMode ? 'bg-slate-700/50' : 'bg-slate-50'}>
                  <tr>
                    <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Order</th>
                    <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Customer</th>
                    <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Time</th>
              </tr>
            </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-slate-700' : 'divide-slate-200'}`}>
                  {todayOrders.map((order) => (
                    <tr key={order.id} className={`hover:${isDarkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                      <td className="px-4 py-3 text-sm text-blue-600 font-medium">{order.orderNumber}</td>
                      <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{order.customerName}</td>
                      <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                        {order.createdAt ? format(order.createdAt.toDate(), 'h:mm a') : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Returned Orders */}
        {isLoading ? (
          <TableSkeleton />
        ) : (
          <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow p-6`}>
            <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'} mb-4`}>Returned Orders</h2>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className={isDarkMode ? 'bg-slate-700/50' : 'bg-slate-50'}>
                  <tr>
                    <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Order</th>
                    <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Customer</th>
                    <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Time</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-slate-700' : 'divide-slate-200'}`}>
                  {returnedOrders.map((order) => (
                    <tr key={order.id} className={`hover:${isDarkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                      <td className="px-4 py-3 text-sm text-blue-600 font-medium">{order.orderNumber}</td>
                      <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{order.customerName}</td>
                      <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                        {order.createdAt ? format(order.createdAt.toDate(), 'h:mm a') : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Shipped Orders */}
        {isLoading ? (
          <TableSkeleton />
        ) : (
          <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-lg shadow p-6`}>
            <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'} mb-4`}>Shipped Orders</h2>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className={isDarkMode ? 'bg-slate-700/50' : 'bg-slate-50'}>
                  <tr>
                    <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Order</th>
                    <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Customer</th>
                    <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Time</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-slate-700' : 'divide-slate-200'}`}>
                  {shippedOrders.map((order) => (
                    <tr key={order.id} className={`hover:${isDarkMode ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                      <td className="px-4 py-3 text-sm text-blue-600 font-medium">{order.orderNumber}</td>
                      <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{order.customerName}</td>
                      <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                        {order.shippedTime ? format(order.shippedTime instanceof Timestamp ? order.shippedTime.toDate() : order.shippedTime, 'h:mm a') : (order.createdAt ? format(order.createdAt.toDate(), 'h:mm a') : 'N/A')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OutboundDashboard; 