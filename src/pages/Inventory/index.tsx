import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Edit2, Check, X, Search, Loader2, RefreshCw, ChevronDown, Eye, Package, AlertCircle, Copy, CheckCircle2, PoundSterling } from 'lucide-react';
// import { motion } from 'framer-motion';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../config/firebase';
import { collection, doc, getDocs, getCountFromServer, orderBy, query, Timestamp, updateDoc, addDoc } from 'firebase/firestore';
import { StockItem } from '../../types';
import StockDetailsModal from '../../components/modals/StockDetailsModal';
import StatsCard from '../../components/dashboard/StatsCard';

const Inventory: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { showToast } = useToast();
  const { user } = useAuth();
  useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState<StockItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editRowId, setEditRowId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<string>('');
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [damageFilter, setDamageFilter] = useState<'all' | 'damaged' | 'notDamaged'>('all');
  const [duplicateFilter, setDuplicateFilter] = useState<'all' | 'duplicates' | 'unique'>('all');
  const [isDamageFilterOpen, setIsDamageFilterOpen] = useState(false);
  const [isDuplicateFilterOpen, setIsDuplicateFilterOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);

  type FirestoreStock = Omit<StockItem, 'id' | 'lastUpdated'> & { lastUpdated: Timestamp | string | Date };

  const logActivity = async (details: string) => {
    if (!user) return;
    
    try {
      await addDoc(collection(db, 'activityLogs'), {
        user: user.name,
        role: user.role,
        detail: details,
        time: new Date().toISOString()
      });
    } catch (e) {
      console.error('Failed to log activity:', e);
    }
  };

  const fetchInventory = useCallback(async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'inventory'), orderBy('name'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(d => {
        const raw = d.data() as FirestoreStock;
        return {
          id: d.id,
          ...raw,
          lastUpdated: raw.lastUpdated instanceof Timestamp
            ? raw.lastUpdated.toDate()
            : new Date(raw.lastUpdated)
        } as StockItem;
      });
      setItems(data);
      
    } catch (err) {
      console.error('Failed to fetch inventory', err);
      showToast('Failed to fetch inventory', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  const fetchTotalCount = useCallback(async () => {
    try {
      const coll = collection(db, 'inventory');
      const snapshot = await getCountFromServer(coll);
      setTotalCount(snapshot.data().count);
    } catch {
      setTotalCount(null);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
    fetchTotalCount();
  }, [fetchInventory, fetchTotalCount]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.damage-filter-dropdown')) setIsDamageFilterOpen(false);
      if (!target.closest('.duplicate-filter-dropdown')) setIsDuplicateFilterOpen(false);
    };
    if (isDamageFilterOpen || isDuplicateFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDamageFilterOpen, isDuplicateFilterOpen]);

  const nameToUniqueLocations = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const item of items) {
      const nameKey = (item.name || '').trim().toLowerCase();
      if (!nameKey) continue;
      const locationKey = `${item.locationCode || ''}-${item.shelfNumber || ''}`.trim().toLowerCase();
      if (!map[nameKey]) map[nameKey] = new Set<string>();
      map[nameKey].add(locationKey);
    }
    return map;
  }, [items]);

  const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
      const handler = setTimeout(() => setDebouncedValue(value), delay);
      return () => clearTimeout(handler);
    }, [value, delay]);
    return debouncedValue;
  };
  const debouncedSearchQuery = useDebounce(searchQuery, 300);


  const filteredItems = useMemo(() => {
    const s = debouncedSearchQuery.trim().toLowerCase();
    return items.filter(item => {
      const name = item.name?.toLowerCase() || '';
      const asin = (item.asin || '').toLowerCase();
      const barcode = (item.barcode || '').toLowerCase();
      const matchesSearch = s ? (name.includes(s) || asin.includes(s) || barcode.includes(s)) : true;

      const matchesDamage = damageFilter === 'all'
        ? true
        : damageFilter === 'damaged'
          ? (item.damagedItems || 0) > 0
          : (item.damagedItems || 0) <= 0;

      const key = (item.name || '').trim().toLowerCase();
      const uniqueLocs = key ? (nameToUniqueLocations[key]?.size || 0) : 0;
      const isDuplicate = uniqueLocs > 1; // same product name in multiple locations
      const matchesDuplicate = duplicateFilter === 'all'
        ? true
        : duplicateFilter === 'duplicates'
          ? isDuplicate
          : !isDuplicate;

      return matchesSearch && matchesDamage && matchesDuplicate;
    });
  }, [items, debouncedSearchQuery, damageFilter, duplicateFilter, nameToUniqueLocations]);

  // Calculate total quantity of searched products
  const totalSearchedQuantity = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return 0;
    return filteredItems.reduce((total, item) => total + (item.quantity || 0), 0);
  }, [filteredItems, debouncedSearchQuery]);

  const stats = useMemo(() => {
    const total = filteredItems.length;
    let damaged = 0;
    let active = 0;
    let pending = 0;
    let priceSet = 0;
    let duplicates = 0;
    for (const item of filteredItems) {
      if ((item.damagedItems || 0) > 0) damaged++;
      if (item.status === 'active') active++;
      if (item.status === 'pending') pending++;
      if (Number(item.price) > 0) priceSet++;
      const key = (item.name || '').trim().toLowerCase();
      const uniqueLocs = key ? (nameToUniqueLocations[key]?.size || 0) : 0;
      if (uniqueLocs > 1) duplicates++;
    }
    const unique = total - duplicates;
    const noPrice = total - priceSet;
    return { total, damaged, duplicates, unique, active, pending, priceSet, noPrice };
  }, [filteredItems, nameToUniqueLocations]);

  const startEdit = (row: StockItem) => {
    setEditRowId(row.id);
    setEditPrice(row.price != null ? String(row.price) : '');
  };

  const cancelEdit = () => {
    setEditRowId(null);
    setEditPrice('');
  };

  const savePrice = async (row: StockItem) => {
    const parsed = Number(editPrice);
    if (Number.isNaN(parsed) || parsed < 0) {
      showToast('Enter a valid non-negative price', 'error');
      return;
    }
    setIsLoading(true);
    try {
      const now = new Date();
      const ref = doc(db, 'inventory', row.id);
      await updateDoc(ref, { price: parsed, lastUpdated: Timestamp.fromDate(now) });

      await logActivity(
        `updated price for ${row.name} (barcode: ${row.barcode}) from £${row.price || 0} to £${parsed.toFixed(2)}`
      );

      setItems(prev => prev.map(it => it.id === row.id ? { ...it, price: parsed, lastUpdated: now } : it));
      showToast('Price updated', 'success');
      setEditRowId(null);
      setEditPrice('');
    } catch (err) {
      console.error('Failed to update price', err);
      showToast('Failed to update price', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 p-2 sm:p-4 md:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-2 sm:py-4">
        <h1 className={`text-xl sm:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Inventory</h1>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-semibold ${isDarkMode ? 'bg-slate-800 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
            Total: {totalCount !== null ? totalCount : <span className="animate-pulse">...</span>}
          </span>
          <Button
            variant="secondary"
            onClick={() => { fetchInventory(); fetchTotalCount(); }}
            className={`flex items-center gap-1 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isLoading}
            size="sm"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>


      {/* Stats section */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 md:gap-6">
        {debouncedSearchQuery.trim()? (
          <StatsCard title="Total Quantity" value={totalSearchedQuantity} icon={<Package size={20} className="text-blue-600" />} />
        ):(
          <StatsCard title="Products" value={stats.total} icon={<Package size={20} className="text-blue-600" />} />
        )}
        
        <StatsCard title="Damaged" value={stats.damaged} icon={<AlertCircle size={20} className="text-blue-600" />}  />
        <StatsCard title="Duplicates" value={stats.duplicates} icon={<Copy size={20} className="text-blue-600" />}  />
        <StatsCard title="Unique" value={stats.unique} icon={<CheckCircle2 size={20} className="text-blue-600" />}  />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 md:gap-6 mt-2 sm:mt-4">
        <StatsCard title="Active" value={stats.active} icon={<CheckCircle2 size={20} className="text-blue-600" />}  />
        <StatsCard title="Pending" value={stats.pending} icon={<AlertCircle size={20} className="text-blue-600" />}  />
        <StatsCard title="With Price" value={stats.priceSet} icon={<PoundSterling size={20} className="text-blue-600" />}  />
        <StatsCard title="No Price" value={stats.noPrice} icon={<PoundSterling size={20} className="text-blue-600" />} />
      </div>

      <div className="flex flex-col gap-2 sm:gap-4">
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`} size={16} />
          <Input
            type="text"
            placeholder="Search by name, ASIN or barcode"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 text-sm sm:text-base"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <div className="relative damage-filter-dropdown flex-1">
            <Button
              variant="secondary"
              onClick={() => setIsDamageFilterOpen(!isDamageFilterOpen)}
              className={`flex items-center justify-between gap-2 w-full ${damageFilter !== 'all' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : ''}`}
              size="sm"
            >
              <span className="truncate">
                {damageFilter === 'all' ? 'Damage: All' : damageFilter === 'damaged' ? 'Damage: Damaged' : 'Damage: Not Damaged'}
              </span>
              <ChevronDown size={16} />
            </Button>
            {isDamageFilterOpen && (
              <div className={`absolute top-full left-0 mt-1 w-full z-50 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-lg`}>
                <div className="p-2">
                  <div className={`text-xs sm:text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Filter by Damage</div>
                  <div
                    className={`px-2 py-1.5 text-xs sm:text-sm cursor-pointer rounded transition-colors ${isDarkMode ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'} ${damageFilter === 'all' ? (isDarkMode ? 'bg-slate-700' : 'bg-slate-100') : ''}`}
                    onClick={() => { setDamageFilter('all'); setIsDamageFilterOpen(false); }}
                  >
                    All
                  </div>
                  <div
                    className={`px-2 py-1.5 text-xs sm:text-sm cursor-pointer rounded transition-colors ${isDarkMode ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'} ${damageFilter === 'damaged' ? (isDarkMode ? 'bg-slate-700' : 'bg-slate-100') : ''}`}
                    onClick={() => { setDamageFilter('damaged'); setIsDamageFilterOpen(false); }}
                  >
                    Damaged
                  </div>
                  <div
                    className={`px-2 py-1.5 text-xs sm:text-sm cursor-pointer rounded transition-colors ${isDarkMode ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'} ${damageFilter === 'notDamaged' ? (isDarkMode ? 'bg-slate-700' : 'bg-slate-100') : ''}`}
                    onClick={() => { setDamageFilter('notDamaged'); setIsDamageFilterOpen(false); }}
                  >
                    Not Damaged
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="relative duplicate-filter-dropdown flex-1">
            <Button
              variant="secondary"
              onClick={() => setIsDuplicateFilterOpen(!isDuplicateFilterOpen)}
              className={`flex items-center justify-between gap-2 w-full ${duplicateFilter !== 'all' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : ''}`}
              size="sm"
            >
              <span className="truncate">
                {duplicateFilter === 'all' ? 'Duplicates: All' : duplicateFilter === 'duplicates' ? 'Duplicates: Duplicates' : 'Duplicates: Unique'}
              </span>
              <ChevronDown size={16} />
            </Button>
            {isDuplicateFilterOpen && (
              <div className={`absolute top-full left-0 mt-1 w-full z-50 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-lg`}>
                <div className="p-2">
                  <div className={`text-xs sm:text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Filter by Duplicates</div>
                  <div
                    className={`px-2 py-1.5 text-xs sm:text-sm cursor-pointer rounded transition-colors ${isDarkMode ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'} ${duplicateFilter === 'all' ? (isDarkMode ? 'bg-slate-700' : 'bg-slate-100') : ''}`}
                    onClick={() => { setDuplicateFilter('all'); setIsDuplicateFilterOpen(false); }}
                  >
                    All
                  </div>
                  <div
                    className={`px-2 py-1.5 text-xs sm:text-sm cursor-pointer rounded transition-colors ${isDarkMode ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'} ${duplicateFilter === 'duplicates' ? (isDarkMode ? 'bg-slate-700' : 'bg-slate-100') : ''}`}
                    onClick={() => { setDuplicateFilter('duplicates'); setIsDuplicateFilterOpen(false); }}
                  >
                    Duplicates Only
                  </div>
                  <div
                    className={`px-2 py-1.5 text-xs sm:text-sm cursor-pointer rounded transition-colors ${isDarkMode ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'} ${duplicateFilter === 'unique' ? (isDarkMode ? 'bg-slate-700' : 'bg-slate-100') : ''}`}
                    onClick={() => { setDuplicateFilter('unique'); setIsDuplicateFilterOpen(false); }}
                  >
                    Unique Only
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className={`text-center py-8 sm:py-12 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-lg border`}>
          <div className="flex flex-col items-center gap-2 sm:gap-4">
            <Loader2 className={`w-6 h-6 sm:w-8 sm:h-8 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} animate-spin`} />
            <p className={`text-sm sm:text-base ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Loading inventory...</p>
          </div>
        </div>
      ) : filteredItems.length > 0 ? (
        <>
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto overflow-y-hidden">
            <table className={`min-w-full divide-y ${isDarkMode ? 'divide-slate-700' : 'divide-slate-200'} ${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-lg border ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
              <thead className={isDarkMode ? 'bg-slate-700/50' : 'bg-slate-100'}>
                <tr>
                  <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Name</th>
                  <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>ASIN</th>
                  <th className={`px-4 py-3 text-right text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Price</th>
                  <th className={`px-4 py-3 text-center text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Quantity</th>
                  <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Barcode</th>
                  <th className={`px-4 py-3 text-right text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>View</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDarkMode ? 'divide-slate-700' : 'divide-slate-200'}`}>
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="transition-all duration-100 hover:bg-opacity-10 hover:bg-blue-500"
                   
                  >
                    <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-blue-400' : 'text-blue-700'} font-medium`}>{item.name}</td>
                    <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                      {item.asin ? (
                        item.asin.split(',').length > 3
                          ? item.asin.split(',').slice(0, 3).map(a => a.trim()).join(', ') + '...'
                          : item.asin.split(',').map(a => a.trim()).join(', ')
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-900'} text-right`}>
                      {editRowId === item.id ? (
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <Input
                            type="number"
                            step="0.01"
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            className="w-28 text-right"
                          />
                          <Button size="sm" onClick={() => savePrice(item)} isLoading={isLoading}>
                            <Check size={14} />
                          </Button>
                          <Button size="sm" variant="secondary" onClick={cancelEdit} disabled={isLoading}>
                            <X size={14} />
                          </Button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); startEdit(item); }}
                          className={`${isDarkMode ? 'text-slate-200 hover:text-blue-300' : 'text-slate-900 hover:text-blue-700'} transition-colors`}
                        >
                          {Number(item.price) > 0 ? `£${Number(item.price).toFixed(2)}` : '(Not set)'}
                        </button>
                      )}
                    </td>
                    <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'} text-center`}>{item.quantity}</td>
                    <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{item.barcode || '-'}</td>
                    <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'} text-right`}>
                      <button
                        onClick={() => setSelectedItem(item)}
                        className={`${isDarkMode ? 'text-slate-300 hover:text-blue-300' : 'text-slate-600 hover:text-blue-700'} p-1`}
                        aria-label="View details"
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <div className="block md:hidden space-y-3">
            {filteredItems.map((item) => (
              <div key={item.id} className={`rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} p-3 shadow-sm flex flex-col gap-2`}>
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className={`font-semibold truncate ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>{item.name}</h3>
                    <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs mt-1">
                      <span className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>ASIN: <span className="font-medium">{item.asin?.split(',')[0] || '-'}</span></span>
                      <span className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>Barcode: <span className="font-medium">{item.barcode || '-'}</span></span>
                      <span className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>Quantity: <span className="font-medium">{item.quantity}</span></span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-sm font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                      {Number(item.price) > 0 ? `£${Number(item.price).toFixed(2)}` : 'No price'}
                    </span>
                    <div className="flex gap-1">
                      {editRowId === item.id ? (
                        <>
                          <Button size="sm" onClick={() => savePrice(item)} isLoading={isLoading}>
                            <Check size={12} />
                          </Button>
                          <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); cancelEdit(); }} disabled={isLoading}>
                            <X size={12} />
                          </Button>
                        </>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); startEdit(item); }}>
                          <Edit2 size={12} />
                        </Button>
                      )}
                      <Button size="sm" variant="secondary" onClick={() => setSelectedItem(item)}>
                        <Eye size={12} />
                      </Button>
                    </div>
                  </div>
                </div>
                {editRowId === item.id && (
                  <div className="mt-1">
                    <Input
                      type="number"
                      step="0.01"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      placeholder="Enter new price"
                      className="w-full text-sm"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className={`text-center py-8 sm:py-12 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-lg border`}>
          <p className={`text-sm sm:text-base ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>No items found. Try adjusting your search.</p>
        </div>
      )}
      {selectedItem && (
        <StockDetailsModal
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
          item={selectedItem}
        />
      )}
    </div>
  );
};

export default Inventory;

// import React, { useCallback, useEffect, useMemo, useState } from 'react';
// import { Edit2, Check, X, Search, Loader2, RefreshCw, ChevronDown, Eye, Package, AlertCircle, Copy, CheckCircle2, PoundSterling } from 'lucide-react';
// import { motion } from 'framer-motion';
// import Input from '../../components/ui/Input';
// import Button from '../../components/ui/Button';
// import { useTheme } from '../../contexts/ThemeContext';
// import { useToast } from '../../contexts/ToastContext';
// import { useAuth } from '../../contexts/AuthContext';
// import { db } from '../../config/firebase';
// import { collection, doc, getDocs, getCountFromServer, orderBy, query, Timestamp, updateDoc, addDoc } from 'firebase/firestore';
// import { StockItem } from '../../types';
// import StockDetailsModal from '../../components/modals/StockDetailsModal';
// import StatsCard from '../../components/dashboard/StatsCard';

// const Inventory: React.FC = () => {
//   const { isDarkMode } = useTheme();
//   const { showToast } = useToast();
//   const { user } = useAuth();
//   useAuth();

//   const [isLoading, setIsLoading] = useState(false);
//   const [items, setItems] = useState<StockItem[]>([]);
//   const [searchQuery, setSearchQuery] = useState('');
//   const [editRowId, setEditRowId] = useState<string | null>(null);
//   const [editPrice, setEditPrice] = useState<string>('');
//   const [totalCount, setTotalCount] = useState<number | null>(null);
//   const [damageFilter, setDamageFilter] = useState<'all' | 'damaged' | 'notDamaged'>('all');
//   const [duplicateFilter, setDuplicateFilter] = useState<'all' | 'duplicates' | 'unique'>('all');
//   const [isDamageFilterOpen, setIsDamageFilterOpen] = useState(false);
//   const [isDuplicateFilterOpen, setIsDuplicateFilterOpen] = useState(false);
//   const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);

//   type FirestoreStock = Omit<StockItem, 'id' | 'lastUpdated'> & { lastUpdated: Timestamp | string | Date };

//   const logActivity = async ( details: string) => {
//     if (!user) return;
    
//     try {
//       await addDoc(collection(db, 'activityLogs'), {
//         user: user.name,
//         role: user.role,
//         detail: details,
//         time: new Date().toISOString()
//       });
//     } catch (e) {
//       console.error('Failed to log activity:', e);
//     }
//   };

//   const fetchInventory = useCallback(async () => {
//     setIsLoading(true);
//     try {
//       const q = query(collection(db, 'inventory'), orderBy('name'));
//       const snapshot = await getDocs(q);
//       const data = snapshot.docs.map(d => {
//         const raw = d.data() as FirestoreStock;
//         return {
//           id: d.id,
//           ...raw,
//           lastUpdated: raw.lastUpdated instanceof Timestamp
//             ? raw.lastUpdated.toDate()
//             : new Date(raw.lastUpdated)
//         } as StockItem;
//       });
//       setItems(data);
      
//     } catch (err) {
//       console.error('Failed to fetch inventory', err);
//       showToast('Failed to fetch inventory', 'error');
//     } finally {
//       setIsLoading(false);
//     }
//   }, [showToast]);

//   const fetchTotalCount = useCallback(async () => {
//     try {
//       const coll = collection(db, 'inventory');
//       const snapshot = await getCountFromServer(coll);
//       setTotalCount(snapshot.data().count);
//     } catch {
//       setTotalCount(null);
//     }
//   }, []);

//   useEffect(() => {
//     fetchInventory();
//     fetchTotalCount();
//   }, [fetchInventory, fetchTotalCount]);

//   useEffect(() => {
//     const handleClickOutside = (event: MouseEvent) => {
//       const target = event.target as Element;
//       if (!target.closest('.damage-filter-dropdown')) setIsDamageFilterOpen(false);
//       if (!target.closest('.duplicate-filter-dropdown')) setIsDuplicateFilterOpen(false);
//     };
//     if (isDamageFilterOpen || isDuplicateFilterOpen) {
//       document.addEventListener('mousedown', handleClickOutside);
//     }
//     return () => {
//       document.removeEventListener('mousedown', handleClickOutside);
//     };
//   }, [isDamageFilterOpen, isDuplicateFilterOpen]);

//   const nameToUniqueLocations = useMemo(() => {
//     const map: Record<string, Set<string>> = {};
//     for (const item of items) {
//       const nameKey = (item.name || '').trim().toLowerCase();
//       if (!nameKey) continue;
//       const locationKey = `${item.locationCode || ''}-${item.shelfNumber || ''}`.trim().toLowerCase();
//       if (!map[nameKey]) map[nameKey] = new Set<string>();
//       map[nameKey].add(locationKey);
//     }
//     return map;
//   }, [items]);

//   const filteredItems = useMemo(() => {
//     const s = searchQuery.trim().toLowerCase();
//     return items.filter(item => {
//       const name = item.name?.toLowerCase() || '';
//       const asin = (item.asin || '').toLowerCase();
//       const barcode = (item.barcode || '').toLowerCase();
//       const matchesSearch = s ? (name.includes(s) || asin.includes(s) || barcode.includes(s)) : true;

//       const matchesDamage = damageFilter === 'all'
//         ? true
//         : damageFilter === 'damaged'
//           ? (item.damagedItems || 0) > 0
//           : (item.damagedItems || 0) <= 0;

//       const key = (item.name || '').trim().toLowerCase();
//       const uniqueLocs = key ? (nameToUniqueLocations[key]?.size || 0) : 0;
//       const isDuplicate = uniqueLocs > 1; // same product name in multiple locations
//       const matchesDuplicate = duplicateFilter === 'all'
//         ? true
//         : duplicateFilter === 'duplicates'
//           ? isDuplicate
//           : !isDuplicate;

//       return matchesSearch && matchesDamage && matchesDuplicate;
//     });
//   }, [items, searchQuery, damageFilter, duplicateFilter, nameToUniqueLocations]);

//   const stats = useMemo(() => {
//     const total = filteredItems.length;
//     let damaged = 0;
//     let active = 0;
//     let pending = 0;
//     let priceSet = 0;
//     let duplicates = 0;
//     for (const item of filteredItems) {
//       if ((item.damagedItems || 0) > 0) damaged++;
//       if (item.status === 'active') active++;
//       if (item.status === 'pending') pending++;
//       if (Number(item.price) > 0) priceSet++;
//       const key = (item.name || '').trim().toLowerCase();
//       const uniqueLocs = key ? (nameToUniqueLocations[key]?.size || 0) : 0;
//       if (uniqueLocs > 1) duplicates++;
//     }
//     const unique = total - duplicates;
//     const noPrice = total - priceSet;
//     return { total, damaged, duplicates, unique, active, pending, priceSet, noPrice };
//   }, [filteredItems, nameToUniqueLocations]);

//   const startEdit = (row: StockItem) => {
//     setEditRowId(row.id);
//     setEditPrice(row.price != null ? String(row.price) : '');
//   };

//   const cancelEdit = () => {
//     setEditRowId(null);
//     setEditPrice('');
//   };

//   const savePrice = async (row: StockItem) => {
//     const parsed = Number(editPrice);
//     if (Number.isNaN(parsed) || parsed < 0) {
//       showToast('Enter a valid non-negative price', 'error');
//       return;
//     }
//     setIsLoading(true);
//     try {
//       const now = new Date();
//       const ref = doc(db, 'inventory', row.id);
//       await updateDoc(ref, { price: parsed, lastUpdated: Timestamp.fromDate(now) });

//       await logActivity(
//         `updated price for ${row.name} (barcode: ${row.barcode}) from £${row.price || 0} to £${parsed.toFixed(2) }`
//       );

//       setItems(prev => prev.map(it => it.id === row.id ? { ...it, price: parsed, lastUpdated: now } : it));
//       showToast('Price updated', 'success');
//       setEditRowId(null);
//       setEditPrice('');
//     } catch (err) {
//       console.error('Failed to update price', err);
//       showToast('Failed to update price', 'error');
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <div className="space-y-6">
//       <div className="flex items-center justify-between py-4">
//         <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Inventory</h1>
//         <div className="flex items-center gap-3">
//           <span className={`px-3 py-1 rounded-full text-sm font-semibold ${isDarkMode ? 'bg-slate-800 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
//             Total Products: {totalCount !== null ? totalCount : <span className="animate-pulse">...</span>}
//           </span>
//           <Button
//             variant="secondary"
//             onClick={() => { fetchInventory(); fetchTotalCount(); }}
//             className={`flex items-center gap-2 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
//             disabled={isLoading}
//           >
//             <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
//           </Button>
//         </div>
//       </div>

//       {/* Stats section styled like Reports page */}
//       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
//         <StatsCard title="Visible Products" value={stats.total} icon={<Package size={24} className="text-blue-600" />} />
//         <StatsCard title="Damaged" value={stats.damaged} icon={<AlertCircle size={24} className="text-blue-600" />} />
//         <StatsCard title="Duplicates" value={stats.duplicates} icon={<Copy size={24} className="text-blue-600" />} />
//         <StatsCard title="Unique" value={stats.unique} icon={<CheckCircle2 size={24} className="text-blue-600" />} />
//       </div>
//       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mt-4">
//         <StatsCard title="Active" value={stats.active} icon={<CheckCircle2 size={24} className="text-blue-600" />} />
//         <StatsCard title="Pending" value={stats.pending} icon={<AlertCircle size={24} className="text-blue-600" />} />
//         <StatsCard title="With Price" value={stats.priceSet} icon={<PoundSterling size={24} className="text-blue-600" />} />
//         <StatsCard title="Without Price" value={stats.noPrice} icon={<PoundSterling size={24} className="text-blue-600" />} />
//       </div>

//       <div className="flex flex-col sm:flex-row gap-4">
//         <div className="flex-1">
//           <div className="relative">
//             <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`} size={16} />
//             <Input
//               type="text"
//               placeholder="Search by name, ASIN or barcode"
//               value={searchQuery}
//               onChange={(e) => setSearchQuery(e.target.value)}
//               className="pl-10"
//             />
//           </div>
//         </div>
//         <div className="relative damage-filter-dropdown">
//           <Button
//             variant="secondary"
//             onClick={() => setIsDamageFilterOpen(!isDamageFilterOpen)}
//             className={`flex items-center gap-2 ${damageFilter !== 'all' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : ''}`}
//           >
//             {damageFilter === 'all' ? 'Damage Filter - All' : damageFilter === 'damaged' ? 'Damage Filter - Damaged' : 'Damage Filter - Not Damaged'}
//             <ChevronDown size={16} />
//           </Button>
//           {isDamageFilterOpen && (
//             <div className={`absolute top-full left-0 mt-1 w-40 z-50 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-lg`}>
//               <div className="p-2">
//                 <div className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Filter by Damage</div>
//                 <div
//                   className={`px-3 py-2 text-sm cursor-pointer rounded transition-colors ${isDarkMode ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'} ${damageFilter === 'all' ? (isDarkMode ? 'bg-slate-700' : 'bg-slate-100') : ''}`}
//                   onClick={() => { setDamageFilter('all'); setIsDamageFilterOpen(false); }}
//                 >
//                   All
//                 </div>
//                 <div
//                   className={`px-3 py-2 text-sm cursor-pointer rounded transition-colors ${isDarkMode ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'} ${damageFilter === 'damaged' ? (isDarkMode ? 'bg-slate-700' : 'bg-slate-100') : ''}`}
//                   onClick={() => { setDamageFilter('damaged'); setIsDamageFilterOpen(false); }}
//                 >
//                   Damaged
//                 </div>
//                 <div
//                   className={`px-3 py-2 text-sm cursor-pointer rounded transition-colors ${isDarkMode ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'} ${damageFilter === 'notDamaged' ? (isDarkMode ? 'bg-slate-700' : 'bg-slate-100') : ''}`}
//                   onClick={() => { setDamageFilter('notDamaged'); setIsDamageFilterOpen(false); }}
//                 >
//                   Not Damaged
//                 </div>
//               </div>
//             </div>
//           )}
//         </div>
//         <div className="relative duplicate-filter-dropdown">
//           <Button
//             variant="secondary"
//             onClick={() => setIsDuplicateFilterOpen(!isDuplicateFilterOpen)}
//             className={`flex items-center gap-2 ${duplicateFilter !== 'all' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : ''}`}
//           >
//             {duplicateFilter === 'all' ? 'Duplicates Filter - All' : duplicateFilter === 'duplicates' ? 'Duplicates Filter - Duplicates Only' : 'Duplicates Filter - Unique Only'}
//             <ChevronDown size={16} />
//           </Button>
//           {isDuplicateFilterOpen && (
//             <div className={`absolute top-full left-0 mt-1 w-44 z-50 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} shadow-lg`}>
//               <div className="p-2">
//                 <div className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Filter by Duplicates</div>
//                 <div
//                   className={`px-3 py-2 text-sm cursor-pointer rounded transition-colors ${isDarkMode ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'} ${duplicateFilter === 'all' ? (isDarkMode ? 'bg-slate-700' : 'bg-slate-100') : ''}`}
//                   onClick={() => { setDuplicateFilter('all'); setIsDuplicateFilterOpen(false); }}
//                 >
//                   All
//                 </div>
//                 <div
//                   className={`px-3 py-2 text-sm cursor-pointer rounded transition-colors ${isDarkMode ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'} ${duplicateFilter === 'duplicates' ? (isDarkMode ? 'bg-slate-700' : 'bg-slate-100') : ''}`}
//                   onClick={() => { setDuplicateFilter('duplicates'); setIsDuplicateFilterOpen(false); }}
//                 >
//                   Duplicates Only
//                 </div>
//                 <div
//                   className={`px-3 py-2 text-sm cursor-pointer rounded transition-colors ${isDarkMode ? 'text-slate-200 hover:bg-slate-700' : 'text-slate-700 hover:bg-slate-100'} ${duplicateFilter === 'unique' ? (isDarkMode ? 'bg-slate-700' : 'bg-slate-100') : ''}`}
//                   onClick={() => { setDuplicateFilter('unique'); setIsDuplicateFilterOpen(false); }}
//                 >
//                   Unique Only
//                 </div>
//               </div>
//             </div>
//           )}
//         </div>
//       </div>

//       {isLoading ? (
//         <div className={`text-center py-12 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-lg border`}>
//           <div className="flex flex-col items-center gap-4">
//             <Loader2 className={`w-8 h-8 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} animate-spin`} />
//             <p className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>Loading inventory...</p>
//           </div>
//         </div>
//       ) : filteredItems.length > 0 ? (
//         <>
//           {/* Desktop table */}
//           <div className="hidden md:block overflow-x-auto overflow-y-hidden">
//             <table className={`min-w-full divide-y ${isDarkMode ? 'divide-slate-700' : 'divide-slate-200'} ${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-lg border ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
//               <thead className={isDarkMode ? 'bg-slate-700/50' : 'bg-slate-100'}>
//                 <tr>
//                   <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Name</th>
//                   <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>ASIN</th>
//                   <th className={`px-4 py-3 text-right text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Price</th>
//                   <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Barcode</th>
//                   <th className={`px-4 py-3 text-right text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>View</th>
//                 </tr>
//               </thead>
//               <tbody className={`divide-y ${isDarkMode ? 'divide-slate-700' : 'divide-slate-200'}`}>
//                 {filteredItems.map((item, index) => (
//                   <motion.tr
//                     key={item.id}
//                     initial={{ opacity: 0, y: 20 }}
//                     animate={{ opacity: 1, y: 0 }}
//                     transition={{ duration: 0.3, delay: index * 0.03, ease: 'easeOut' }}
//                   >
//                     <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-blue-400' : 'text-blue-700'} font-medium`}>{item.name}</td>
//                     <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
//                       {item.asin ? (
//                         item.asin.split(',').length > 3
//                           ? item.asin.split(',').slice(0, 3).map(a => a.trim()).join(', ') + '...'
//                           : item.asin.split(',').map(a => a.trim()).join(', ')
//                       ) : (
//                         '-'
//                       )}
//                     </td>
//                     <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-900'} text-right`}>
//                       {editRowId === item.id ? (
//                         <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
//                           <Input
//                             type="number"
//                             step="0.01"
//                             value={editPrice}
//                             onChange={(e) => setEditPrice(e.target.value)}
//                             className="w-28 text-right"
//                           />
//                           <Button size="sm" onClick={() => savePrice(item)} isLoading={isLoading}>
//                             <Check size={14} />
//                           </Button>
//                           <Button size="sm" variant="secondary" onClick={cancelEdit} disabled={isLoading}>
//                             <X size={14} />
//                           </Button>
//                         </div>
//                       ) : (
//                         <button
//                           onClick={(e) => { e.stopPropagation(); startEdit(item); }}
//                           className={`${isDarkMode ? 'text-slate-200 hover:text-blue-300' : 'text-slate-900 hover:text-blue-700'} transition-colors`}
//                         >
//                           {Number(item.price) > 0 ? `£${Number(item.price).toFixed(2)}` : '(Not set)'}
//                         </button>
//                       )}
//                     </td>
//                     <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{item.barcode || '-'}</td>
//                     <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'} text-right`}>
//                       <button
//                         onClick={() => setSelectedItem(item)}
//                         className={`${isDarkMode ? 'text-slate-300 hover:text-blue-300' : 'text-slate-600 hover:text-blue-700'} p-1`}
//                         aria-label="View details"
//                       >
//                         <Eye size={16} />
//                       </button>
//                     </td>
//                   </motion.tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>

//           {/* Mobile list */}
//           <div className="block md:hidden space-y-4">
//             {filteredItems.map((item) => (
//               <div key={item.id} className={`rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} p-4 shadow-sm flex flex-col gap-2`}>
//                 <div className="flex justify-between items-center">
//                   <span className={`font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>{item.name}</span>
//                   {editRowId === item.id ? (
//                     <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
//                       <Input
//                         type="number"
//                         step="0.01"
//                         value={editPrice}
//                         onChange={(e) => setEditPrice(e.target.value)}
//                         className="w-24 text-right"
//                       />
//                       <Button size="sm" onClick={() => savePrice(item)} isLoading={isLoading}>
//                         <Check size={14} />
//                       </Button>
//                       <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); cancelEdit(); }} disabled={isLoading}>
//                         <X size={14} />
//                       </Button>
//                     </div>
//                   ) : (
//                     <div className="flex items-center gap-2">
//                       <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); startEdit(item); }}>
//                         <Edit2 size={14} /> Edit Price
//                       </Button>
//                       <button
//                         onClick={() => setSelectedItem(item)}
//                         className={`${isDarkMode ? 'text-slate-300 hover:text-blue-300' : 'text-slate-600 hover:text-blue-700'} p-1`}
//                         aria-label="View details"
//                       >
//                         <Eye size={16} />
//                       </button>
//                     </div>
//                   )}
//                 </div>
//                 <div className="flex flex-wrap gap-2 text-xs">
//                   <span className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>ASIN: <span className="font-medium">{item.asin || '-'}</span></span>
//                   <span className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>Price: <span className="font-medium">{Number(item.price) > 0 ? `£${Number(item.price).toFixed(2)}` : '(Not set)'}</span></span>
//                   <span className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>Barcode: <span className="font-medium">{item.barcode || '-'}</span></span>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </>
//       ) : (
//         <div className={`text-center py-12 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-lg border`}>
//           <p className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>No items found. Try adjusting your search.</p>
//         </div>
//       )}
//       {selectedItem && (
//         <StockDetailsModal
//           isOpen={!!selectedItem}
//           onClose={() => setSelectedItem(null)}
//           item={selectedItem}
//         />
//       )}
//     </div>
//   );
// };

// export default Inventory;
