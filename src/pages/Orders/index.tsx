import React, { useState, useEffect } from 'react';
import { Search, LayoutGrid, Table, Trash2, Loader2, Edit2 } from 'lucide-react';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import OrderCard from '../../components/orders/OrderCard';
import OrderDetailsModal from '../../components/modals/OrderDetailsModal';
import { Order, OrderStatus, OrderItem } from '../../types';
import Button from '../../components/ui/Button';
import AddOrderModal from '../../components/modals/AddOrderModal';
import { db } from '../../config/firebase';
import { collection, getDocs, query, orderBy, addDoc, updateDoc, doc, deleteDoc, Timestamp, writeBatch, serverTimestamp, getDoc, FieldValue, deleteField } from 'firebase/firestore';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import EditOrderModal from '../../components/modals/EditOrderModal';
import DeleteConfirmationModal from '../../components/modals/DeleteConfirmationModal';
import { useTheme } from '../../contexts/ThemeContext';

const Orders: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState('date');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [orderList, setOrderList] = useState<Order[]>([]);
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const { showToast } = useToast();
  const { user } = useAuth();
  const { isDarkMode } = useTheme();

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const ordersFromDb = snapshot.docs.map(doc => {
        const data = doc.data();
        // Explicitly cast data to Order structure, handling Timestamp conversion
        const orderData = {
          id: doc.id,
          orderNumber: data.orderNumber || '',
          customerName: data.customerName || '',
          items: data.items || [],
          status: data.status || 'pending',
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt),
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date(data.updatedAt),
          shippingAddress: data.shippingAddress || {},
          billingAddress: data.billingAddress || {},
          paymentMethod: data.paymentMethod || '',
          totalAmount: data.totalAmount || 0,
          notes: data.notes || '',
          shippedTime: data.shippedTime instanceof Timestamp ? data.shippedTime.toDate() : (data.shippedTime ? new Date(data.shippedTime) : undefined) // Include shippedTime
        } as Order; // Cast to Order type
        return orderData;
      });
      setOrderList(ordersFromDb);
    } catch (error) {
      console.error('Error fetching orders:', error);
      showToast('Failed to fetch orders', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Filter the orders based on search and status
  const filteredOrders = orderList.filter(order => {
    const matchesSearch = 
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (sortBy === 'amount') {
      return b.totalAmount - a.totalAmount;
    }
    return 0;
  });

  const handleOrderClick = (order: Order) => {
    setSelectedOrder(order);
  };

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'returned', label: 'Returned' }
  ];

  const sortOptions = [
    { value: 'date', label: 'Date (Newest First)' },
    { value: 'amount', label: 'Amount (Highest First)' }
  ];

  const handleAddOrder = async (order: Omit<Order, 'id'>) => {
    setIsLoading(true);
    try {
      console.log('Adding new order with status:', order.status);
      await addDoc(collection(db, 'orders'), {
        ...order,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      // Add activity log for new order
      await addDoc(collection(db, 'activityLogs'), {
        user: user?.name ,
        role: user?.role,
        detail: `created new order #${order.orderNumber} for '${order.customerName}' with ${order.items.length} items (${order.items.map(item => `${item.quantity} ${item.productName}`).join(', ')}) - Total: $${order.totalAmount.toFixed(2)}`,
        time: new Date().toISOString()
      });

      // If order is shipped, update inventory quantities
      if (order.status === 'shipped') {
        console.log('Order is shipped, updating inventory...');
        await updateInventoryQuantities(order.items, true);
      }

      await fetchOrders();
      setIsAddModalOpen(false);
      showToast('Order added successfully!', 'success');
    } catch (error) {
      console.error('Error in handleAddOrder:', error);
      alert('Error adding order: ' + ((error as Error)?.message || error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditOrder = async (order: Order) => {
    setIsLoading(true);
    try {
      const orderRef = doc(db, 'orders', order.id);
      
      // Get the previous order data to check status change
      const prevOrderDoc = await getDoc(orderRef);
      const prevOrder = prevOrderDoc.data() as Order | undefined;
      
      console.log('Previous order status:', prevOrder?.status);
      console.log('New order status:', order.status);

      const updateData: { 
        status: OrderStatus; 
        updatedAt: FieldValue; 
        shippedTime?: FieldValue;
      } = { 
        status: order.status,
        updatedAt: serverTimestamp()
      };
      
      // Track changes for activity log
      const changes: string[] = [];
      
      // Check status change
      if (prevOrder?.status !== order.status) {
        changes.push(`status from "${prevOrder?.status}" to "${order.status}"`);
      }
      
      // Check customer name change
      if (prevOrder?.customerName !== order.customerName) {
        changes.push(`customer from "${prevOrder?.customerName}" to "${order.customerName}"`);
      }
      
      // Check items changes
      if (JSON.stringify(prevOrder?.items) !== JSON.stringify(order.items)) {
        const itemChanges: string[] = [];
        // Check for added/modified items
        order.items.forEach(newItem => {
          const oldItem = prevOrder?.items.find(item => item.id === newItem.id);
          if (!oldItem) {
            itemChanges.push(`added ${newItem.quantity} ${newItem.productName}`);
          } else if (oldItem.quantity !== newItem.quantity) {
            itemChanges.push(`changed ${newItem.productName} quantity from ${oldItem.quantity} to ${newItem.quantity}`);
          }
        });
        // Check for removed items
        prevOrder?.items.forEach(oldItem => {
          if (!order.items.find(item => item.id === oldItem.id)) {
            itemChanges.push(`removed ${oldItem.quantity} ${oldItem.productName}`);
          }
        });
        if (itemChanges.length > 0) {
          changes.push(`items: ${itemChanges.join(', ')}`);
        }
      }
      
      // Check total amount change
      if (prevOrder?.totalAmount !== order.totalAmount) {
        changes.push(`total amount from $${prevOrder?.totalAmount.toFixed(2)} to $${order.totalAmount.toFixed(2)}`);
      }
      
      // If status changed to shipped, update inventory and potentially add shippedTime
      if (order.status === 'shipped' && prevOrder?.status !== 'shipped') {
        console.log('Status changed to shipped, updating inventory...');
        await updateInventoryQuantities(order.items, true);
         // If changing to shipped, set shippedTime from the order object if available
        if (order.shippedTime) {
           updateData.shippedTime = Timestamp.fromDate(order.shippedTime);
        } else {
           updateData.shippedTime = serverTimestamp();
        }
      }
      // If status changed from shipped to something else, restore inventory and remove shippedTime
      else if (prevOrder?.status === 'shipped' && order.status !== 'shipped') {
        console.log('Status changed from shipped, restoring inventory...');
        await updateInventoryQuantities(order.items, false);
        updateData.shippedTime = deleteField(); // Remove the field
      }
      // If status changed to cancelled or returned, restore inventory and remove shippedTime
      else if ((order.status === 'cancelled' || order.status === 'returned') && 
               prevOrder?.status !== 'cancelled' && 
               prevOrder?.status !== 'returned') {
        console.log(`Status changed to ${order.status}, restoring inventory...`);
        await updateInventoryQuantities(order.items, false);
        updateData.shippedTime = deleteField(); // Remove the field
      }
      // If status changed between non-shipped statuses, preserve shippedTime if it exists
      else if (prevOrder?.shippedTime) {
        updateData.shippedTime = Timestamp.fromDate(prevOrder.shippedTime);
      }

      // Include other editable fields except createdAt, id, and shippedTime
      const { ...orderRest } = order; // Remove unused destructuring
      Object.assign(updateData, orderRest);

      await updateDoc(orderRef, updateData);
      
      // Add activity log if there were changes
      if (changes.length > 0) {
        await addDoc(collection(db, 'activityLogs'), {
          user: user?.name,
          role: user?.role,
          detail: `edited order #${order.orderNumber}: ${changes.join('; ')}`,
          time: new Date().toISOString()
        });
      }

      await fetchOrders();
      setEditOrder(null);
      showToast('Order updated successfully!', 'success');
    } catch (error) {
      console.error('Error updating order:', error);
      showToast('Failed to update order', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseEditModal = () => {
    setEditOrder(null);
  };

  const handleDeleteOrder = async (id: string) => {
    setIsLoading(true);
    try {
      // Get order details before deletion for logging
      const orderRef = doc(db, 'orders', id);
      const orderDoc = await getDoc(orderRef);
      const orderData = orderDoc.data() as Order | undefined;

      if (orderData) {
        // Add activity log before deleting
        await addDoc(collection(db, 'activityLogs'), {
          user: user?.name,
          role: user?.role,
          detail: `deleted order #${orderData.orderNumber} for '${orderData.customerName}' with ${orderData.items.length} items (${orderData.items.map(item => `${item.quantity} ${item.productName}`).join(', ')}) - Total: $${orderData.totalAmount.toFixed(2)}`,
          time: new Date().toISOString()
        });

        // Delete the order
        await deleteDoc(orderRef);
        await fetchOrders();
        setIsDeleteModalOpen(false);
        setSelectedOrder(null);
        showToast('Order deleted successfully!', 'success');
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      showToast('Failed to delete order', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();
    setSelectedOrder(order);
    setIsDeleteModalOpen(true);
  };

  const handleEditClick = (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();
    setEditOrder(order);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
      <div>
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Current Orders</h1>
          <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mt-1`}>Track and manage your active orders</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2">
          <span className="hidden sm:inline">Add New Order</span>
        </Button>
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
          />
          
          <Select
            options={sortOptions}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          />
        </div>
      </div>
      
      {/* Toggle View Button */}
      <div className="flex justify-end mb-4">
        <div className="relative inline-block">
        <button
            className={
              `px-4 py-2 text-sm font-medium rounded-l-md focus:outline-none transition-colors 
              ${viewMode === 'grid'
                ? 'bg-blue-600 text-white shadow-sm'
                : isDarkMode 
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300'
              }`
            }
          onClick={() => setViewMode('grid')}
        >
            <LayoutGrid size={18} className="inline mr-1" /> Grid
        </button>
        <button
            className={
              `px-4 py-2 text-sm font-medium rounded-r-md focus:outline-none transition-colors 
              ${viewMode === 'table'
                ? 'bg-blue-600 text-white shadow-sm'
                : isDarkMode 
                  ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300'
              }`
            }
          onClick={() => setViewMode('table')}
        >
            <Table size={18} className="inline mr-1" /> Table
        </button>
        </div>
      </div>
      
      {/* Loading State */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className={`w-8 h-8 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'} animate-spin`} />
          <p className={`mt-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Loading orders...</p>
        </div>
      ) : (
        /* Orders Display */
        viewMode === 'grid' ? (
        filteredOrders.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrders.map((order) => (
                <div key={order.id} className="flex flex-col">
              <OrderCard 
                order={order}
                onClick={() => handleOrderClick(order)}
                    editButton={
                      <button
                        onClick={(e) => handleEditClick(e, order)}
                        className={`p-2 ${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-100'} rounded-full transition-colors`}
                      >
                        <Edit2 className={`w-4 h-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`} />
                      </button>
                    }
              />
                </div>
            ))}
          </div>
        ) : (
            <div className={`text-center py-12 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-lg border`}>
              <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>No orders found. Try adjusting your filters.</p>
          </div>
        )
      ) : (
        filteredOrders.length > 0 ? (
          <div className="overflow-x-auto">
              <table className={`min-w-full divide-y ${isDarkMode ? 'divide-slate-700 bg-slate-800 border-slate-700' : 'divide-slate-200 bg-white border-slate-200'} rounded-lg border`}>
                <thead className={isDarkMode ? 'bg-slate-900' : 'bg-slate-100'}>
                <tr>
                    <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider`}>Order #</th>
                    <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider`}>Customer</th>
                    <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider`}>Status</th>
                    <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider`}>Date</th>
                    <th className={`px-4 py-3 text-right text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider`}>Total</th>
                    <th className={`px-4 py-3 text-center text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} uppercase tracking-wider`}>Actions</th>
                </tr>
              </thead>
                <tbody className={`${isDarkMode ? 'divide-slate-700' : 'divide-slate-200'}`}>
                {filteredOrders.map((order) => (
                    <tr key={order.id} className={`${isDarkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-50'} cursor-pointer`} onClick={() => handleOrderClick(order)}>
                      <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-blue-400' : 'text-blue-700'} font-medium`}>{order.orderNumber}</td>
                      <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>{order.customerName}</td>
                      <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-800'} capitalize`}>{order.status}</td>
                      <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-800'}`}>{new Date(order.createdAt).toLocaleDateString()}</td>
                      <td className={`px-4 py-3 text-sm font-bold ${isDarkMode ? 'text-slate-200' : 'text-slate-900'} text-right`}>${order.totalAmount.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditOrder(order);
                            }}
                            className={`p-1 ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} transition-colors`}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={(e) => handleDeleteClick(e, order)}
                            className={`p-1 ${isDarkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'} transition-colors`}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
            <div className={`text-center py-12 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-lg border`}>
              <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>No orders found. Try adjusting your filters.</p>
          </div>
          )
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
      {/* Add Order Modal */}
      <AddOrderModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddOrder}
        isLoading={isLoading}
      />
      <EditOrderModal
        isOpen={!!editOrder}
        onClose={handleCloseEditModal}
        onEdit={handleEditOrder}
        isLoading={isLoading}
        order={editOrder}
      />
      {/* Delete Confirmation Modal */}
      {selectedOrder && (
        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setSelectedOrder(null);
          }}
          onConfirm={() => handleDeleteOrder(selectedOrder.id)}
          title="Delete Order"
          message={`Are you sure you want to delete order "${selectedOrder.orderNumber}"? This action cannot be undone.`}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};

const updateInventoryQuantities = async (items: OrderItem[], decrease: boolean) => {
   // This is a placeholder function, replace with your actual inventory update logic
   console.log('Updating inventory quantities...', items, decrease);
   // Example using batch write (requires implementation based on your inventory structure)
   const batch = writeBatch(db);
   for (const item of items) {
     const itemRef = doc(db, 'inventory', item.productId);
     // Fetch current quantity to avoid race conditions if necessary
     const itemDoc = await getDoc(itemRef);
     if (itemDoc.exists()) {
       const currentQuantity = itemDoc.data().quantity;
       const newQuantity = decrease ? currentQuantity - item.quantity : currentQuantity + item.quantity;
       batch.update(itemRef, { quantity: newQuantity });
     }
   }
   await batch.commit();
};

export default Orders;