import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { format, subDays } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Download } from 'lucide-react';
import Select from '../../components/ui/Select';
import { Order, OrderStatus } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const ReportsAnalytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { isDarkMode } = useTheme();

  // Fetch orders and inventory based on date range
  const fetchData = async () => {
    setIsLoading(true);
    try {
      let startDate: Date;
      const endDate = new Date();

      switch (dateRange) {
        case '7d':
          startDate = subDays(endDate, 7);
          break;
        case '30d':
          startDate = subDays(endDate, 30);
          break;
        case '90d':
          startDate = subDays(endDate, 90);
          break;
        default:
          startDate = subDays(endDate, 7);
      }

      // Fetch orders
      const ordersQuery = query(
        collection(db, 'orders'),
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        where('createdAt', '<=', Timestamp.fromDate(endDate))
      );

      const ordersSnapshot = await getDocs(ordersQuery);
      const ordersData = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        shippedTime: doc.data().shippedTime?.toDate()
      })) as Order[];

      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  // Prepare data for charts
  const getOrderTrendData = () => {
    const data: { date: string; orders: number; revenue: number }[] = [];
    const groupedOrders = new Map<string, Order[]>();

    orders.forEach(order => {
      let dateKey: string;
      const orderDate = order.createdAt;

      switch (timeRange) {
        case 'daily':
          dateKey = format(orderDate, 'MMM dd');
          break;
        case 'weekly':
          dateKey = format(orderDate, "'Week' w");
          break;
        case 'monthly':
          dateKey = format(orderDate, 'MMM yyyy');
          break;
      }

      if (!groupedOrders.has(dateKey)) {
        groupedOrders.set(dateKey, []);
      }
      groupedOrders.get(dateKey)?.push(order);
    });

    groupedOrders.forEach((orders, date) => {
      data.push({
        date,
        orders: orders.length,
        revenue: orders.reduce((sum, order) => sum + order.totalAmount, 0)
      });
    });

    return data.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });
  };

  const getProductRevenueData = () => {
    const productRevenue = new Map<string, number>();

    orders.forEach(order => {
      order.items.forEach(item => {
        const currentRevenue = productRevenue.get(item.productName) || 0;
        productRevenue.set(item.productName, currentRevenue + (item.quantity * item.unitPrice));
      });
    });

    return Array.from(productRevenue.entries()).map(([name, revenue]) => ({
      name,
      value: revenue
    }));
  };

  // Export functions
  const exportToCSV = () => {
    const headers = ['Date', 'Order Number', 'Customer', 'Status', 'Total Amount', 'Items'];
    const csvData = orders.map(order => [
      format(order.createdAt, 'yyyy-MM-dd HH:mm:ss'),
      order.orderNumber,
      order.customerName,
      order.status,
      order.totalAmount,
      order.items.map(item => `${item.productName} (${item.quantity})`).join(', ')
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `orders-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    // TODO: Implement PDF export using a library like jsPDF
    console.log('PDF export to be implemented');
  };

  return (
    <div className="p-6 space-y-6">
      <style>
        {`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(1rem);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fade-in-up {
            animation: fadeInUp 0.5s ease-out forwards;
          }
        `}
      </style>
      <div className="flex justify-between items-center">
        <h1 className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Reports and Analytics</h1>
        <div className="flex gap-2">
          <button
            onClick={exportToCSV}
            className={`inline-flex items-center px-3 py-2 border shadow-sm text-sm leading-4 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 animate-fade-in-up ${
              isDarkMode 
                ? 'border-slate-600 text-slate-200 bg-slate-700 hover:bg-slate-600' 
                : 'border-slate-300 text-slate-700 bg-white hover:bg-slate-50'
            }`}
            style={{ animationDelay: '200ms' }}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </button>
          <button
            onClick={exportToPDF}
            className={`inline-flex items-center px-3 py-2 border shadow-sm text-sm leading-4 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 animate-fade-in-up ${
              isDarkMode 
                ? 'border-slate-600 text-slate-200 bg-slate-700 hover:bg-slate-600' 
                : 'border-slate-300 text-slate-700 bg-white hover:bg-slate-50'
            }`}
            style={{ animationDelay: '400ms' }}
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        <Select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value as 'daily' | 'weekly' | 'monthly')}
          options={[
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
            { value: 'monthly', label: 'Monthly' }
          ]}
          className="animate-fade-in-up"
          style={{ animationDelay: '100ms' }}
        />
        <Select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as '7d' | '30d' | '90d')}
          options={[
            { value: '7d', label: 'Last 7 Days' },
            { value: '30d', label: 'Last 30 Days' },
            { value: '90d', label: 'Last 90 Days' }
          ]}
          className="animate-fade-in-up"
          style={{ animationDelay: '300ms' }}
        />
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${isDarkMode ? 'border-white' : 'border-slate-800'}`}></div>
        </div>
      ) : (
        <>
          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Order Trends */}
            <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} p-4 rounded-lg shadow-sm`}>
              <h3 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-slate-800'} mb-4`}>Order Trends</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={getOrderTrendData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
                    <XAxis dataKey="date" stroke={isDarkMode ? '#94a3b8' : '#64748b'} />
                    <YAxis yAxisId="left" stroke={isDarkMode ? '#94a3b8' : '#64748b'} />
                    <YAxis yAxisId="right" orientation="right" stroke={isDarkMode ? '#94a3b8' : '#64748b'} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                        border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
                        color: isDarkMode ? '#e2e8f0' : '#1e293b'
                      }}
                    />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="orders" stroke="#8884d8" name="Orders" />
                    <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#82ca9d" name="Revenue" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Product Revenue */}
            <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} p-4 rounded-lg shadow-sm`}>
              <h3 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-slate-800'} mb-4`}>Revenue by Product</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={getProductRevenueData()}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {getProductRevenueData().map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                        border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
                        color: isDarkMode ? '#e2e8f0' : '#1e293b'
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Sales Chart */}
            <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} p-4 rounded-lg shadow-sm`}>
              <h3 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-slate-800'} mb-4`}>Sales Overview</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getOrderTrendData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
                    <XAxis dataKey="date" stroke={isDarkMode ? '#94a3b8' : '#64748b'} />
                    <YAxis stroke={isDarkMode ? '#94a3b8' : '#64748b'} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                        border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
                        color: isDarkMode ? '#e2e8f0' : '#1e293b'
                      }}
                    />
                    <Legend />
                    <Bar dataKey="revenue" fill="#8884d8" name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Order Status Distribution */}
            <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} p-4 rounded-lg shadow-sm`}>
              <h3 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-slate-800'} mb-4`}>Order Status Distribution</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={Object.entries(
                        orders.reduce((acc, order) => {
                          acc[order.status] = (acc[order.status] || 0) + 1;
                          return acc;
                        }, {} as Record<OrderStatus, number>)
                      ).map(([status, count]) => ({ name: status, value: count }))}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {Object.keys(orders.reduce((acc, order) => {
                        acc[order.status] = (acc[order.status] || 0) + 1;
                        return acc;
                      }, {} as Record<OrderStatus, number>)).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                        border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
                        color: isDarkMode ? '#e2e8f0' : '#1e293b'
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportsAnalytics; 