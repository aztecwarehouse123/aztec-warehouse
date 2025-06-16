import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Loader2, CheckSquare } from 'lucide-react';
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

  const handleEditStock = async (data: StockItem) => {
    setIsLoading(true);
    
    try {
      const now = new Date();
      // Get the original item to compare changes
      const originalItem = items.find(item => item.id === data.id);
      
      // Update document in Firestore
      const stockRef = doc(db, 'inventory', data.id);
      const updateData = {
        name: data.name,
        quantity: data.quantity,
        price: data.price,
        supplier: data.supplier,
        locationCode: data.locationCode,
        shelfNumber: data.shelfNumber,
        asin: data.asin,
        status: data.status,
        damagedItems: data.damagedItems,
        barcode: data.barcode,
        fulfillmentType: data.fulfillmentType,
        storeName: data.storeName,
        lastUpdated: Timestamp.fromDate(now)
      };
      
      await updateDoc(stockRef, updateData);
      
      // Add activity log
      if (user && originalItem) {
        const changes = [];
        if (originalItem.name !== data.name) changes.push(`name from "${originalItem.name}" to "${data.name}"`);
        if (originalItem.quantity !== data.quantity) changes.push(`quantity from ${originalItem.quantity} to ${data.quantity}`);
        if (originalItem.price !== data.price) changes.push(`price from £${originalItem.price} to £${data.price}`);
        if (originalItem.locationCode !== data.locationCode || originalItem.shelfNumber !== data.shelfNumber) {
          changes.push(`location from ${originalItem.locationCode}-${originalItem.shelfNumber} to ${data.locationCode}-${data.shelfNumber}`);
        }
        if (originalItem.supplier !== data.supplier && (originalItem.supplier || data.supplier)) {
          changes.push(`supplier from "${originalItem.supplier || 'none'}" to "${data.supplier || 'none'}"`);
        }
        if (originalItem.asin !== data.asin && (originalItem.asin || data.asin)) {
          changes.push(`ASIN from "${originalItem.asin || 'none'}" to "${data.asin || 'none'}"`);
        }
        if (originalItem.fulfillmentType !== data.fulfillmentType) {
          changes.push(`fulfillment type from "${originalItem.fulfillmentType.toUpperCase()}" to "${data.fulfillmentType.toUpperCase()}"`);
        }
        if (originalItem.status !== data.status) {
          changes.push(`status from "${originalItem.status}" to "${data.status}"`);
        }
        if (originalItem.damagedItems !== data.damagedItems) {
          changes.push(`damaged items from ${originalItem.damagedItems} to ${data.damagedItems}`);
        }
        if (originalItem.barcode !== data.barcode && (originalItem.barcode || data.barcode)) {
          changes.push(`barcode from "${originalItem.barcode || 'none'}" to "${data.barcode || 'none'}"`);
        }
        if (originalItem.storeName !== data.storeName) {
          changes.push(`store name from "${originalItem.storeName}" to "${data.storeName}"`);
        }
        
        if (changes.length > 0) {
          await addDoc(collection(db, 'activityLogs'), {
            user: user.name,
            role: user.role,
            detail: `edited product "${data.name}": ${changes.join(', ')}`,
            time: now.toISOString()
          });
        }
      }
      
      // Update local state
      const updatedItems = items.map(item => 
        item.id === data.id ? { ...data, lastUpdated: now } : item
      );
      setItems(updatedItems);
      setSelectedItem({ ...data, lastUpdated: now });
      setIsEditModalOpen(false);
      showToast('Stock details updated successfully', 'success');
    } catch (error) {
      console.error('Error updating stock:', error);
      showToast('Failed to update stock item', 'error');
    } finally {
      setIsLoading(false);
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Inbound</h1>
          <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mt-1`}>
            Manage your inbound stock, track quantities, and monitor product status
          </p>
        </div>
        <div className="flex items-center gap-4">
          {isSelectionMode ? (
            <>
              <Button
                onClick={handleBulkDelete}
                variant="danger"
                className="flex items-center gap-2"
                disabled={isLoading || selectedItems.size === 0}
              >
                <Trash2 size={16} />
                Delete Selected ({selectedItems.size})
              </Button>
              <Button
                onClick={toggleSelectionMode}
                variant="secondary"
                className="flex items-center gap-2"
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={toggleSelectionMode}
                variant="secondary"
                className="flex items-center gap-2"
              >
                <CheckSquare size={16} />
                Select Items
              </Button>
              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2"
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
      </div>

      {isLoading ? (
        <div className={`text-center py-12 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-lg border`}>
          <div className="flex flex-col items-center gap-4">
            <Loader2 className={`w-8 h-8 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} animate-spin`} />
            <p className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>Loading stock items...</p>
          </div>
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="overflow-x-auto overflow-y-hidden">
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
                <th className={`px-4 py-3 text-right text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Price</th>
                <th className={`px-4 py-3 text-right text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Quantity</th>
                <th className={`px-4 py-3 text-right text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Total Price</th>
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
                  <td className={`px-4 py-3 text-right text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                    {Number(item.price) > 0 ? `£${Number(item.price).toFixed(2)}` : '(Not set)'}
                  </td>
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
                  <td className={`px-4 py-3 text-right text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                    {Number(item.quantity * item.price) > 0 ? `£${Number(item.quantity * item.price).toFixed(2)}` : '(Not set)'}
                  </td>
                  
                  
                  <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                    {format(new Date(item.lastUpdated), 'MMM d, yyyy')}
                  </td>
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
      {selectedItem && !isEditModalOpen && !isDeleteModalOpen && (
        <StockDetailsModal
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          item={selectedItem}
        />
      )}
    </div>
  );
};

export default Stock;