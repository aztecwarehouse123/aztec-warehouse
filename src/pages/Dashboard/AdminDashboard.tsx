import React from 'react';
import { Package, ShoppingCart, DollarSign, Users } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { stockItems, topProducts, salesData, activityLogs } from '../../utils/mockData';
import StatsCard from '../../components/dashboard/StatsCard';
import Card from '../../components/ui/Card';
import TopProductCard from '../../components/dashboard/TopProductCard';
import ActivityItem from '../../components/dashboard/ActivityItem';

const AdminDashboard: React.FC = () => {
  // Calculate stats
  const totalStock = stockItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalStockValue = stockItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const totalOrders = 12; // Hardcoded for demo purposes
  const totalCustomers = 8; // Hardcoded for demo purposes

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Admin Dashboard</h1>
        <p className="text-slate-500 mt-1">View your warehouse performance at a glance</p>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          title="Total Products" 
          value={totalStock}
          icon={<Package size={24} />}
          change={{ value: 12, isPositive: true }}
        />
        <StatsCard 
          title="Total Orders" 
          value={totalOrders}
          icon={<ShoppingCart size={24} />}
          change={{ value: 5, isPositive: true }}
        />
        <StatsCard 
          title="Inventory Value" 
          value={`$${totalStockValue.toLocaleString()}`}
          icon={<DollarSign size={24} />}
          change={{ value: 8, isPositive: true }}
        />
        <StatsCard 
          title="Customers" 
          value={totalCustomers}
          icon={<Users size={24} />}
          change={{ value: 3, isPositive: true }}
        />
      </div>
      
      {/* Sales Chart */}
      <Card title="Sales Trends">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={salesData}
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis 
                dataKey="date" 
                stroke="#94a3b8"
                tick={{ fontSize: 12 }}
                tickLine={false}
              />
              <YAxis 
                stroke="#94a3b8"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip 
                formatter={(value) => [`$${value}`, 'Revenue']}
                labelStyle={{ color: '#334155', fontWeight: 'bold' }}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  borderRadius: '0.5rem',
                  border: '1px solid #e2e8f0', 
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' 
                }}
              />
              <Line 
                type="monotone" 
                dataKey="amount" 
                stroke="#2563eb" 
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6, stroke: '#2563eb', strokeWidth: 2, fill: 'white' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
      
      {/* Top Products and Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card title="Top Selling Products">
          <div className="space-y-3">
            {topProducts.map((product, index) => (
              <TopProductCard 
                key={product.id}
                product={product}
                rank={index + 1}
              />
            ))}
          </div>
        </Card>
        
        {/* Recent Activity */}
        <Card title="Recent Activity">
          <div className="divide-y divide-slate-200">
            {activityLogs.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard; 