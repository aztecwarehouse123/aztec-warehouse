import React, { useState, useEffect } from 'react';
import { Package, ChevronUp, ChevronDown, Search } from 'lucide-react';
import { collection, query, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useToast } from '../../contexts/ToastContext';
import { useTheme } from '../../contexts/ThemeContext';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';

interface StockLocation {
  id: string;
  name: string;
  quantity: number;
  locationCode: string;
  shelfNumber: string;
  lastUpdated: Date;
}

interface LocationSummary {
  locationCode: string;
  totalStock: number;
  products: StockLocation[];
}

const WarehouseLocations: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [locations, setLocations] = useState<StockLocation[]>([]);
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('locationCode');
  const { showToast } = useToast();
  const { isDarkMode } = useTheme();

  const fetchLocations = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'inventory'), orderBy('locationCode'));
      const snapshot = await getDocs(q);
      const locationsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || '',
          quantity: data.quantity || 0,
          locationCode: data.locationCode || '',
          shelfNumber: data.shelfNumber || '',
          lastUpdated: data.lastUpdated instanceof Timestamp ? data.lastUpdated.toDate() : new Date()
        } as StockLocation;
      });
      setLocations(locationsData);
    } catch (error) {
      console.error('Error fetching locations:', error);
      showToast('Failed to fetch locations. Please try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const locationSummaries = locations.reduce((acc, location) => {
    if (!acc[location.locationCode]) {
      acc[location.locationCode] = {
        locationCode: location.locationCode,
        totalStock: 0,
        products: []
      };
    }
    acc[location.locationCode].totalStock += location.quantity;
    acc[location.locationCode].products.push(location);
    return acc;
  }, {} as Record<string, LocationSummary>);

  const filteredAndSortedSummaries = Object.values(locationSummaries)
    .filter(summary => {
      const searchLower = searchQuery.toLowerCase();
      const matchesLocationCode = summary.locationCode.toLowerCase().includes(searchLower);
      const matchesProductName = summary.products.some(product => product.name.toLowerCase().includes(searchLower));
      return matchesLocationCode || matchesProductName;
    })
    .sort((a, b) => {
      if (sortBy === 'totalStock') {
        return b.totalStock - a.totalStock;
      } else if (sortBy === 'locationCode') {
        return a.locationCode.localeCompare(b.locationCode);
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
            placeholder="Search by location or product..."
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
              { value: 'totalStock', label: 'Sort by Total Stock' }
            ]}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${isDarkMode ? 'border-white' : 'border-slate-800'}`}></div>
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
                    {isExpanded ? (
                      <ChevronUp className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} transition-transform duration-200`} />
                    ) : (
                      <ChevronDown className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} transition-transform duration-200`} />
                    )}
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
                      Products in this location:
                    </h4>
                    <div className="space-y-4">
                      {summary.products.map(location => {
                        const percentageOfTotal = summary.totalStock === 0 ? 0 : (location.quantity / summary.totalStock) * 100;

                        return (
                          <div key={location.id} className="space-y-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                  {location.name}
                                </h4>
                                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                  Shelf {location.shelfNumber}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                  {location.quantity} units
                                </p>
                                <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                  {percentageOfTotal.toFixed(1)}% of total
                                </p>
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
    </div>
  );
};

export default WarehouseLocations; 