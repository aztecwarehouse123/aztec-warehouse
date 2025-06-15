import React, { useState, useEffect } from 'react';
import { Search, Edit2, Loader2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/modals/Modal';
import OutboundEditForm from '../../components/stock/OutboundEditForm';
import StockDetailsModal from '../../components/modals/StockDetailsModal';
import { StockItem } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, query, orderBy, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';

const OutboundStock: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [items, setItems] = useState<StockItem[]>([]);
  const { showToast } = useToast();
  const { isDarkMode } = useTheme();
  const { user } = useAuth();

  // Fetch stock items from Firestore
  const fetchStockItems = async () => {
    setIsLoading(true);
    try {
      const stockQuery = query(collection(db, 'inventory'), orderBy('name'));
      const querySnapshot = await getDocs(stockQuery);
      const stockItems = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          lastUpdated: data.lastUpdated instanceof Timestamp 
            ? data.lastUpdated.toDate() 
            : new Date(data.lastUpdated)
        };
      }) as StockItem[];
      setItems(stockItems);
    } catch (error) {
      console.error('Error fetching stock items:', error);
      showToast('Failed to fetch stock items', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStockItems();
  }, [showToast]);

  // Filter and sort items
  const filteredItems = items.filter(item => {
    const searchLower = searchQuery.toLowerCase();
    const matchesName = item.name.toLowerCase().includes(searchLower);
    const matchesLocation = `${item.locationCode} - ${item.shelfNumber}`.toLowerCase().includes(searchLower);
    return matchesName || matchesLocation;
  }).sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    } else if (sortBy === 'quantity') {
      return b.quantity - a.quantity;
    } else if (sortBy === 'price') {
      return b.price - a.price;
    } else if (sortBy === 'date') {
      return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
    }
    return 0;
  });

  const handleEditStock = async (data: { id: string; quantity: number; reason: string }) => {
    setIsLoading(true);
    
    try {
      const now = new Date();
      // Get the original item to compare changes
      const originalItem = items.find(item => item.id === data.id);
      
      if (!originalItem) {
        throw new Error('Item not found');
      }

      // Update document in Firestore
      const stockRef = doc(db, 'inventory', data.id);
      await updateDoc(stockRef, {
        quantity: data.quantity,
        lastUpdated: Timestamp.fromDate(now)
      });
      
      // Add activity log
      if (user) {
        await addDoc(collection(db, 'activityLogs'), {
          user: user.name,
          role: user.role,
          detail: `${originalItem.quantity - data.quantity} units deducted from stock "${originalItem.name}" (Reason: ${data.reason}) by ${user.role}`,
          time: now.toISOString()
        });
      }
      
      // Update local state
      const updatedItems = items.map(item => 
        item.id === data.id ? { ...item, quantity: data.quantity, lastUpdated: now } : item
      );
      setItems(updatedItems);
      setSelectedItem(null);
      setIsEditModalOpen(false);
      showToast('Stock quantity updated successfully', 'success');
    } catch (error) {
      console.error('Error updating stock:', error);
      showToast('Failed to update stock quantity', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemClick = (item: StockItem) => {
    if (!isEditModalOpen) {
      setSelectedItem(item);
    }
  };

  const handleEditClick = (e: React.MouseEvent, item: StockItem) => {
    e.stopPropagation();
    setSelectedItem(item);
    setIsEditModalOpen(true);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Outbound Inventory
          </h1>
          <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mt-1`}>
            Manage and track inventory deductions
          </p>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Search by name or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            icon={<Search size={16} />}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            options={[
              { value: 'name', label: 'Sort by Name' },
              { value: 'quantity', label: 'Sort by Quantity' },
              { value: 'price', label: 'Sort by Price' },
              { value: 'date', label: 'Sort by Date' }
            ]}
          />
        </div>
      </div>

      {/* Table View */}
      <div className={`rounded-lg overflow-hidden border ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={`${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <tr>
                <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>
                  Name
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>
                  ASIN
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>
                  Location
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>
                  Quantity
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>
                  Price
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>
                  Last Updated
                </th>
                <th className={`px-6 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>
                  Status
                </th>
                <th className={`px-6 py-3 text-right text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-slate-700' : 'divide-slate-200'}`}>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center">
                    <div className="flex justify-center items-center">
                      <Loader2 className="animate-spin h-5 w-5 text-blue-500" />
                    </div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className={`px-6 py-4 text-center ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    No items found
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className={`${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'} cursor-pointer`}
                    onClick={() => handleItemClick(item)}
                  >
                    <td className={`px-6 py-4 whitespace-nowrap ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {item.name}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`}>
                      {item.asin || '-'}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`}>
                      {item.locationCode} - {item.shelfNumber}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`}>
                      {item.quantity}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                      {Number(item.price) > 0 ? `£${Number(item.price).toFixed(2)}` : '(Not set)'}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`}>
                      {format(new Date(item.lastUpdated), 'MMM d, yyyy')}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap ${isDarkMode ? 'text-slate-300' : 'text-gray-500'}`}>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        item.status === 'active' 
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {item.status === 'active' ? 'Active' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex justify-end pr-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => handleEditClick(e, item)}
                          className={`p-1 ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-300'} transition-colors`}
                        >
                          <Edit2 size={16} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedItem(null);
        }}
        title="Update Stock Quantity"
      >
        {selectedItem && (
          <OutboundEditForm
            item={selectedItem}
            onSubmit={handleEditStock}
            isLoading={isLoading}
          />
        )}
      </Modal>

      {selectedItem && !isEditModalOpen && (
        <StockDetailsModal
          isOpen={true}
          onClose={() => setSelectedItem(null)}
          item={selectedItem}
        />
      )}
    </div>
  );
};

export default OutboundStock; 