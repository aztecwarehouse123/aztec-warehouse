import React, { useState } from 'react';
import { Search, Filter, Calendar, Table, LayoutGrid } from 'lucide-react';
import { completedOrders } from '../../utils/mockData';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import OrderCard from '../../components/orders/OrderCard';
import OrderDetailsModal from '../../components/modals/OrderDetailsModal';
import { Order } from '../../types';

const Completed: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Filter the orders based on search, status, and date
  const filteredOrders = completedOrders.filter(order => {
    const matchesSearch = 
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    let matchesDate = true;
    const today = new Date();
    const orderDate = new Date(order.createdAt);
    
    if (dateFilter === '30days') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      matchesDate = orderDate >= thirtyDaysAgo;
    } else if (dateFilter === '90days') {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(today.getDate() - 90);
      matchesDate = orderDate >= ninetyDaysAgo;
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
  };

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const dateOptions = [
    { value: 'all', label: 'All Time' },
    { value: '30days', label: 'Last 30 Days' },
    { value: '90days', label: 'Last 90 Days' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Completed Orders</h1>
        <p className="text-slate-500 mt-1">View history of delivered and cancelled orders</p>
      </div>
      
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="md:flex-1">
          <Input
            placeholder="Search by order number or customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search size={18} />}
            fullWidth
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <Select
            options={statusOptions}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            icon={<Filter size={18} />}
          />
          
          <Select
            options={dateOptions}
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            icon={<Calendar size={18} />}
          />
        </div>
      </div>
      
      {/* Toggle View Button */}
      <div className="flex justify-end mb-2">
        <button
          className={`flex items-center gap-2 px-3 py-1 rounded-md border ${viewMode === 'grid' ? 'bg-blue-100 text-blue-700' : 'bg-white text-slate-700'} mr-2`}
          onClick={() => setViewMode('grid')}
          aria-label="Grid View"
        >
          <LayoutGrid size={18} /> Grid View
        </button>
        <button
          className={`flex items-center gap-2 px-3 py-1 rounded-md border ${viewMode === 'table' ? 'bg-blue-100 text-blue-700' : 'bg-white text-slate-700'}`}
          onClick={() => setViewMode('table')}
          aria-label="Table View"
        >
          <Table size={18} /> Table View
        </button>
      </div>
      
      {/* Orders Display */}
      {viewMode === 'grid' ? (
        filteredOrders.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders.map((order) => (
              <OrderCard 
                key={order.id} 
                order={order}
                onClick={() => handleOrderClick(order)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
            <p className="text-slate-500">No completed orders found. Try adjusting your filters.</p>
          </div>
        )
      ) : (
        filteredOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 bg-white rounded-lg border border-slate-200">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Order #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => handleOrderClick(order)}>
                    <td className="px-4 py-3 text-sm text-blue-700 font-medium">{order.orderNumber}</td>
                    <td className="px-4 py-3 text-sm text-slate-800">{order.customerName}</td>
                    <td className="px-4 py-3 text-sm text-slate-800 capitalize">{order.status}</td>
                    <td className="px-4 py-3 text-sm text-slate-800">{new Date(order.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-sm font-bold text-slate-900 text-right">${order.totalAmount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
            <p className="text-slate-500">No completed orders found. Try adjusting your filters.</p>
          </div>
        )
      )}
      
      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          order={selectedOrder}
        />
      )}
    </div>
  );
};

export default Completed;