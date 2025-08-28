import React, { useState, useEffect, useMemo, useCallback} from 'react';
import { Plus, Search, Edit2, Trash2, Loader2, CheckSquare, RefreshCw, ChevronDown, Play } from 'lucide-react';
// import { motion } from 'framer-motion';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/modals/Modal';
import AddStockForm from '../../components/stock/AddStockForm';
import EditStockForm from '../../components/stock/EditStockForm';
import QuickAddStockForm from '../../components/stock/QuickAddStockForm';
import StockDetailsModal from '../../components/modals/StockDetailsModal';
import DeleteConfirmationModal from '../../components/modals/DeleteConfirmationModal';
import LocationConfirmationModal from '../../components/modals/LocationConfirmationModal';
import { StockItem } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, orderBy, Timestamp, getCountFromServer, where } from 'firebase/firestore';
import { format } from 'date-fns';

const Stock: React.FC = () => {
  const [nameSearchQuery, setNameSearchQuery] = useState(''); // New state for name search
  const [debouncedNameSearchQuery, setDebouncedNameSearchQuery] = useState(''); // Debounced name search
  const [barcodeAsinSearchQuery, setBarcodeAsinSearchQuery] = useState(''); // New state for barcode/ASIN search
  const [debouncedBarcodeAsinSearchQuery, setDebouncedBarcodeAsinSearchQuery] = useState(''); // Debounced barcode/ASIN search
  const [sortBy, setSortBy] = useState('name');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
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
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);
  const [isLocationConfirmModalOpen, setIsLocationConfirmModalOpen] = useState(false);
  const [pendingStockData, setPendingStockData] = useState<Omit<StockItem, 'id'>[] | null>(null);
  const [locationConfirmationData, setLocationConfirmationData] = useState<{
    locationCode: string;
    shelfNumber: string;
    existingProducts: StockItem[];
    newProductName: string;
  } | null>(null);
  const [storeFilter, setStoreFilter] = useState<{ storeName: string; fulfillmentType: string } | null>(null);
  const [isStoreFilterOpen, setIsStoreFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending'>('all');
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const [totalCount, setTotalCount] = useState<number | null>(null);


  // Debounce name search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedNameSearchQuery(nameSearchQuery);
    }, 300);
    return () => {
      clearTimeout(handler);
    };
  }, [nameSearchQuery]);

  // Debounce barcode/ASIN search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedBarcodeAsinSearchQuery(barcodeAsinSearchQuery);
    }, 300);
    return () => {
      clearTimeout(handler);
    };
  }, [barcodeAsinSearchQuery]);

  // Fetch stock items from Firestore
  const fetchStockItems = useCallback (async () => {
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
  },[showToast])

  const fetchTotalCount = useCallback(async () => {
    try {
      const coll = collection(db, 'inventory');
      const snapshot = await getCountFromServer(coll);
      setTotalCount(snapshot.data().count);
    } catch {
      setTotalCount(null);
    }
  },[]);

  useEffect(() => {
    fetchStockItems();
    fetchTotalCount();
  }, [fetchStockItems,fetchTotalCount]);

  // Close store filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.store-filter-dropdown')) {
        setIsStoreFilterOpen(false);
      }
      if (!target.closest('.status-filter-dropdown')) {
        setIsStatusFilterOpen(false);
      }
    };

    if (isStoreFilterOpen || isStatusFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isStoreFilterOpen, isStatusFilterOpen]);

  const sortOptions = useMemo(() => [
    { value: 'name', label: 'Name (A-Z)' },
    { value: 'quantity', label: 'Quantity (High-Low)' },
    { value: 'price', label: 'Price (High-Low)' },
    { value: 'date', label: 'Date Updated' }
  ], []);

  const predefinedStores = useMemo(() => ['supply & serve', 'APHY', 'AZTEC', 'ZK'], []);


  // Filter and sort items
  const filteredItems = useMemo(() => {
    const nameSearchLower = debouncedNameSearchQuery.toLowerCase();
    const barcodeAsinSearchLower = debouncedBarcodeAsinSearchQuery.toLowerCase();
    
    return items.filter(item => {
      // Hide products with quantity 0
      if (item.quantity === 0) return false;
      
      // Name search: check if name starts with the search query
      const matchesName = debouncedNameSearchQuery === '' || 
        item.name.toLowerCase().startsWith(nameSearchLower);
      
      // Barcode/ASIN search: check if barcode or ASIN contains the search query
      const matchesBarcodeAsin = debouncedBarcodeAsinSearchQuery === '' || 
        (item.barcode && item.barcode.toLowerCase().includes(barcodeAsinSearchLower)) ||
        (item.asin && item.asin.split(',').some(asin => 
          asin.trim().toLowerCase().includes(barcodeAsinSearchLower)
        ));
      
      // Handle store and fulfillment type filter
      const matchesStoreFilter = storeFilter 
        ? (storeFilter.storeName === 'other' 
            ? !predefinedStores.includes(item.storeName) && item.fulfillmentType === storeFilter.fulfillmentType
            : item.storeName === storeFilter.storeName && item.fulfillmentType === storeFilter.fulfillmentType)
        : true;
      
      // Handle status filter
      const matchesStatusFilter = statusFilter === 'all' || item.status === statusFilter;
      
      // Both name and barcode/ASIN searches must match (if both are provided)
      return matchesName && matchesBarcodeAsin && matchesStoreFilter && matchesStatusFilter;
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
  }, [items, debouncedNameSearchQuery, debouncedBarcodeAsinSearchQuery, storeFilter, statusFilter, sortBy, predefinedStores]);

  const checkLocationForExistingProducts = useCallback((locationCode: string, shelfNumber: string): StockItem[] => {
    return items.filter(item => 
      item.locationCode === locationCode && item.shelfNumber === shelfNumber
    );
  }, [items]);

  const performAddStock = useCallback( async (data: Omit<StockItem, 'id'>[]) => {
    setIsLoading(true);
    
    try {
      const newItems: StockItem[] = [];
      
      // Check for hidden products with the same barcode and delete them
      for (const item of data) {
        if (item.barcode) {
          const hiddenProductQuery = query(
            collection(db, 'inventory'), 
            where('barcode', '==', item.barcode), 
            where('quantity', '==', 0)
          );
          const hiddenProductSnapshot = await getDocs(hiddenProductQuery);
          
          if (!hiddenProductSnapshot.empty) {
            // Delete the hidden product
            const hiddenProductDoc = hiddenProductSnapshot.docs[0];
            await deleteDoc(doc(db, 'inventory', hiddenProductDoc.id));
            
            // Remove from local state
            setItems(prev => prev.filter(existingItem => existingItem.id !== hiddenProductDoc.id));
            
            // Add activity log for deletion
            if (user) {
              const hiddenProductData = hiddenProductDoc.data();
              await addDoc(collection(db, 'activityLogs'), {
                user: user.name,
                role: user.role,
                detail: `deleted hidden product "${hiddenProductData.name}" with barcode ${item.barcode} from location ${hiddenProductData.locationCode}-${hiddenProductData.shelfNumber}`,
                time: new Date().toISOString()
              });
            }
          }
        }
      }
      
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
      setIsQuickAddModalOpen(false);
      showToast('Stock items added successfully', 'success');
    } catch (error) {
      console.error('Error adding stock:', error);
      showToast('Failed to add stock items', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [user,showToast]);

  const handleAddStock = useCallback( async (data: Omit<StockItem, 'id'>[]) => {
    // Check if any of the locations have existing products
    const locationsWithProducts: { locationCode: string; shelfNumber: string; products: StockItem[] }[] = [];
    
    for (const item of data) {
      const existingProducts = checkLocationForExistingProducts(item.locationCode, item.shelfNumber);
      if (existingProducts.length > 0) {
        locationsWithProducts.push({
          locationCode: item.locationCode,
          shelfNumber: item.shelfNumber,
          products: existingProducts
        });
      }
    }

    // If there are locations with existing products, show confirmation modal
    if (locationsWithProducts.length > 0) {
      const firstLocation = locationsWithProducts[0];
      setLocationConfirmationData({
        locationCode: firstLocation.locationCode,
        shelfNumber: firstLocation.shelfNumber,
        existingProducts: firstLocation.products,
        newProductName: data[0].name
      });
      setPendingStockData(data);
      setIsLocationConfirmModalOpen(true);
      return;
    }

    // If no existing products, proceed with adding
    await performAddStock(data);
  }, [checkLocationForExistingProducts, performAddStock]);

  

  const handleLocationConfirm = useCallback(async () => {
    if (pendingStockData) {
      await performAddStock(pendingStockData);
      setIsLocationConfirmModalOpen(false);
      setPendingStockData(null);
      setLocationConfirmationData(null);
    }
  },[pendingStockData, performAddStock]);

  const handleLocationCancel = useCallback(() => {
    setIsLocationConfirmModalOpen(false);
    setPendingStockData(null);
    setLocationConfirmationData(null);
  },[]);

  const handleEditStock = useCallback(async (data: StockItem, originalItem: StockItem) => {
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
        if (data.unit !== originalItem.unit) {
            changes.unit = data.unit;
            logChanges.push(`unit from "${originalItem.unit || 'none'}" to "${data.unit || 'none'}"`);
        }
        if (data.barcode !== originalItem.barcode) {
            changes.barcode = data.barcode;
            logChanges.push(`barcode from "${originalItem.barcode || 'none'}" to "${data.barcode || 'none'}"`);
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
  }, [items,user,showToast]);

const handleConfirmQuantityUpdate = useCallback( async () => {
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
},[pendingQuantityUpdate, items, user, showToast]);


  const handleDeleteStock = useCallback( async (id: string) => {
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
  },[items, user, showToast]);

  const handleItemClick = useCallback((item: StockItem) => {
    setSelectedItem(item);
  }, []);

  const handleEditClick = useCallback((e: React.MouseEvent, item: StockItem) => {
    e.stopPropagation();
    setSelectedItem(item);
    setIsEditModalOpen(true);
  }, []);

  const handleDeleteClick = useCallback((e: React.MouseEvent, item: StockItem) => {
    e.stopPropagation();
    setSelectedItem(item);
    setIsDeleteModalOpen(true);
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map(item => item.id)));
    }
  }, [filteredItems, selectedItems.size]);

  const handleSelectItem = useCallback((id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  }, [selectedItems]);

  const handleBulkDelete = useCallback(async () => {
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
      setIsBulkDeleteModalOpen(false);
      showToast(`Successfully deleted ${selectedItems.size} items`, 'success');
    } catch (error) {
      console.error('Error deleting items:', error);
      showToast('Failed to delete selected items', 'error');
    } finally {
      setIsLoading(false);
    }
  },[selectedItem, items, user, showToast]);

  const handleBulkActivate = useCallback(async () => {
    if (selectedItems.size === 0) return;
    
    setIsLoading(true);
    try {
      // Get details of items to be activated
      const itemsToActivate = items.filter(item => selectedItems.has(item.id) && item.status === 'pending');
      
      if (itemsToActivate.length === 0) {
        showToast('No pending items selected to activate', 'error');
        return;
      }
      
      // Update all selected pending items to active status
      const updatePromises = itemsToActivate.map(item => 
        updateDoc(doc(db, 'inventory', item.id), {
          status: 'active',
          lastUpdated: Timestamp.fromDate(new Date())
        })
      );
      await Promise.all(updatePromises);
      
      // Add activity log
      if (user) {
        const itemsList = itemsToActivate.map(item => 
          `"${item.name}" from ${item.locationCode}-${item.shelfNumber}`
        ).join(', ');
        
        await addDoc(collection(db, 'activityLogs'), {
          user: user.name,
          role: user.role,
          detail: `Bulk activated ${itemsToActivate.length} pending products: ${itemsList}`,
          time: new Date().toISOString()
        });
      }
      
      // Update local state
      setItems(items.map(item => 
        selectedItems.has(item.id) && item.status === 'pending'
          ? { ...item, status: 'active', lastUpdated: new Date() }
          : item
      ));
      setSelectedItems(new Set());
      setIsSelectionMode(false);
      showToast(`Successfully activated ${itemsToActivate.length} items`, 'success');
    } catch (error) {
      console.error('Error activating items:', error);
      showToast('Failed to activate selected items', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedItem, items, user, showToast]);

  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode(!isSelectionMode);
    if (!isSelectionMode) {
      setSelectedItems(new Set());
    }
  }, [isSelectionMode]);

  const DesktopTableRow = useCallback(({ item }: { item: StockItem; index: number }) => (
    <tr
      key={item.id}
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
        {item.unit || '-'}
      </td>
      <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          item.status === 'active' 
            ? 'bg-green-100 text-green-700'
            : 'bg-yellow-100 text-yellow-700'
        }`}>
          {item.status === 'active' ? 'Active' : 'Pending'}
        </span>
      </td>
      <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          item.fulfillmentType === 'fba' 
            ? 'bg-green-100 text-green-700'
            : 'bg-orange-100 text-orange-700'
        }`}>
          {item.fulfillmentType.toUpperCase()}
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
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 text-center">
              Critical Low
            </span>
          )}
          {item.quantity > 10 && item.quantity <= 25 && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700 text-center">
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
    </tr>
  ), [isSelectionMode, selectedItems, isDarkMode, user, handleItemClick, handleSelectItem, handleEditClick, handleDeleteClick]);

  return (
    <div className="space-y-6">
      {/* Total Products Indicator */}
      <div className="flex items-center justify-between py-4">
        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Inbound
        </h1>
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${isDarkMode ? 'bg-slate-800 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
          Total Products: {totalCount !== null ? totalCount : <span className="animate-pulse">...</span>}
        </span>
      </div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div>
          <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mt-1`}>
            Manage your inbound stock, track quantities, and monitor product status
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {isSelectionMode ? (
            <>
              {statusFilter === 'pending' && (
                <Button
                  onClick={handleBulkActivate}
                  variant="primary"
                  className="flex items-center gap-2 w-full sm:w-auto"
                  disabled={isLoading || selectedItems.size === 0}
                >
                  <Play size={16} />
                  Go Live ({selectedItems.size})
                </Button>
              )}
              <Button
                onClick={() => setIsBulkDeleteModalOpen(true)}
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
                variant="secondary"
                onClick={() => setIsQuickAddModalOpen(true)}
                className="flex items-center gap-2 w-full sm:w-auto"
              >
                <Plus size={16} />
                Quick Add
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name Search */}
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`} size={16} />
              <Input
                type="text"
                placeholder="Search by product name"
                value={nameSearchQuery}
                onChange={(e) => setNameSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {/* Barcode/ASIN Search */}
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`} size={16} />
              <Input
                type="text"
                placeholder="Search by barcode or ASIN"
                value={barcodeAsinSearchQuery}
                onChange={(e) => setBarcodeAsinSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
        <div className="w-full sm:w-48">
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            options={sortOptions}
          />
        </div>
        
        <div className="flex flex-row gap-2">
          <div className="relative status-filter-dropdown">
            <Button
              variant="secondary"
              onClick={() => setIsStatusFilterOpen(!isStatusFilterOpen)}
              className={`flex items-center gap-2 ${statusFilter !== 'all' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : ''}`}
            >
              {statusFilter === 'all' ? 'Status Filter' : statusFilter === 'active' ? 'Active' : 'Pending'}
              <ChevronDown size={16} />
            </Button>
            {isStatusFilterOpen && (
              <div className={`absolute top-full left-0 mt-1 w-32 z-50 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-lg`}>
                <div className="p-2">
                  <div className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Filter by Status</div>
                  <div 
                    className={`px-3 py-2 text-sm cursor-pointer rounded transition-colors ${isDarkMode ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'} ${statusFilter === 'all' ? (isDarkMode ? 'bg-slate-700' : 'bg-slate-100') : ''}`}
                    onClick={() => {
                      setStatusFilter('all');
                      setIsStatusFilterOpen(false);
                    }}
                  >
                    All
                  </div>
                  <div 
                    className={`px-3 py-2 text-sm cursor-pointer rounded transition-colors ${isDarkMode ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'} ${statusFilter === 'active' ? (isDarkMode ? 'bg-slate-700' : 'bg-slate-100') : ''}`}
                    onClick={() => {
                      setStatusFilter('active');
                      setIsStatusFilterOpen(false);
                    }}
                  >
                    Active
                  </div>
                  <div 
                    className={`px-3 py-2 text-sm cursor-pointer rounded transition-colors ${isDarkMode ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'} ${statusFilter === 'pending' ? (isDarkMode ? 'bg-slate-700' : 'bg-slate-100') : ''}`}
                    onClick={() => {
                      setStatusFilter('pending');
                      setIsStatusFilterOpen(false);
                    }}
                  >
                    Pending
                  </div>
                  <div className={`border-t ${isDarkMode ? 'border-slate-700' : 'border-slate-200'} mt-2 pt-2`}>
                    <button
                      className={`w-full text-left px-3 py-2 text-sm cursor-pointer rounded transition-colors ${isDarkMode ? 'text-red-400 hover:bg-slate-700' : 'text-red-600 hover:bg-slate-100'}`}
                      onClick={() => {
                        setStatusFilter('all');
                        setIsStatusFilterOpen(false);
                      }}
                    >
                      Clear Filter
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="relative store-filter-dropdown">
          <Button
            variant="secondary"
            onClick={() => setIsStoreFilterOpen(!isStoreFilterOpen)}
            className={`flex items-center gap-2 ${storeFilter ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : ''}`}
          >
            {storeFilter ? `${storeFilter.storeName === 'other' ? 'Other' : storeFilter.storeName} - ${storeFilter.fulfillmentType.toUpperCase()}` : 'Store Filter'}
            <ChevronDown size={16} />
          </Button>
          {isStoreFilterOpen && (
            <div className={`absolute top-full left-0 mt-1 w-64 z-50 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-lg`}>
              <div className="p-2">
                <div className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Filter by Store & Type</div>
                {['supply & serve', 'APHY', 'AZTEC', 'ZK', 'other'].map((storeName) => (
                  <div key={storeName} className="group relative">
                    <div className={`px-3 py-2 text-sm cursor-pointer rounded transition-colors ${isDarkMode ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'} ${storeFilter?.storeName === storeName ? (isDarkMode ? 'bg-slate-700' : 'bg-slate-100') : ''}`}>
                      {storeName}
                    </div>
                    <div className={`absolute right-full top-0 mr-1 hidden group-hover:block w-24 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-lg shadow-lg`}>
                      {storeName !== 'supply & serve' && (
                        <div 
                          className={`px-3 py-2 text-sm cursor-pointer transition-colors ${isDarkMode ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'} ${storeFilter?.storeName === storeName && storeFilter?.fulfillmentType === 'fba' ? (isDarkMode ? 'bg-slate-700' : 'bg-slate-100') : ''}`}
                          onClick={() => {
                            setStoreFilter({ storeName, fulfillmentType: 'fba' });
                            setIsStoreFilterOpen(false);
                          }}
                        >
                          FBA
                        </div>
                      )}
                      <div 
                        className={`px-3 py-2 text-sm cursor-pointer transition-colors ${isDarkMode ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'} ${storeFilter?.storeName === storeName && storeFilter?.fulfillmentType === 'mf' ? (isDarkMode ? 'bg-slate-700' : 'bg-slate-100') : ''}`}
                        onClick={() => {
                          setStoreFilter({ storeName, fulfillmentType: 'mf' });
                          setIsStoreFilterOpen(false);
                        }}
                      >
                        MF
                      </div>
                    </div>
                  </div>
                ))}
                <div className={`border-t ${isDarkMode ? 'border-slate-700' : 'border-slate-200'} mt-2 pt-2`}>
                  <button
                    className={`w-full text-left px-3 py-2 text-sm cursor-pointer rounded transition-colors ${isDarkMode ? 'text-red-400 hover:bg-slate-700' : 'text-red-600 hover:bg-slate-100'}`}
                    onClick={() => {
                      setStoreFilter(null);
                      setIsStoreFilterOpen(false);
                    }}
                  >
                    Clear Filter
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
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
                <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Unit</th>
                <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Status</th>
                <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>FT</th>
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
                <DesktopTableRow key={item.id} item={item} index={index} />
                // <motion.tr
                //   key={item.id}
                //   initial={{ opacity: 0, y: 20 }}
                //   animate={{ opacity: 1, y: 0 }}
                //   transition={{ 
                //     duration: 0.3,
                //     delay: index * 0.05,
                //     ease: "easeOut"
                //   }}
                //   className={`hover:${isDarkMode ? 'bg-slate-700/50' : 'bg-slate-50'} cursor-pointer`}
                //   onClick={() => handleItemClick(item)}
                // >
                //   {isSelectionMode && (
                //     <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`} onClick={(e) => e.stopPropagation()}>
                //       <input
                //         type="checkbox"
                //         checked={selectedItems.has(item.id)}
                //         onChange={() => handleSelectItem(item.id)}
                //         className={`h-4 w-4 text-blue-600 rounded ${isDarkMode ? 'border-slate-600 bg-slate-700' : 'border-slate-300'} focus:ring-blue-500`}
                //       />
                //     </td>
                //   )}
                //   <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-blue-400' : 'text-blue-700'} font-medium`}>{item.name}</td>
                //   <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                //     <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                //       item.status === 'active' 
                //         ? 'bg-green-100 text-green-700'
                //         : 'bg-yellow-100 text-yellow-700'
                //     }`}>
                //       {item.status === 'active' ? 'Active' : 'Pending'}
                //     </span>
                //   </td>
                //   <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                //     <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                //       item.fulfillmentType === 'fba' 
                //         ? 'bg-green-100 text-green-700'
                //         : 'bg-orange-100 text-orange-700'
                //     }`}>
                //       {item.fulfillmentType.toUpperCase()}
                //     </span>
                //   </td>
                //   <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{item.locationCode} - {item.shelfNumber}</td>
                //   <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                //     {item.asin ? (
                //       item.asin.split(',').length > 3
                //         ? item.asin.split(',').slice(0, 3).map(a => a.trim()).join(', ') + '...'
                //         : item.asin.split(',').map(a => a.trim()).join(', ')
                //     ) : (
                //       '-'
                //     )}
                //   </td>
                //   {user?.role === 'admin' && (
                //     <>
                //       <td className={`px-4 py-3 text-right text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                //         {Number(item.price) > 0 ? `£${Number(item.price).toFixed(2)}` : '(Not set)'}
                //       </td>
                //       <td className={`px-4 py-3 text-right text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-900'}`}>
                //         {Number(item.quantity * item.price) > 0 ? `£${Number(item.quantity * item.price).toFixed(2)}` : '(Not set)'}
                //       </td>
                //     </>
                //   )}
                //   <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'} text-right`}>
                //     <div className="flex items-center justify-end gap-2">
                //       {item.quantity <= 10 && (
                //         <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 text-center">
                //           Critical Low
                //         </span>
                //       )}
                //       {item.quantity > 10 && item.quantity <= 25 && (
                //         <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
                //           Low Stock
                //         </span>
                //       )}
                //       <span>{item.quantity}</span>
                //     </div>
                //   </td>
                //     <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{format(new Date(item.lastUpdated), 'MMM d, yyyy')}</td>
                //   <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'} text-right`}>
                //     <div className="flex items-center justify-end gap-2">
                //       <button
                //         onClick={(e) => handleEditClick(e, item)}
                //         className={`p-1 ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} transition-colors`}
                //       >
                //         <Edit2 size={16} />
                //       </button>
                //       <button
                //         onClick={(e) => handleDeleteClick(e, item)}
                //         className={`p-1 ${isDarkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'} transition-colors`}
                //       >
                //         <Trash2 size={16} />
                //       </button>
                //     </div>
                //   </td>
                // </motion.tr>
              ))}
            </tbody>
          </table>
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
                  <div className="flex gap-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      item.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {item.status === 'active' ? 'Active' : 'Pending'}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      item.fulfillmentType === 'fba'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-orange-100 text-orange-700'
                    }`}>
                      {item.fulfillmentType.toUpperCase()}
                    </span>
                  </div>
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

      {/* Quick Add Stock Modal */}
      <Modal
        isOpen={isQuickAddModalOpen}
        onClose={() => setIsQuickAddModalOpen(false)}
        title="Quick Add Stock"
        size="md"
      >
        <QuickAddStockForm 
          onSubmit={handleAddStock}
          onClose={() => setIsQuickAddModalOpen(false)}
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
      {selectedItem && !isEditModalOpen && !isDeleteModalOpen && !isQuantityConfirmModalOpen && (
        <StockDetailsModal
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          item={selectedItem}
        />
      )}
      <DeleteConfirmationModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => {
          setIsBulkDeleteModalOpen(false);
          setSelectedItems(new Set());
        }}
        onConfirm={handleBulkDelete}
        title="Delete Selected Items"
        message={`Are you sure you want to delete ${selectedItems.size} selected item${selectedItems.size > 1 ? 's' : ''}? This action cannot be undone.`}
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

      {/* Location Confirmation Modal */}
      {locationConfirmationData && (
        <LocationConfirmationModal
          isOpen={isLocationConfirmModalOpen}
          onClose={handleLocationCancel}
          onConfirm={handleLocationConfirm}
          onCancel={handleLocationCancel}
          locationCode={locationConfirmationData.locationCode}
          shelfNumber={locationConfirmationData.shelfNumber}
          existingProducts={locationConfirmationData.existingProducts}
          newProductName={locationConfirmationData.newProductName}
        />
      )}
    </div>
  );
};

export default Stock;