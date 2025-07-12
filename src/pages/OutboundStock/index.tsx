import React, { useState, useEffect } from 'react';
import { Search, Edit2, Loader2, RefreshCw } from 'lucide-react';
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
import { collection, addDoc, getDocs, doc, updateDoc, query, orderBy, Timestamp, getDoc} from 'firebase/firestore';
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
  const filteredItems = items
    .filter(item => item.quantity > 0) // Exclude items with zero quantity
    .filter(item => {
      const searchLower = searchQuery.toLowerCase();
      const matchesName = item.name.toLowerCase().includes(searchLower);
      const matchesLocation = `${item.locationCode} - ${item.shelfNumber}`.toLowerCase().includes(searchLower);
      
      // Handle comma-separated ASINs
      const matchesAsin = item.asin ? item.asin.split(',').some(asin => 
        asin.trim().toLowerCase().includes(searchLower)
      ) : false;

      // Handle barcode search
      const matchesBarcode = item.barcode ? item.barcode.toLowerCase().includes(searchLower) : false;
      
      return matchesName || matchesLocation || matchesAsin || matchesBarcode;
    })
    .sort((a, b) => {
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

  const handleUpdateStock = async (data: { id: string; quantity: number; reason: string; storeName: string }) => {
    setIsLoading(true);
    
    try {
      const stockRef = doc(db, 'inventory', data.id);
      const stockDoc = await getDoc(stockRef);
      
      if (!stockDoc.exists()) {
        throw new Error('Stock item not found');
      }

      const originalItem = stockDoc.data() as StockItem;
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Calculate the new damaged items count if reason is 'damaged'
      const newDamagedItems = data.reason === 'damaged' 
        ? originalItem.damagedItems + (originalItem.quantity - data.quantity)
        : originalItem.damagedItems;
        const now = new Date();

      // Update stock
      await updateDoc(stockRef, {
        quantity: data.quantity,
        damagedItems: newDamagedItems,
        lastUpdated: Timestamp.fromDate(now)
      });

      // Add activity log
      await addDoc(collection(db, 'activityLogs'), {
        
        detail: `${originalItem.quantity - data.quantity} units deducted from stock "${originalItem.name}" (Reason: ${data.reason}, Store: ${data.storeName}) by ${user.role}`,
        time: new Date().toISOString(),
        user: user.name,
        role: user.role
      });

      // Update local state
      const updatedItems = items.map(item => 
        item.id === data.id 
          ? { 
              ...item, 
              quantity: data.quantity,
              damagedItems: newDamagedItems
            }
          : item
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Outbound Inventory</h1>
          <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mt-1`}>Manage and track inventory deductions</p>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Search by name, location, ASIN or barcode..."
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
        <Button
            variant="secondary"
            onClick={fetchStockItems}
            className={`flex items-center gap-2 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </Button>
      </div>

      {/* Responsive Table/Card List */}
      {isLoading ? (
        <div className={`text-center py-12 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-lg border`}>
          <div className="flex flex-col items-center gap-4">
            <Loader2 className={`w-8 h-8 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} animate-spin`} />
            <p className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>Loading stock items...</p>
          </div>
        </div>
      ) : filteredItems.length > 0 ? (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block rounded-lg overflow-hidden border ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={`${isDarkMode ? 'bg-slate-800' : 'bg-slate-50'}`}>
              <tr>
                <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Name</th>
                <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Status</th>
                <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Location</th>
                <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>ASIN</th>
                <th className={`px-4 py-3 text-right text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Quantity</th>
                {user?.role === 'admin' && (
                  <th className={`px-4 py-3 text-right text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Price</th>
                )}
                <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Last Updated</th>
                <th className={`px-4 py-3 text-right text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-slate-700' : 'divide-slate-200'}`}>
                  {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className={`${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-50'} cursor-pointer`}
                    onClick={() => handleItemClick(item)}
                  >
                    <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-blue-400' : 'text-blue-700'} font-medium`}>{item.name}</td>
                    <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        item.status === 'active' 
                          ? 'bg-green-100 text-green-700 '
                          : 'bg-yellow-100 text-yellow-700 '
                      }`}>
                        {item.status === 'active' ? 'Active' : 'Pending'}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{item.locationCode} - {item.shelfNumber}</td>
                    <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                      {item.asin ? (
                        item.asin.split(',').length > 3
                          ? item.asin.split(',').slice(0, 3).map(a => a.trim()).join(', ') + '...'
                          : item.asin.split(',').map(a => a.trim()).join(', ')
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'} text-right`}>
                      <div className="flex items-center justify-end gap-2">
                        {item.quantity <= 10 && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 ">
                            Critical Low
                          </span>
                        )}
                        {item.quantity > 10 && item.quantity <= 25 && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700 ">
                            Low Stock
                          </span>
                        )}
                        <span>{item.quantity}</span>
                      </div>
                    </td>
                    {user?.role === 'admin' && (
                      <td className={`px-4 py-3 text-right text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                        {Number(item.price) > 0 ? `£${Number(item.price).toFixed(2)}` : '(Not set)'}
                      </td>
                    )}
                      <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{format(new Date(item.lastUpdated), 'MMM d, yyyy')}</td>
                    <td className="px-4 py-3 text-right text-sm">
                      <div className="flex items-center justify-end gap-2">
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
                  ))}
            </tbody>
          </table>
        </div>
      </div>
          {/* Mobile Card List */}
          <div className="block md:hidden space-y-4">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className={`rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} p-4 shadow-sm flex flex-col gap-2`}
                onClick={() => handleItemClick(item)}
              >
                <div className="flex justify-between items-center">
                  <span className={`font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>{item.name}</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    item.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {item.status === 'active' ? 'Active' : 'Pending'}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>Location: <span className="font-medium">{item.locationCode} - {item.shelfNumber}</span></span>
                  <span className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>Qty: <span className="font-medium">{item.quantity}</span></span>
                  {item.asin && <span className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>ASIN: <span className="font-medium">{item.asin}</span></span>}
                  {user?.role === 'admin' && (
                    <span className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>Price: <span className="font-medium">{Number(item.price) > 0 ? `£${Number(item.price).toFixed(2)}` : '(Not set)'}</span></span>
                  )}
                  <span className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>Updated: <span className="font-medium">{format(new Date(item.lastUpdated), 'MMM d, yyyy')}</span></span>
                </div>
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={(e) => { e.stopPropagation(); handleEditClick(e, item); }}
                  >
                    <Edit2 size={14} /> Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className={`text-center py-12 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-lg border`}>
          <p className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>No stock items found. Try adjusting your search.</p>
        </div>
      )}

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
            onSubmit={handleUpdateStock}
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