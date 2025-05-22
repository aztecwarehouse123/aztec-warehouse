import React from 'react';
import { ShoppingCart, Package, Truck, AlertCircle, CheckCircle } from 'lucide-react';
import StatsCard from '../../components/dashboard/StatsCard';

const OutboundDashboard: React.FC = () => {
  // These would typically come from your API/state management
  const newOrdersToday = 45;
  const pendingPacking = 12;
  const ordersShipped = 28;
  const delayedOrders = 5;

  const lastShippedProducts = [
    { id: 1, order: 'ORD-001', product: 'Laptop', status: 'Delivered', time: '2:30 PM' },
    { id: 2, order: 'ORD-002', product: 'Monitor', status: 'In Transit', time: '1:45 PM' },
    { id: 3, order: 'ORD-003', product: 'Keyboard', status: 'Delivered', time: '11:20 AM' },
    { id: 4, order: 'ORD-004', product: 'Mouse', status: 'In Transit', time: '10:15 AM' },
    { id: 5, order: 'ORD-005', product: 'Headphones', status: 'Delivered', time: '9:30 AM' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Outbound Dashboard</h1>
        <p className="text-slate-500 mt-1">Track your outbound operations and order status</p>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          title="New Orders Today" 
          value={newOrdersToday}
          icon={<ShoppingCart size={24} />}
          change={{ value: 8, isPositive: true }}
        />
        <StatsCard 
          title="Pending Packing" 
          value={pendingPacking}
          icon={<Package size={24} />}
          change={{ value: 3, isPositive: false }}
        />
        <StatsCard 
          title="Orders Shipped" 
          value={ordersShipped}
          icon={<Truck size={24} />}
          change={{ value: 5, isPositive: true }}
        />
        <StatsCard 
          title="Delayed Orders" 
          value={delayedOrders}
          icon={<AlertCircle size={24} />}
          change={{ value: 2, isPositive: false }}
        />
      </div>

      {/* Last Shipped Products */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Last 5 Shipped Products</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Order</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Product</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {lastShippedProducts.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm text-blue-600 font-medium">{product.order}</td>
                  <td className="px-4 py-3 text-sm text-slate-800">{product.product}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      product.status === 'Delivered' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {product.status === 'Delivered' ? (
                        <CheckCircle className="w-3 h-3 mr-1" />
                      ) : (
                        <Truck className="w-3 h-3 mr-1" />
                      )}
                      {product.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-800">{product.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OutboundDashboard; 