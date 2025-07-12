import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Loader2, CheckSquare, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/modals/Modal';
import AddStockForm from '../../components/stock/AddStockForm';
import EditStockForm from '../../components/stock/EditStockForm';
import StockDetailsModal from '../../components/modals/StockDetailsModal';
import DeleteConfirmationModal from '../../components/modals/DeleteConfirmationModal';
import { StockItem } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';

const Stock: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [items, setItems] = useState<StockItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const { showToast } = useToast();
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  const [isQuantityConfirmModalOpen, setIsQuantityConfirmModalOpen] = useState(false);
  const [pendingQuantityUpdate, setPendingQuantityUpdate] = useState<{ itemId: string; newQuantity: number } | null>(null);

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

  const sortOptions = [
    { value: 'name', label: 'Name (A-Z)' },
    { value: 'quantity', label: 'Quantity (High-Low)' },
    { value: 'price', label: 'Price (High-Low)' },
    { value: 'date', label: 'Date Updated' },
    { value: 'status', label: 'Status (Pending - Active)' }
  ];

  // Filter and sort items
  const filteredItems = items.filter(item => {
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
  }).sort((a, b) => {
    if (sortBy === 'name') {
      return a.name.localeCompare(b.name);
    } else if (sortBy === 'quantity') {
      return b.quantity - a.quantity;
    } else if (sortBy === 'price') {
      return b.price - a.price;
    } else if (sortBy === 'date') {
      return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
    } else if (sortBy === 'status') {
      // Sort by status: active first, then pending
      if (a.status === 'pending' && b.status === 'active') return -1;
      if (a.status === 'active' && b.status === 'pending') return 1;
      return 0;
    }
    return 0;
  });

  const handleAddStock = async (data: Omit<StockItem, 'id'>[]) => {
    setIsLoading(true);
    
    try {
      const newItems: StockItem[] = [];
      
      // Add documents to Firestore
      for (const item of data) {
        const docRef = await addDoc(collection(db, 'inventory'), {
          ...item,
          lastUpdated: Timestamp.fromDate(new Date())
        });
        
        newItems.push({
          ...item,
          id: docRef.id,
          lastUpdated: new Date()
        });
      }
      
      // Add activity log
      if (user) {
        const totalQuantity = data.reduce((sum, item) => sum + item.quantity, 0);
        const locationDetails = data.map(item => 
          `${item.quantity} at ${item.locationCode}-${item.shelfNumber}`
        ).join(', ');
        
        await addDoc(collection(db, 'activityLogs'), {
          user: user.name,
          role: user.role,
          detail: `added new product "${data[0].name}" with total quantity ${totalQuantity} (${locationDetails})`,
          time: new Date().toISOString()
        });
      }
      
      // Update local state
      setItems(prev => [...prev, ...newItems]);
      setIsAddModalOpen(false);
      showToast('Stock items added successfully', 'success');
    } catch (error) {
      console.error('Error adding stock:', error);
      showToast('Failed to add stock items', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditStock = async (data: StockItem, originalItem: StockItem) => {
    setIsLoading(true);
    
    try {
      const now = new Date();
        const changes: Partial<StockItem> = {};
        const logChanges: string[] = [];

        // Compare fields other than quantity
        if (data.name !== originalItem.name) {
            changes.name = data.name;
            logChanges.push(`name from "${originalItem.name}" to "${data.name}"`);
        }
        if (data.price !== originalItem.price) {
            changes.price = data.price;
          const oldPrice = Number(originalItem.price || 0).toFixed(2);
          const newPrice = Number(data.price || 0).toFixed(2);
            logChanges.push(`price from £${oldPrice} to £${newPrice}`);
        }
        if (data.locationCode !== originalItem.locationCode || data.shelfNumber !== originalItem.shelfNumber) {
            changes.locationCode = data.locationCode;
            changes.shelfNumber = data.shelfNumber;
            logChanges.push(`location from ${originalItem.locationCode}-${originalItem.shelfNumber} to ${data.locationCode}-${data.shelfNumber}`);
        }
        if (data.supplier !== originalItem.supplier) {
            changes.supplier = data.supplier;
            logChanges.push(`supplier from "${originalItem.supplier || 'none'}" to "${data.supplier || 'none'}"`);
        }
        if (data.asin !== originalItem.asin) {
            changes.asin = data.asin;
            logChanges.push(`ASIN from "${originalItem.asin || 'none'}" to "${data.asin || 'none'}"`);
        }
        if (data.status !== originalItem.status) {
          changes.status = data.status;
          logChanges.push(`status from "${originalItem.status}" to "${data.status}"`);
        }
        if (data.damagedItems !== originalItem.damagedItems) {
            changes.damagedItems = data.damagedItems;
            logChanges.push(`damaged items from ${originalItem.damagedItems} to ${data.damagedItems}`);
        }
        if (data.fulfillmentType !== originalItem.fulfillmentType) {
            changes.fulfillmentType = data.fulfillmentType;
            logChanges.push(`fulfillment type from "${originalItem.fulfillmentType.toUpperCase()}" to "${data.fulfillmentType.toUpperCase()}"`);
        }
        if (data.storeName !== originalItem.storeName) {
            changes.storeName = data.storeName;
            logChanges.push(`store name from "${originalItem.storeName}" to "${data.storeName}"`);
        }


        // If there are changes other than quantity, update them immediately
        if (Object.keys(changes).length > 0) {
            const stockRef = doc(db, 'inventory', data.id);
            await updateDoc(stockRef, { ...changes, lastUpdated: Timestamp.fromDate(now) });

            if (user && logChanges.length > 0) {
                await addDoc(collection(db, 'activityLogs'), {
                    user: user.name,
                    role: user.role,
                    detail: `edited product "${data.name}": ${logChanges.join(', ')}`,
                    time: now.toISOString()
                });
            }
            
            const updatedItems = items.map(item =>
                item.id === data.id ? { ...item, ...changes, lastUpdated: now } : item
            );
            setItems(updatedItems);
            showToast('Stock details updated successfully', 'success');
            setIsEditModalOpen(false);
            setSelectedItem(null);
        }

        // Handle quantity update
        if (data.quantity > originalItem.quantity) {
            setPendingQuantityUpdate({ itemId: data.id, newQuantity: data.quantity });
            setIsQuantityConfirmModalOpen(true);
            setIsEditModalOpen(false);
        } else if (data.quantity !== originalItem.quantity) {
            // If quantity is decreased, update it directly
            const stockRef = doc(db, 'inventory', data.id);
            await updateDoc(stockRef, { quantity: data.quantity, lastUpdated: Timestamp.fromDate(now) });

            if (user) {
          await addDoc(collection(db, 'activityLogs'), {
            user: user.name,
            role: user.role,
                    detail: `edited product "${data.name}": quantity from ${originalItem.quantity} to ${data.quantity}`,
            time: now.toISOString()
          });
      }
      
      const updatedItems = items.map(item => 
                item.id === data.id ? { ...item, quantity: data.quantity, lastUpdated: now } : item
      );
      setItems(updatedItems);
            showToast('Stock quantity updated', 'success');
            setIsEditModalOpen(false);
            setSelectedItem(null);
        } else {
      setIsEditModalOpen(false);
          setSelectedItem(null);
        }

    } catch (error) {
      console.error('Error updating stock:', error);
      showToast('Failed to update stock item', 'error');
    } finally {
      setIsLoading(false);
    }
  };

const handleConfirmQuantityUpdate = async () => {
    if (!pendingQuantityUpdate) return;

    setIsLoading(true);
    try {
        const { itemId, newQuantity } = pendingQuantityUpdate;
        const now = new Date();
        const originalItem = items.find(item => item.id === itemId);

        const stockRef = doc(db, 'inventory', itemId);
        await updateDoc(stockRef, { quantity: newQuantity, lastUpdated: Timestamp.fromDate(now) });

        if (user && originalItem) {
            await addDoc(collection(db, 'activityLogs'), {
                user: user.name,
                role: user.role,
                detail: `edited product "${originalItem.name}": quantity from ${originalItem.quantity} to ${newQuantity}`,
                time: now.toISOString()
            });
        }

        const updatedItems = items.map(item =>
            item.id === itemId ? { ...item, quantity: newQuantity, lastUpdated: now } : item
        );
        setItems(updatedItems);
        showToast('Stock quantity updated successfully', 'success');
        setSelectedItem(null);
    } catch (error) {
        console.error('Error updating quantity:', error);
        showToast('Failed to update quantity', 'error');
    } finally {
        setIsLoading(false);
        setIsQuantityConfirmModalOpen(false);
        setPendingQuantityUpdate(null);
    }
};


  const handleDeleteStock = async (id: string) => {
    setIsLoading(true);
    
    try {
      // Get the item details before deleting
      const itemToDelete = items.find(item => item.id === id);
      
      // Delete document from Firestore
      await deleteDoc(doc(db, 'inventory', id));
      
      // Add activity log
      if (user && itemToDelete) {
        await addDoc(collection(db, 'activityLogs'), {
          user: user.name,
          role: user.role,
          detail: `deleted product "${itemToDelete.name}" (${itemToDelete.quantity} units) from location ${itemToDelete.locationCode}-${itemToDelete.shelfNumber}`,
          time: new Date().toISOString()
        });
      }
      
      // Update local state
      setItems(items.filter(item => item.id !== id));
      setIsDeleteModalOpen(false);
      setSelectedItem(null);
      showToast('Stock item deleted successfully', 'success');
    } catch (error) {
      console.error('Error deleting stock:', error);
      showToast('Failed to delete stock item', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemClick = (item: StockItem) => {
    setSelectedItem(item);
  };

  const handleEditClick = (e: React.MouseEvent, item: StockItem) => {
    e.stopPropagation();
    setSelectedItem(item);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (e: React.MouseEvent, item: StockItem) => {
    e.stopPropagation();
    setSelectedItem(item);
    setIsDeleteModalOpen(true);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map(item => item.id)));
    }
  };

  const handleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedItems.size === 0) return;
    
    setIsLoading(true);
    try {
      // Get details of items to be deleted
      const itemsToDelete = items.filter(item => selectedItems.has(item.id));
      
      // Delete all selected items from Firestore
      const deletePromises = Array.from(selectedItems).map(id => 
        deleteDoc(doc(db, 'inventory', id))
      );
      await Promise.all(deletePromises);
      
      // Add activity log
      if (user) {
        const itemsList = itemsToDelete.map(item => 
          `"${item.name}" (${item.quantity} units) from ${item.locationCode}-${item.shelfNumber}`
        ).join(', ');
        
        await addDoc(collection(db, 'activityLogs'), {
          user: user.name,
          role: user.role,
          detail: `Bulk deleted ${selectedItems.size} products: ${itemsList}`,
          time: new Date().toISOString()
        });
      }
      
      // Update local state
      setItems(items.filter(item => !selectedItems.has(item.id)));
      setSelectedItems(new Set());
      setIsSelectionMode(false);
      showToast(`Successfully deleted ${selectedItems.size} items`, 'success');
    } catch (error) {
      console.error('Error deleting items:', error);
      showToast('Failed to delete selected items', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    if (!isSelectionMode) {
      setSelectedItems(new Set());
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div>
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Inbound
          </h1>
          <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mt-1`}>
            Manage your inbound stock, track quantities, and monitor product status
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {isSelectionMode ? (
            <>
              <Button
                onClick={handleBulkDelete}
                variant="danger"
                className="flex items-center gap-2 w-full sm:w-auto"
                disabled={isLoading || selectedItems.size === 0}
              >
                <Trash2 size={16} />
                Delete Selected ({selectedItems.size})
              </Button>
              <Button
                onClick={toggleSelectionMode}
                variant="secondary"
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={toggleSelectionMode}
                variant="secondary"
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                <CheckSquare size={16} />
                Select Items
              </Button>
              <Button
                variant="primary"
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                <Plus size={16} />
                Add New Stock
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`} size={16} />
            <Input
              type="text"
              placeholder="Search by name, location, ASIN or barcode"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="w-full sm:w-48">
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            options={sortOptions}
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
          <div className="hidden md:block overflow-x-auto overflow-y-hidden">
          <table className={`min-w-full divide-y ${isDarkMode ? 'divide-slate-700' : 'divide-slate-200'} ${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-lg border ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
            <thead className={isDarkMode ? 'bg-slate-700/50' : 'bg-slate-100'}>
              <tr>
                {isSelectionMode && (
                  <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedItems.size === filteredItems.length}
                        onChange={handleSelectAll}
                        className={`h-4 w-4 text-blue-600 rounded ${isDarkMode ? 'border-slate-600 bg-slate-700' : 'border-slate-300'} focus:ring-blue-500`}
                      />
                      <span>Select</span>
                    </div>
                  </th>
                )}
                <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Name</th>
                <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Status</th>
                <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Location</th>
                <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>ASIN</th>
                {user?.role === 'admin' && (
                  <>
                    <th className={`px-4 py-3 text-right text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Price</th>
                    <th className={`px-4 py-3 text-right text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Total Price</th>
                  </>
                )}
                <th className={`px-4 py-3 text-right text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Quantity</th>
                <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Last Updated</th>
                <th className={`px-4 py-3 text-right text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-slate-700' : 'divide-slate-200'}`}>
              {filteredItems.map((item, index) => (
                <motion.tr
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ 
                    duration: 0.3,
                    delay: index * 0.05,
                    ease: "easeOut"
                  }}
                  className={`hover:${isDarkMode ? 'bg-slate-700/50' : 'bg-slate-50'} cursor-pointer`}
                  onClick={() => handleItemClick(item)}
                >
                  {isSelectionMode && (
                    <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.id)}
                        onChange={() => handleSelectItem(item.id)}
                        className={`h-4 w-4 text-blue-600 rounded ${isDarkMode ? 'border-slate-600 bg-slate-700' : 'border-slate-300'} focus:ring-blue-500`}
                      />
                    </td>
                  )}
                  <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-blue-400' : 'text-blue-700'} font-medium`}>{item.name}</td>
                  <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      item.status === 'active' 
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
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
                  {user?.role === 'admin' && (
                    <>
                      <td className={`px-4 py-3 text-right text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                        {Number(item.price) > 0 ? `£${Number(item.price).toFixed(2)}` : '(Not set)'}
                      </td>
                      <td className={`px-4 py-3 text-right text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                        {Number(item.quantity * item.price) > 0 ? `£${Number(item.quantity * item.price).toFixed(2)}` : '(Not set)'}
                      </td>
                    </>
                  )}
                  <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'} text-right`}>
                    <div className="flex items-center justify-end gap-2">
                      {item.quantity <= 10 && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
                          Critical Low
                        </span>
                      )}
                      {item.quantity > 10 && item.quantity <= 25 && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
                          Low Stock
                        </span>
                      )}
                      <span>{item.quantity}</span>
                    </div>
                  </td>
                    <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{format(new Date(item.lastUpdated), 'MMM d, yyyy')}</td>
                  <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'} text-right`}>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={(e) => handleEditClick(e, item)}
                        className={`p-1 ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} transition-colors`}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={(e) => handleDeleteClick(e, item)}
                        className={`p-1 ${isDarkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'} transition-colors`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
          {/* Mobile Card List */}
          <div className="block md:hidden space-y-4">
            {filteredItems.map((item, index) => (
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
                    <>
                      <span className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>Price: <span className="font-medium">{Number(item.price) > 0 ? `£${Number(item.price).toFixed(2)}` : '(Not set)'}</span></span>
                      <span className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>Total: <span className="font-medium">{Number(item.quantity * item.price) > 0 ? `£${Number(item.quantity * item.price).toFixed(2)}` : '(Not set)'}</span></span>
                    </>
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
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={(e) => { e.stopPropagation(); handleDeleteClick(e, item); }}
                  >
                    <Trash2 size={14} /> Delete
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
      
      {/* Add Stock Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Stock Item"
        size="xl"
      >
        <AddStockForm 
          onSubmit={handleAddStock}
          isLoading={isLoading}
          existingStockItems={items}
        />
      </Modal>
      
      {/* Edit Stock Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Stock"
        size='xl'
      >
        {selectedItem && (
          <EditStockForm
            item={selectedItem}
            onSubmit={handleEditStock}
            onCancel={() => setIsEditModalOpen(false)}
            isLoading={isLoading}
          />
        )}
      </Modal>
      
      {/* Delete Confirmation Modal */}
      {selectedItem && (
        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setSelectedItem(null);
          }}
          onConfirm={() => handleDeleteStock(selectedItem.id)}
          title="Delete Stock Item"
          message={`Are you sure you want to delete "${selectedItem.name}"? This action cannot be undone.`}
          isLoading={isLoading}
        />
      )}
      
      {/* Stock Details Modal */}
      {selectedItem && !isEditModalOpen && !isDeleteModalOpen && !isQuantityConfirmModalOpen && (
        <StockDetailsModal
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          item={selectedItem}
        />
      )}
      <DeleteConfirmationModal
        isOpen={isSelectionMode && selectedItems.size > 0}
        onClose={() => {
          setIsSelectionMode(false);
          setSelectedItems(new Set());
        }}
        onConfirm={handleBulkDelete}
        itemCount={selectedItems.size}
        isLoading={isLoading}
      />
      <Modal
        isOpen={isQuantityConfirmModalOpen}
        onClose={() => {
            setIsQuantityConfirmModalOpen(false);
            setPendingQuantityUpdate(null);
        }}
        title="Confirm Quantity Update"
        >
        <div>
            <p>This product is already in stock in this location. Are you sure you want to add more quantity?</p>
            <div className="flex justify-end gap-4 mt-4">
                <Button
                    variant="secondary"
                    onClick={() => {
                        setIsQuantityConfirmModalOpen(false);
                        setPendingQuantityUpdate(null);
                    }}
                >
                    No
                </Button>
                <Button onClick={handleConfirmQuantityUpdate} isLoading={isLoading}>
                    Yes
                </Button>
            </div>
        </div>
        </Modal>
    </div>
  );
};

export default Stock;