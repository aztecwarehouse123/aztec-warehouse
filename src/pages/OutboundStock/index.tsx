import React, { useState, useEffect } from 'react';
import { Search, Edit2, Loader2, RefreshCw, Barcode, AlertTriangle, ChevronDown } from 'lucide-react';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/modals/Modal';
import BarcodeScanModal from '../../components/modals/BarcodeScanModal';
import OutboundEditForm from '../../components/stock/OutboundEditForm';
import StockDetailsModal from '../../components/modals/StockDetailsModal';
import { StockItem, ActivityLog } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, query, orderBy, Timestamp, getDoc, where } from 'firebase/firestore';
import { format, subDays } from 'date-fns';

const OutboundStock: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);
  const [items, setItems] = useState<StockItem[]>([]);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [productsWithoutRecentDeductions, setProductsWithoutRecentDeductions] = useState<Set<string>>(new Set());
  const [storeFilter, setStoreFilter] = useState<{ storeName: string; fulfillmentType: string } | null>(null);
  const [isStoreFilterOpen, setIsStoreFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending'>('all');
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const { showToast } = useToast();
  const { isDarkMode } = useTheme();
  const { user } = useAuth();

  // Predefined stores for filtering
  const predefinedStores = ['supply & serve', 'APHY', 'AZTEC', 'ZK', 'Fahiz'];

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

  // Fetch activity logs and check for recent deductions
  const fetchActivityLogsAndCheckDeductions = async () => {
    try {
      // Fetch activity logs from the last 90 days to check for product additions and deductions
      const ninetyDaysAgo = subDays(new Date(), 90);
      const logsQuery = query(
        collection(db, 'activityLogs'),
        where('time', '>=', ninetyDaysAgo.toISOString()),
        orderBy('time', 'desc')
      );
      
      const logsSnapshot = await getDocs(logsQuery);
      const logsData = logsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ActivityLog[];
      
      // Check which products haven't been deducted in the last 10 days
      const tenDaysAgo = subDays(new Date(), 10);
      const productsWithRecentDeductions = new Set<string>();
      
      // Track when each product was first added to the system
      const productFirstAddedDates = new Map<string, Date>();
      
      logsData.forEach(log => {
        // Check for product additions
        if (log.detail.includes('added new product')) {
          const productMatch = log.detail.match(/added new product "([^"]+)"/);
          if (productMatch) {
            const productName = productMatch[1];
            const logDate = new Date(log.time);
            
            // Only set the first added date if we haven't seen this product before
            // or if this log is earlier than the previously recorded date
            if (!productFirstAddedDates.has(productName) || logDate < productFirstAddedDates.get(productName)!) {
              productFirstAddedDates.set(productName, logDate);
            }
          }
        }
        
        // Check for deductions
        if (log.detail.includes('units deducted from stock')) {
          const productMatch = log.detail.match(/units deducted from stock "([^"]+)"/);
          if (productMatch) {
            const productName = productMatch[1];
            const logDate = new Date(log.time);
            if (logDate >= tenDaysAgo) {
              productsWithRecentDeductions.add(productName);
            }
          }
        }
      });
      
      // Get all product names from inventory and check their age
      const productsWithoutDeductions = new Set<string>();
      items.forEach(item => {
        const productName = item.name;
        const firstAddedDate = productFirstAddedDates.get(productName);
        
        // Only show warning if:
        // 1. We can find when the product was first added (has activity log)
        // 2. Product has been in system for more than 10 days (based on first added date)
        // 3. Product hasn't been deducted in the last 10 days
        if (firstAddedDate && firstAddedDate < tenDaysAgo && !productsWithRecentDeductions.has(productName)) {
          productsWithoutDeductions.add(productName);
        }
      });
      
      setProductsWithoutRecentDeductions(productsWithoutDeductions);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
    }
  };

  useEffect(() => {
    fetchStockItems();
  }, [showToast]);

  useEffect(() => {
    if (items.length > 0) {
      fetchActivityLogsAndCheckDeductions();
    }
  }, [items]);

  // Close filter dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isStoreFilterOpen || isStatusFilterOpen) {
        const target = event.target as Element;
        if (!target.closest('.store-filter-dropdown') && !target.closest('.status-filter-dropdown')) {
          setIsStoreFilterOpen(false);
          setIsStatusFilterOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isStoreFilterOpen, isStatusFilterOpen]);

  // Clear all filters
  const clearAllFilters = () => {
    setStoreFilter(null);
    setStatusFilter('all');
    setIsStoreFilterOpen(false);
    setIsStatusFilterOpen(false);
  };

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
      
      // Handle store and fulfillment type filter
      const matchesStoreFilter = storeFilter 
        ? (storeFilter.storeName === 'other' 
            ? !predefinedStores.includes(item.storeName) && item.fulfillmentType === storeFilter.fulfillmentType
            : item.storeName === storeFilter.storeName && item.fulfillmentType === storeFilter.fulfillmentType)
        : true;
      
      // Handle status filter
      const matchesStatusFilter = statusFilter === 'all' || item.status === statusFilter;
      
      return (matchesName || matchesLocation || matchesAsin || matchesBarcode) && matchesStoreFilter && matchesStatusFilter;
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
        
        detail: `${originalItem.quantity - data.quantity} units deducted from stock "${originalItem.name}" (Reason: ${data.reason}, Store: ${data.storeName}) by ${user.role} from location ${originalItem.locationCode} shelf ${originalItem.shelfNumber}`,
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

  const handleScan = () => {
    setIsScanModalOpen(true);
  };

  const handleBarcodeScanned = (barcode: string) => {
    setSearchQuery(barcode);
    setIsScanModalOpen(false);
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
          <div className="relative">
            <Input
              type="text"
              placeholder="Search by name, location, ASIN or barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search size={16} />}
              style={{ paddingRight: 48 }}
            />
            <button
              type="button"
              onClick={handleScan}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 rounded-md transition-colors bg-blue-500 hover:bg-blue-600 focus:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 border-none p-0"
              style={{ zIndex: 2 }}
              title="Scan barcode"
              tabIndex={0}
              aria-label="Scan barcode"
            >
              <Barcode size={16} className="text-white" />
            </button>
          </div>
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
        
        <div className="flex flex-row gap-2">
          {/* Status Filter */}
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
          
          {/* Store Filter */}
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
                {['supply & serve', 'APHY', 'AZTEC', 'ZK', 'Fahiz', 'other'].map((storeName) => (
                  <div key={storeName} className="group relative">
                    <div className={`px-3 py-2 text-sm cursor-pointer rounded transition-colors ${isDarkMode ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'} ${storeFilter?.storeName === storeName ? (isDarkMode ? 'bg-slate-700' : 'bg-slate-100') : ''}`}>
                      {storeName}
                    </div>
                    <div className={`absolute right-full top-0 mr-1 hidden group-hover:block w-24 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-lg shadow-lg`}>
                      <div 
                        className={`px-3 py-2 text-sm cursor-pointer transition-colors ${isDarkMode ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'} ${storeFilter?.storeName === storeName && storeFilter?.fulfillmentType === 'fba' ? (isDarkMode ? 'bg-slate-700' : 'bg-slate-100') : ''}`}
                        onClick={() => {
                          setStoreFilter({ storeName, fulfillmentType: 'fba' });
                          setIsStoreFilterOpen(false);
                        }}
                      >
                        FBA
                      </div>
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
            onClick={() => {
              fetchStockItems();
              clearAllFilters();
            }}
            className={`flex items-center gap-2 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isLoading}
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </Button>
          
          {/* Clear Filters Button */}
          {(storeFilter || statusFilter !== 'all') && (
            <Button
              variant="secondary"
              onClick={clearAllFilters}
              className="flex items-center gap-2"
            >
              Clear Filters
            </Button>
          )}
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
                <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Unit</th>
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
                    <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-blue-400' : 'text-blue-700'} font-medium`}>
                      <div className="flex items-center gap-2">
                        {item.name}
                        {productsWithoutRecentDeductions.has(item.name) && (
                          <div className="relative group">
                            <AlertTriangle 
                              className="h-4 w-4 text-red-500 flex-shrink-0" 
                            />
                            <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-xs rounded-lg shadow-lg z-50 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity ${
                              isDarkMode 
                                ? 'bg-slate-800 text-red-300 border border-red-500' 
                                : 'bg-white text-red-700 border border-red-300'
                            }`}>
                              This product has not been deducted for 10+ days
                              <div className={`absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent ${
                                isDarkMode ? 'border-t-slate-800' : 'border-t-white'
                              }`}></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                      {item.unit || '-'}
                    </td>
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
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 text-center ">
                            Critical Low
                          </span>
                        )}
                        {item.quantity > 10 && item.quantity <= 25 && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700 text-center ">
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
                  <div className="flex items-center gap-2">
                    {productsWithoutRecentDeductions.has(item.name) && (
                      <div className="relative group">
                        <AlertTriangle 
                          className="h-4 w-4 text-red-500 flex-shrink-0" 
                        />
                        <div className={`absolute bottom-full right-0 mb-2 px-3 py-2 text-xs rounded-lg shadow-lg z-50 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity ${
                          isDarkMode 
                            ? 'bg-slate-800 text-red-300 border border-red-500' 
                            : 'bg-white text-red-700 border border-red-300'
                        }`}>
                          This product has not been deducted for 10+ days
                          <div className={`absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent ${
                            isDarkMode ? 'border-t-slate-800' : 'border-t-white'
                          }`}></div>
                        </div>
                      </div>
                    )}
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      item.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {item.status === 'active' ? 'Active' : 'Pending'}
                    </span>
                  </div>
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

      <BarcodeScanModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        onBarcodeScanned={handleBarcodeScanned}
      />
    </div>
  );
};

export default OutboundStock; 