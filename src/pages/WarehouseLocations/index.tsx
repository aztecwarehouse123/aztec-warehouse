import React, { useState, useEffect } from 'react';
import { Package, ChevronUp, ChevronDown, Search } from 'lucide-react';
import { collection, query, getDocs, orderBy, Timestamp, doc, setDoc, addDoc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Modal from '../../components/modals/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { StockItem } from '../../types';

interface LocationSummary {
  locationCode: string;
  totalStock: number;
  products: StockItem[];
}

const WarehouseLocations: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [locations, setLocations] = useState<StockItem[]>([]);
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('locationCode');
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const { showToast } = useToast();
  const { isDarkMode } = useTheme();
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [moveProduct, setMoveProduct] = useState<StockItem | null>(null);
  const [moveQuantity, setMoveQuantity] = useState(1);
  const [moveLocation, setMoveLocation] = useState('A1');
  const [moveShelf, setMoveShelf] = useState('0');
  const [moveLoading, setMoveLoading] = useState(false);
  const { user } = useAuth();

  const fetchLocations = async () => {
    try {
      const q = query(collection(db, 'inventory'), orderBy('locationCode'));
      const snapshot = await getDocs(q);
      const locationsData: StockItem[] = snapshot.docs.map(doc => {
        const data = doc.data() as StockItem;
        return {
          id: doc.id,
          name: data.name || '',
          quantity: data.quantity || 0,
          price: data.price || 0,
          supplier: data.supplier ?? null,
          lastUpdated: data.lastUpdated instanceof Timestamp ? data.lastUpdated.toDate() : new Date(),
          locationCode: data.locationCode || '',
          shelfNumber: data.shelfNumber || '',
          barcode: data.barcode ?? null,
          asin: data.asin ?? null,
          status: data.status || 'pending',
          damagedItems: data.damagedItems || 0,
          fulfillmentType: data.fulfillmentType || 'fba',
          storeName: data.storeName || '',
        };
      });
      setLocations(locationsData);
    } catch (error) {
      console.error('Error fetching locations:', error);
      showToast('Failed to fetch locations. Please try again.', 'error');
    }
  };

  const fetchAvailability = async () => {
    try {
      const q = query(collection(db, 'locations'));
      const snapshot = await getDocs(q);
      const avail: Record<string, boolean> = {};
      snapshot.forEach(doc => {
        avail[doc.id] = doc.data().isAvailable !== false; // default to true
      });
      setAvailability(avail);
    } catch (error) {
      console.error('Error fetching location availability:', error);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    Promise.all([fetchLocations(), fetchAvailability()]).finally(() => setIsLoading(false));
  }, []);

  const allLocationCodes = [
    'A1', 'A2',
    'B1', 'B2',
    'C1', 'C2', 'C3', 'C4', 'C5',
    'D1', 'D2', 'D3', 'D4', 'D5',
    'E1', 'E2', 'E3', 'E4', 'E5',
    'F1', 'F2', 'F3', 'F4', 'F5',
    'G1', 'G2', 'G3', 'G4', 'G5',
    'H1', 'H2', 'H3', 'H4', 'H5',
    'I1', 'I2', 'I3', 'I4', 'I5',
    'J1', 'J2', 'J3', 'J4', 'J5',
    'K1', 'K2', 'K3', 'K4', 'K5',
    'L1', 'L2', 'L3', 'L4', 'L5',
    'M1', 'M2', 'M3', 'M4', 'M5',
    'N1', 'N2', 'N3', 'N4', 'N5',
    'O1', 'O2', 'O3', 'O4', 'O5',
    'P1', 'P2', 'P3', 'P4', 'P5',
    'Q1', 'Q2',
    'R1', 'R2',
    'S1', 'S2',
    'T1', 'T2'
  ];

  const locationSummaries = allLocationCodes.reduce((acc, code) => {
    const products = locations.filter(loc => loc.locationCode === code);
    acc[code] = {
      locationCode: code,
      totalStock: products.reduce((sum, loc) => sum + loc.quantity, 0),
      products
    };
    return acc;
  }, {} as Record<string, LocationSummary>);

  const filteredAndSortedSummaries = Object.values(locationSummaries)
    .filter(summary => {
      const searchLower = searchQuery.toLowerCase();
      const matchesLocationCode = summary.locationCode.toLowerCase().includes(searchLower);
      const matchesProductName = summary.products.some(product => 
        product.name.toLowerCase().includes(searchLower) ||
        (product.asin && product.asin.split(',').some(asin => asin.trim().toLowerCase().includes(searchLower))) ||
        (product.barcode && product.barcode.toLowerCase().includes(searchLower)) ||
        (product.shelfNumber && product.shelfNumber.toString().toLowerCase().includes(searchLower))
      );
      return matchesLocationCode || matchesProductName;
    })
    .sort((a, b) => {
      if (sortBy === 'totalStock') {
        return b.totalStock - a.totalStock;
      } else if (sortBy === 'locationCode') {
        return a.locationCode.localeCompare(b.locationCode);
      } else if (sortBy === 'availability') {
        const availA = availability[a.locationCode] !== false;
        const availB = availability[b.locationCode] !== false;
        if (availA === availB) {
          return a.locationCode.localeCompare(b.locationCode);
        }
        return availA ? -1 : 1;
      }
      return 0;
    });

  const toggleLocation = (locationCode: string) => {
    setExpandedLocations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(locationCode)) {
        newSet.delete(locationCode);
      } else {
        newSet.add(locationCode);
      }
      return newSet;
    });
  };

  const toggleAvailability = async (locationCode: string) => {
    const newValue = !(availability[locationCode] ?? true);
    setAvailability(prev => ({ ...prev, [locationCode]: newValue }));
    try {
      await setDoc(doc(db, 'locations', locationCode), { isAvailable: newValue }, { merge: true });
    } catch (error) {
      showToast('Failed to update availability', 'error');
      setAvailability(prev => ({ ...prev, [locationCode]: !newValue })); // revert
      console.log(error)
    }
  };

  function sanitizeStockData(data: Record<string, any>) {
    const clean = { ...data };
    Object.keys(clean).forEach(key => {
      if (clean[key] === undefined) clean[key] = null;
    });
    return clean;
  }

  function normalize(val) {
    return val === undefined || val === null ? '' : val;
  }

  const handleMove = async () => {
    if (!moveProduct) return;
    if (moveQuantity < 1 || moveQuantity > moveProduct.quantity) return;
    setMoveLoading(true);
    try {
      const q = query(collection(db, 'inventory'));
      const snapshot = await getDocs(q);
      let existing: StockItem | null = null;
      snapshot.forEach(docSnap => {
        const d = docSnap.data() as StockItem;
        if (
          d.name === moveProduct.name &&
          d.locationCode === moveLocation &&
          d.shelfNumber === moveShelf &&
          normalize(d.asin) === normalize(moveProduct.asin) &&
          normalize(d.barcode) === normalize(moveProduct.barcode)
        ) {
          existing = { ...d, id: docSnap.id };
        }
      });
      if (moveQuantity === moveProduct.quantity) {
        await setDoc(doc(db, 'inventory', moveProduct.id), sanitizeStockData({
          ...moveProduct,
          locationCode: moveLocation,
          shelfNumber: moveShelf,
          lastUpdated: new Date()
        }), { merge: true });
      } else {
        await setDoc(doc(db, 'inventory', moveProduct.id), sanitizeStockData({
          ...moveProduct,
          quantity: moveProduct.quantity - moveQuantity,
          lastUpdated: new Date()
        }), { merge: true });
        if (existing) {
          await setDoc(doc(db, 'inventory', existing.id), sanitizeStockData({
            ...existing,
            quantity: existing.quantity + moveQuantity,
            lastUpdated: new Date()
          }), { merge: true });
        } else {
          const newDocFields = Object.fromEntries(Object.entries(moveProduct).filter(([key]) => key !== 'id'));
          await addDoc(collection(db, 'inventory'), sanitizeStockData({
            ...newDocFields,
            quantity: moveQuantity,
            locationCode: moveLocation,
            shelfNumber: moveShelf,
            lastUpdated: new Date()
          }));
        }
      }
      // Log activity
      await addDoc(collection(db, 'activityLogs'), {
        user: user?.name || 'Unknown',
        role: user?.role || 'Unknown',
        detail: `Moved ${moveQuantity} unit(s) of "${moveProduct.name}" from ${moveProduct.locationCode}-${moveProduct.shelfNumber} to ${moveLocation}-${moveShelf}`,
        time: new Date().toISOString()
      });
      showToast('Stock moved successfully', 'success');
      setMoveModalOpen(false);
      setMoveProduct(null);
      fetchLocations();
    } catch (error) {
      showToast('Failed to move stock', 'error');
      console.log(error)
    } finally {
      setMoveLoading(false);
    }
  };

  return (
    <div className={`space-y-6 ${isDarkMode ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-800'}`}>
      <div>
        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Warehouse Locations</h1>
        <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mt-1`}>View and manage your warehouse storage locations</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Search by location, product name, ASIN or barcode..."
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
              { value: 'locationCode', label: 'Sort by Location' },
              { value: 'totalStock', label: 'Sort by Total Stock' },
              { value: 'availability', label: 'Sort by Availability' },
            ]}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 ${isDarkMode ? 'border-white' : 'border-slate-800'}`}></div>
        </div>
      ) : filteredAndSortedSummaries.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <Package className={`w-12 h-12 ${isDarkMode ? 'text-slate-600' : 'text-slate-400'}`} />
          <p className={`text-lg font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            No products found in any location
          </p>
          <p className={`text-sm ${isDarkMode ? 'text-slate-500' : 'text-slate-500'}`}>
            Add products to locations to see them here
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.values(filteredAndSortedSummaries).map(summary => {
            const isExpanded = expandedLocations.has(summary.locationCode);

            return (
              <div 
                key={summary.locationCode} 
                className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} 
                  rounded-lg shadow-sm border transition-all duration-200 ease-in-out
                  hover:shadow-md ${isExpanded ? 'ring-2 ring-blue-500' : ''}`}
              >
                <div 
                  className={`p-4 border-b ${isDarkMode ? 'border-slate-700 hover:bg-slate-700/50' : 'border-slate-200 hover:bg-slate-100'} 
                    cursor-pointer transition-colors duration-200`}
                  onClick={() => toggleLocation(summary.locationCode)}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                        <Package className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                      </div>
                      <h3 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                        Location {summary.locationCode}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={availability[summary.locationCode] !== false}
                          onChange={e => { e.stopPropagation(); toggleAvailability(summary.locationCode); }}
                          className="sr-only peer"
                        />
                        <div
                          className={`w-11 h-6 rounded-full transition-colors duration-200
                            ${availability[summary.locationCode] !== false ? 'bg-green-500' : 'bg-red-500'}
                            peer-focus:ring-2 peer-focus:ring-blue-500
                          `}
                        ></div>
                        <div
                          className={`absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-200
                            ${availability[summary.locationCode] !== false ? 'translate-x-5' : ''}
                          `}
                        ></div>
                      </label>
                      <span className={`text-xs font-semibold ml-2 ${availability[summary.locationCode] !== false ? 'text-green-500' : 'text-red-500'}`}
                        >{availability[summary.locationCode] !== false ? 'Available' : 'Not Available'}</span>
                      <button
                        className="ml-2 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                        onClick={e => { e.stopPropagation(); toggleLocation(summary.locationCode); }}
                        aria-label={isExpanded ? 'Collapse' : 'Expand'}
                      >
                        {isExpanded ? (
                          <ChevronUp className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                        ) : (
                          <ChevronDown className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-end mt-2">
                    <div>
                      <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Total Stock</p>
                      <p className={`font-bold text-2xl ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{summary.totalStock} units</p>
                    </div>
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                      {summary.products.length} product{summary.products.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-4 space-y-4 overflow-hidden transition-all duration-300 ease-in-out">
                    <h4 className={`font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      {summary.products.length === 0
                        ? 'No products in this location'
                        : 'Products in this location:'}
                    </h4>
                    <div className="space-y-4">
                      {summary.products.map(location => {
                        const percentageOfTotal = summary.totalStock === 0 ? 0 : (location.quantity / summary.totalStock) * 100;
                        const searchLower = searchQuery.toLowerCase();
                        const isMatch = 
                          location.name.toLowerCase().includes(searchLower) ||
                          (location.asin && location.asin.split(',').some(asin => asin.trim().toLowerCase().includes(searchLower))) ||
                          (location.barcode && location.barcode.toLowerCase().includes(searchLower)) ||
                          (location.shelfNumber && location.shelfNumber.toString().toLowerCase().includes(searchLower));

                        return (
                          <div 
                            key={location.id} 
                            className={`space-y-2 p-2 rounded-md transition-colors ${
                              isMatch 
                                ? isDarkMode 
                                  ? 'bg-blue-900/30 border border-blue-500/50' 
                                  : 'bg-blue-50 border border-blue-200'
                                : ''
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className={`font-medium ${isMatch ? 'text-blue-600' : isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                  {location.name}
                                </h4>
                                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                  Shelf {location.shelfNumber}
                                </p>
                              </div>
                              <div className="text-right flex flex-col items-end gap-2">
                                <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                  {location.quantity} units
                                </p>
                                <button
                                  className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                                  onClick={async e => {
                                    e.stopPropagation();
                                    // Fetch full product from Firestore
                                    const fullDoc = await getDoc(doc(db, 'inventory', location.id));
                                    if (fullDoc.exists()) {
                                      const fullData = fullDoc.data() as StockItem;
                                      setMoveProduct({ ...fullData, id: location.id });
                                      setMoveQuantity(1);
                                      setMoveLocation(location.locationCode);
                                      setMoveShelf(location.shelfNumber);
                                      setMoveModalOpen(true);
                                    } else {
                                      showToast('Failed to fetch product details', 'error');
                                    }
                                  }}
                                >Move</button>
                              </div>
                            </div>
                            <div className={`w-full ${isDarkMode ? 'bg-slate-700' : 'bg-slate-200'} rounded-full h-2`}>
                              <div
                                className={`h-2 rounded-full transition-all duration-300 ease-in-out
                                  ${percentageOfTotal > 75 ? 'bg-green-500' : 
                                    percentageOfTotal > 25 ? 'bg-blue-500' : 'bg-orange-500'}`}
                                style={{ width: `${percentageOfTotal}%` }}
                                title={`${location.quantity} out of ${summary.totalStock} units (${percentageOfTotal.toFixed(1)}%)`}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={moveModalOpen} onClose={() => setMoveModalOpen(false)} title="Move Stock">
        {moveProduct && (
          <form onSubmit={e => { e.preventDefault(); handleMove(); }} className={`space-y-4 ${isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-slate-800'} p-4 rounded-lg`}>
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>How many units to move?</label>
              <input
                type="number"
                min={1}
                max={moveProduct.quantity}
                value={moveQuantity}
                onChange={e => setMoveQuantity(Number(e.target.value))}
                className={`w-full rounded border px-2 py-1 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-800'}`}
                required
              />
              <div className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Available: {moveProduct.quantity}</div>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>New Location</label>
              <select
                value={moveLocation}
                onChange={e => setMoveLocation(e.target.value)}
                className={`w-full rounded border px-2 py-1 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-800'}`}
                required
              >
                {allLocationCodes.map(code => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Shelf Number</label>
              <select
                value={moveShelf}
                onChange={e => setMoveShelf(e.target.value)}
                className={`w-full rounded border px-2 py-1 ${isDarkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-800'}`}
                required
              >
                {[0,1,2,3,4,5].map(num => (
                  <option key={num} value={num}>{num}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" className={`px-3 py-1 rounded ${isDarkMode ? 'bg-slate-600 text-white' : 'bg-slate-200 text-slate-800'}`} onClick={() => setMoveModalOpen(false)}>Cancel</button>
              <button type="submit" className={`px-3 py-1 rounded ${isDarkMode ? 'bg-blue-700 text-white' : 'bg-blue-600 text-white'}`} disabled={moveLoading}>{moveLoading ? 'Moving...' : 'Move'}</button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default WarehouseLocations; 