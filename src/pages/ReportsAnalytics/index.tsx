import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { format, subDays, subHours } from 'date-fns';
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Download, Package, TrendingDown, PoundSterling, AlertCircle, RefreshCw } from 'lucide-react';
import Select from '../../components/ui/Select';
import CalendarDateRangePicker from '../../components/ui/CalendarDateRangePicker';
import Button from '../../components/ui/Button';
import StatsCard, { StatsCardSkeleton } from '../../components/dashboard/StatsCard';
import { StockItem, ActivityLog } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';



interface DashboardStats {
  totalOrders: number;
  totalStock: number;
  totalInventoryValue: number;
  totalDamagedProducts: number;
  yesterdayOrders: number;
  yesterdayStockChange: number;
  yesterdayRevenue: number;
  totalDeductions: number;
  previousDeductions: number;
  todayStockAdditions: number;
  todayInventoryValueAdditions: number;
}

const ReportsAnalytics: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'hourly' | 'daily' | 'weekly' | 'monthly'>('daily');
  const [startDate, setStartDate] = useState<Date | null>(subDays(new Date(), 7));
  const [endDate, setEndDate] = useState<Date | null>(new Date());

  const [inventory, setInventory] = useState<StockItem[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    totalStock: 0,
    totalInventoryValue: 0,
    totalDamagedProducts: 0,
    yesterdayOrders: 0,
    yesterdayStockChange: 0,
    yesterdayRevenue: 0,
    totalDeductions: 0,
    previousDeductions: 0,
    todayStockAdditions: 0,
    todayInventoryValueAdditions: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const { isDarkMode } = useTheme();
  const { user } = useAuth();

  // Fetch orders and inventory based on date range
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const endDateValue = endDate || new Date();
      const startDateValue = startDate || subDays(endDateValue, 7);

      // Fetch orders
      const ordersQuery = query(
        collection(db, 'orders'),
        where('createdAt', '>=', Timestamp.fromDate(startDateValue)),
        where('createdAt', '<=', Timestamp.fromDate(endDateValue))
      );

      const ordersSnapshot = await getDocs(ordersQuery);
      const ordersData = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate(),
        updatedAt: doc.data().updatedAt?.toDate(),
        shippedTime: doc.data().shippedTime?.toDate()
      })) as any[]; // Changed from Order[] to any[]

      // Fetch inventory data
      const inventoryQuery = query(collection(db, 'inventory'));
      const inventorySnapshot = await getDocs(inventoryQuery);
      const inventoryData = inventorySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        lastUpdated: doc.data().lastUpdated instanceof Timestamp 
          ? doc.data().lastUpdated.toDate() 
          : new Date(doc.data().lastUpdated)
      })) as StockItem[];

      // Fetch activity logs
      const logsQuery = query(
        collection(db, 'activityLogs'),
        where('time', '>=', startDateValue.toISOString()),
        where('time', '<=', endDateValue.toISOString()),
        orderBy('time', 'desc')
      );

      const logsSnapshot = await getDocs(logsQuery);
      const logsData = logsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ActivityLog[];

      setActivityLogs(logsData);
      setInventory(inventoryData);
      setOrders(ordersData);

      // Calculate stats based on the custom date range
      const totalStock = inventoryData.reduce((sum, item) => sum + (item.quantity || 0), 0);
      const totalInventoryValue = inventoryData.reduce((sum, item) => sum + ((item.quantity || 0) * (item.price || 0)), 0);
      const totalOrders = ordersData.length;

      // Calculate yesterday's data
      const yesterdayStart = subDays(new Date(), 1);
      const yesterdayEnd = new Date();
      const yesterdayOrdersData = ordersData.filter(order => {
        const orderDate = order.createdAt;
        return orderDate >= yesterdayStart && orderDate <= yesterdayEnd;
      });
      const yesterdayOrders = yesterdayOrdersData.length;
      const yesterdayRevenue = yesterdayOrdersData.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

      // Calculate activity data based on selected date range
      const statsEndDate = endDate || new Date();
      const statsStartDate = startDate || subDays(statsEndDate, 7);

      // Filter logs by date range
      const dateFilteredLogs = logsData.filter(log => {
        const logDate = new Date(log.time);
        return logDate >= statsStartDate && logDate <= statsEndDate;
      });

      // Filter logs to only include activities for products that exist in current inventory
      const periodLogs = dateFilteredLogs.filter(log => {
        // Check for new product additions
        const newProductMatch = log.detail.match(/added new product "([^"]+)" with total quantity (\d+)/);
        if (newProductMatch) {
          const [, productName] = newProductMatch;
          return inventoryData.some(item => item.name === productName);
        }
        
        // Check for quantity updates in existing products
        const quantityUpdateMatch = log.detail.match(/edited product "([^"]+)": quantity from (\d+) to (\d+)/);
        if (quantityUpdateMatch) {
          const [, productName] = quantityUpdateMatch;
          return inventoryData.some(item => item.name === productName);
        }
        
        // Check for deductions (these should be included regardless as they affect current inventory)
        const deductionMatch = log.detail.match(/(\d+) units deducted from stock/);
        if (deductionMatch) {
          return true; // Include all deductions as they affect current inventory
        }
        
        // Check for damaged products (include these as they affect current inventory)
        const damagedPatterns = [
          /Reason: damaged/i,
          /damaged/i,
          /damagedItems/i,
          /damaged items/i
        ];
        if (damagedPatterns.some(pattern => pattern.test(log.detail))) {
          return true; // Include damaged product activities
        }
        
        // Include other activities that might be relevant
        return true;
      });

      // Calculate previous period for comparison
      const periodDuration = statsEndDate.getTime() - statsStartDate.getTime();
      const previousStartDate = new Date(statsStartDate.getTime() - periodDuration);
      const previousEndDate = new Date(statsStartDate.getTime());

      // Filter previous period logs by date range first
      const previousDateFilteredLogs = logsData.filter(log => {
        const logDate = new Date(log.time);
        return logDate >= previousStartDate && logDate <= previousEndDate;
      });

      // Then filter to only include activities for products that exist in current inventory
      const previousPeriodLogs = previousDateFilteredLogs.filter(log => {
        // Check for new product additions
        const newProductMatch = log.detail.match(/added new product "([^"]+)" with total quantity (\d+)/);
        if (newProductMatch) {
          const [, productName] = newProductMatch;
          return inventoryData.some(item => item.name === productName);
        }
        
        // Check for quantity updates in existing products
        const quantityUpdateMatch = log.detail.match(/edited product "([^"]+)": quantity from (\d+) to (\d+)/);
        if (quantityUpdateMatch) {
          const [, productName] = quantityUpdateMatch;
          return inventoryData.some(item => item.name === productName);
        }
        
        // Check for deductions (these should be included regardless as they affect current inventory)
        const deductionMatch = log.detail.match(/(\d+) units deducted from stock/);
        if (deductionMatch) {
          return true; // Include all deductions as they affect current inventory
        }
        
        // Check for damaged products (include these as they affect current inventory)
        const damagedPatterns = [
          /Reason: damaged/i,
          /damaged/i,
          /damagedItems/i,
          /damaged items/i
        ];
        if (damagedPatterns.some(pattern => pattern.test(log.detail))) {
          return true; // Include damaged product activities
        }
        
        // Include other activities that might be relevant
        return true;
      });

      const totalDeductions = periodLogs.reduce((sum: number, log: ActivityLog) => {
        const match = log.detail.match(/(\d+) units deducted/);
        return sum + (match ? parseInt(match[1]) : 0);
      }, 0);

      const previousDeductions = previousPeriodLogs.reduce((sum: number, log: ActivityLog) => {
        const match = log.detail.match(/(\d+) units deducted/);
        return sum + (match ? parseInt(match[1]) : 0);
      }, 0);

      const periodStockAdditions = periodLogs.reduce((sum: number, log: ActivityLog) => {
        // Check for new product additions
        const newProductMatch = log.detail.match(/added new product "([^"]+)" with total quantity (\d+)/);
        if (newProductMatch) {
          const [, productName, quantity] = newProductMatch;
          // Only count if the product still exists in current inventory
          const existingProduct = inventoryData.find(item => item.name === productName);
          if (existingProduct) {
            return sum + parseInt(quantity);
          }
        }
        
        // Check for quantity increases in existing products
        const quantityUpdateMatch = log.detail.match(/edited product "([^"]+)": quantity from (\d+) to (\d+)/);
        if (quantityUpdateMatch) {
          const [, productName, oldQuantity, newQuantity] = quantityUpdateMatch;
          // Only count if the product still exists in current inventory
          const existingProduct = inventoryData.find(item => item.name === productName);
          if (existingProduct) {
            const increase = parseInt(newQuantity) - parseInt(oldQuantity);
            if (increase > 0) {
              return sum + increase;
            }
          }
        }
        
        return sum;
      }, 0);

      const periodInventoryValueAdditions = periodLogs.reduce((sum: number, log: ActivityLog) => {
        // Check for new product additions
        const newProductMatch = log.detail.match(/added new product "([^"]+)" with total quantity (\d+)/);
        if (newProductMatch) {
          const [, productName, quantity] = newProductMatch;
          const product = inventoryData.find(item => item.name === productName);
          if (product) {
            const price = product.price || 0;
            return sum + (parseInt(quantity) * price);
          }
        }
        
        // Check for quantity increases in existing products
        const quantityUpdateMatch = log.detail.match(/edited product "([^"]+)": quantity from (\d+) to (\d+)/);
        if (quantityUpdateMatch) {
          const [, productName, oldQuantity, newQuantity] = quantityUpdateMatch;
          const product = inventoryData.find(item => item.name === productName);
          if (product) {
            const increase = parseInt(newQuantity) - parseInt(oldQuantity);
            if (increase > 0) {
              const price = product.price || 0;
              return sum + (increase * price);
            }
          }
        }
        
        return sum;
      }, 0);

      // Calculate period's damaged products (incidents and units)
      const periodDamagedData = periodLogs.reduce((acc, log: ActivityLog) => {
        const damagedPatterns = [
          /Reason: damaged/i,
          /damaged/i,
          /damagedItems/i,
          /damaged items/i
        ];
        
        const isDamagedActivity = damagedPatterns.some(pattern => pattern.test(log.detail));
        
        if (isDamagedActivity) {
          // Extract units damaged using the same logic as the graph
          let unitsDamaged = 0;
          
          // Primary pattern: "X units deducted from stock" with "Reason: damaged"
          const primaryPattern = /(\d+)\s+units?\s+deducted\s+from\s+stock.*Reason:\s*damaged/i;
          const primaryMatch = log.detail.match(primaryPattern);
          
          if (primaryMatch) {
            unitsDamaged = parseInt(primaryMatch[1]);
          } else {
            // Fallback patterns
            const fallbackPatterns = [
              /damaged\s+items\s+from\s+(\d+)\s+to\s+(\d+)/i,
              /(\d+)\s+damaged\s+items?/i,
              /damaged\s+(\d+)\s+items?/i,
              /damagedItems?:\s*(\d+)/i,
              /(\d+)\s+units?\s+damaged/i,
              /damaged\s+(\d+)\s+units?/i
            ];
            
            for (const pattern of fallbackPatterns) {
              const match = log.detail.match(pattern);
              if (match) {
                if (match.length === 3) {
                  const fromValue = parseInt(match[1]);
                  const toValue = parseInt(match[2]);
                  unitsDamaged = Math.abs(fromValue - toValue);
                } else {
                  unitsDamaged = parseInt(match[1]);
                }
                break;
              }
            }
          }
          
          return {
            incidents: acc.incidents + 1,
            units: acc.units + (unitsDamaged > 0 ? unitsDamaged : 1)
          };
        }
        
        return acc;
      }, { incidents: 0, units: 0 });
      
      const periodDamagedProducts = periodDamagedData.incidents;

      setStats({
        totalOrders,
        totalStock,
        totalInventoryValue,
        totalDamagedProducts: periodDamagedProducts,
        yesterdayOrders,
        yesterdayStockChange: 0, // This would need more complex calculation
        yesterdayRevenue,
        totalDeductions,
        previousDeductions,
        todayStockAdditions: periodStockAdditions,
        todayInventoryValueAdditions: periodInventoryValueAdditions
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  const clearDateRange = () => {
    setStartDate(null);
    setEndDate(null);
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Re-render charts when timeRange changes (affects chart grouping)
  useEffect(() => {
    // Charts will re-render automatically when timeRange changes
    // No need to refetch data, just trigger re-render
  }, [timeRange]);

  // Redirect non-admin and non-staff users
  if (!user || (user.role !== 'admin' && user.role !== 'staff')) {
    return <Navigate to="/" replace />;
  }



  const getInboundProductsData = () => {
    const data: { date: string; activities: number; units: number; uniqueProducts: number }[] = [];
    const groupedProducts = new Map<string, { activities: number; units: number; uniqueProducts: Set<string> }>();

    // Calculate date range for filtering logs
    const statsEndDate = new Date();
    let statsStartDate: Date;

    switch (timeRange) {
      case 'hourly':
        statsStartDate = subHours(statsEndDate, 24);
        break;
      case 'daily':
        statsStartDate = subDays(statsEndDate, 7);
        break;
      case 'weekly':
        statsStartDate = subDays(statsEndDate, 30);
        break;
      case 'monthly':
        statsStartDate = subDays(statsEndDate, 90);
        break;
      default:
        statsStartDate = subDays(statsEndDate, 7);
    }

    // First filter logs by date range
    const dateFilteredLogs = activityLogs.filter(log => {
      const logDate = new Date(log.time);
      return logDate >= statsStartDate && logDate <= statsEndDate;
    });

    // Then filter to only include activities for products that exist in current inventory
    const filteredLogs = dateFilteredLogs.filter(log => {
      // Check for new product additions
      const newProductMatch = log.detail.match(/added new product "([^"]+)" with total quantity (\d+)/);
      if (newProductMatch) {
        const [, productName] = newProductMatch;
        return inventory.some(item => item.name === productName);
      }
      
      // Check for quantity updates in existing products
      const quantityUpdateMatch = log.detail.match(/edited product "([^"]+)": quantity from (\d+) to (\d+)/);
      if (quantityUpdateMatch) {
        const [, productName] = quantityUpdateMatch;
        return inventory.some(item => item.name === productName);
      }
      
      // Include other activities that might be relevant
      return true;
    });

    // Process filtered activity logs to find product additions and quantity increases
    filteredLogs.forEach(log => {
      let unitsAdded = 0;
      let isInboundActivity = false;
      let productName = '';
      
      // Check for new product additions
      const newProductMatch = log.detail.match(/added new product "([^"]+)" with total quantity (\d+)/);
      if (newProductMatch) {
        const [, name, quantity] = newProductMatch;
        // Only count if the product still exists in current inventory
        const existingProduct = inventory.find(item => item.name === name);
        if (existingProduct) {
          unitsAdded = parseInt(quantity);
          productName = name;
          isInboundActivity = true;
        }
      }
      
      // Check for quantity increases in existing products
      const quantityUpdateMatch = log.detail.match(/edited product "([^"]+)": quantity from (\d+) to (\d+)/);
      if (quantityUpdateMatch) {
        const [, name, oldQuantity, newQuantity] = quantityUpdateMatch;
        // Only count if the product still exists in current inventory
        const existingProduct = inventory.find(item => item.name === name);
        if (existingProduct) {
          const increase = parseInt(newQuantity) - parseInt(oldQuantity);
          if (increase > 0) {
            unitsAdded = increase;
            productName = name;
            isInboundActivity = true;
          }
        }
      }
      
      if (isInboundActivity) {
        const logDate = new Date(log.time);
        let dateKey: string;

        switch (timeRange) {
          case 'hourly':
            dateKey = format(logDate, 'HH:mm');
            break;
          case 'daily':
            dateKey = format(logDate, 'MMM dd');
            break;
          case 'weekly':
            dateKey = format(logDate, "'Week' w");
            break;
          case 'monthly':
            dateKey = format(logDate, 'MMM yyyy');
            break;
          default:
            dateKey = format(logDate, 'MMM dd');
        }

        const current = groupedProducts.get(dateKey) || { activities: 0, units: 0, uniqueProducts: new Set<string>() };
        current.uniqueProducts.add(productName);
        groupedProducts.set(dateKey, {
          activities: current.activities + 1, // Count number of activities
          units: current.units + unitsAdded, // Sum the units added
          uniqueProducts: current.uniqueProducts // Track unique products
        });
      }
    });

    groupedProducts.forEach((dataItem, date) => {
      data.push({
        date,
        activities: dataItem.activities,
        units: dataItem.units,
        uniqueProducts: dataItem.uniqueProducts.size
      });
    });

    return data.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });
  };

  const getOutboundProductsData = () => {
    const data: { date: string; products: number }[] = [];
    const groupedProducts = new Map<string, number>();

    // Calculate date range for filtering logs
    const statsEndDate = new Date();
    let statsStartDate: Date;

    switch (timeRange) {
      case 'hourly':
        statsStartDate = subHours(statsEndDate, 24);
        break;
      case 'daily':
        statsStartDate = subDays(statsEndDate, 7);
        break;
      case 'weekly':
        statsStartDate = subDays(statsEndDate, 30);
        break;
      case 'monthly':
        statsStartDate = subDays(statsEndDate, 90);
        break;
      default:
        statsStartDate = subDays(statsEndDate, 7);
    }

    // First filter logs by date range
    const dateFilteredLogs = activityLogs.filter(log => {
      const logDate = new Date(log.time);
      return logDate >= statsStartDate && logDate <= statsEndDate;
    });

    // Then filter to only include activities for products that exist in current inventory
    const filteredLogs = dateFilteredLogs.filter(log => {
      // Check for deductions (these should be included as they affect current inventory)
      const deductionMatch = log.detail.match(/(\d+) units deducted from stock/);
      if (deductionMatch) {
        return true; // Include all deductions as they affect current inventory
      }
      
      // Include other activities that might be relevant
      return true;
    });

    // Process filtered activity logs to find product deductions
    filteredLogs.forEach(log => {
      const match = log.detail.match(/(\d+) units deducted from stock/);
      if (match) {
        const logDate = new Date(log.time);
        let dateKey: string;

        switch (timeRange) {
          case 'hourly':
            dateKey = format(logDate, 'HH:mm');
            break;
          case 'daily':
            dateKey = format(logDate, 'MMM dd');
            break;
          case 'weekly':
            dateKey = format(logDate, "'Week' w");
            break;
          case 'monthly':
            dateKey = format(logDate, 'MMM yyyy');
            break;
          default:
            dateKey = format(logDate, 'MMM dd');
        }

        const currentCount = groupedProducts.get(dateKey) || 0;
        groupedProducts.set(dateKey, currentCount + parseInt(match[1])); // Count total units deducted
      }
    });

    groupedProducts.forEach((count, date) => {
      data.push({
        date,
        products: count
      });
    });

    return data.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateA.getTime() - dateB.getTime();
    });
  };

  const getDamagedProductsData = () => {
    const data: { date: string; products: number; units: number; productNames: string[] }[] = [];
    const groupedProducts = new Map<string, { incidents: number; units: number; productNames: Set<string> }>();
    
    // For detailed incident tracking (used in PDF export)
    const detailedIncidents: Array<{
      date: string;
      time: string;
      user: string;
      productName: string;
      units: number;
      detail: string;
    }> = [];

    // Calculate date range for filtering logs
    const endDateValue = endDate || new Date();
    const startDateValue = startDate || subDays(endDateValue, 7);

    // First filter logs by date range
    const dateFilteredLogs = activityLogs.filter(log => {
      const logDate = new Date(log.time);
      return logDate >= startDateValue && logDate <= endDateValue;
    });

    // Then filter to only include activities for products that exist in current inventory
    const filteredLogs = dateFilteredLogs.filter(log => {
      // Check for damaged products (include these as they affect current inventory)
      const damagedPatterns = [
        /Reason: damaged/i,
        /damaged/i,
        /damagedItems/i,
        /damaged items/i
      ];
      if (damagedPatterns.some(pattern => pattern.test(log.detail))) {
        return true; // Include damaged product activities
      }
      
      // Include other activities that might be relevant
      return true;
    });

    // Process filtered activity logs to find damaged product activities
    filteredLogs.forEach(log => {
      // Check for multiple patterns that indicate damaged products
      const damagedPatterns = [
        /Reason: damaged/i,
        /damaged/i,
        /damagedItems/i,
        /damaged items/i
      ];
      
      const isDamagedActivity = damagedPatterns.some(pattern => pattern.test(log.detail));
      
      if (isDamagedActivity) {
        const logDate = new Date(log.time);
        let dateKey: string;

        switch (timeRange) {
          case 'hourly':
            dateKey = format(logDate, 'HH:mm');
            break;
          case 'daily':
            dateKey = format(logDate, 'MMM dd');
            break;
          case 'weekly':
            dateKey = format(logDate, "'Week' w");
            break;
          case 'monthly':
            dateKey = format(logDate, 'MMM yyyy');
            break;
          default:
            dateKey = format(logDate, 'MMM dd');
        }

        // Try to extract the number of units damaged from the log detail
        let unitsDamaged = 0; // Start with 0, we'll try to extract the actual quantity
        
        // Primary pattern: "X units deducted from stock" with "Reason: damaged"
        const primaryPattern = /(\d+)\s+units?\s+deducted\s+from\s+stock.*Reason:\s*damaged/i;
        const primaryMatch = log.detail.match(primaryPattern);
        
        if (primaryMatch) {
          unitsDamaged = parseInt(primaryMatch[1]);
        } else {
          // Fallback patterns for other damaged product scenarios
          const fallbackPatterns = [
            // Patterns for "damaged items from X to Y" (stock editing)
            /damaged\s+items\s+from\s+(\d+)\s+to\s+(\d+)/i,
            // Patterns for "X damaged items" or "damaged X items"
            /(\d+)\s+damaged\s+items?/i,
            /damaged\s+(\d+)\s+items?/i,
            // Patterns for "damagedItems: X"
            /damagedItems?:\s*(\d+)/i,
            // Generic patterns
            /(\d+)\s+units?\s+damaged/i,
            /damaged\s+(\d+)\s+units?/i
          ];
          
          for (const pattern of fallbackPatterns) {
            const match = log.detail.match(pattern);
            if (match) {
              if (match.length === 3) {
                const fromValue = parseInt(match[1]);
                const toValue = parseInt(match[2]);
                unitsDamaged = Math.abs(fromValue - toValue);
              } else {
                unitsDamaged = parseInt(match[1]);
              }
              break;
            }
          }
        }

        // Extract product name from the log detail
        let productName = 'Unknown Product';
        const productMatch = log.detail.match(/"([^"]+)"/);
        if (productMatch) {
          productName = productMatch[1];
        }

        // Add to detailed incidents for PDF export
        detailedIncidents.push({
          date: dateKey,
          time: format(logDate, 'HH:mm'),
          user: log.user,
          productName: productName,
          units: unitsDamaged > 0 ? unitsDamaged : 1,
          detail: log.detail
        });

        // Group by date
        if (!groupedProducts.has(dateKey)) {
          groupedProducts.set(dateKey, { incidents: 0, units: 0, productNames: new Set() });
        }
        
        const group = groupedProducts.get(dateKey)!;
        group.incidents += 1;
        group.units += (unitsDamaged > 0 ? unitsDamaged : 1);
        group.productNames.add(productName);
      }
    });

    // Convert grouped data to array format
    groupedProducts.forEach((group, date) => {
      data.push({
        date,
        products: group.incidents,
        units: group.units,
        productNames: Array.from(group.productNames)
      });
    });

    // Sort the main data by date
    const sortedData = data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Store detailed incidents for PDF export
    (sortedData as any).detailedIncidents = detailedIncidents.sort((a, b) => {
      const dateA = new Date(a.date + ' ' + a.time);
      const dateB = new Date(b.date + ' ' + b.time);
      return dateB.getTime() - dateA.getTime(); // Most recent first
    });

    return sortedData;
  };

  // Export functions
  const exportToCSV = () => {
    try {
      // Create comprehensive CSV with multiple sheets
      const timestamp = format(new Date(), 'yyyy-MM-dd-HH-mm');
      const periodLabel = timeRange === 'hourly' ? 'Last 24 Hours' :
                         timeRange === 'daily' ? 'Last 7 Days' : 
                         timeRange === 'weekly' ? 'Last Month' : 
                         timeRange === 'monthly' ? 'Last 3 Months' : 'Last 6 Months';
      
      // Inventory data
      const inventoryData = inventory.map(item => [
        item.name,
        item.quantity,
        item.price,
        `${item.locationCode}-${item.shelfNumber}`,
        item.status,
        item.damagedItems
      ]);

      // Get current page data (exactly what's shown on the page)
      const inboundData = getInboundProductsData();
      const outboundData = getOutboundProductsData();
      const damagedData = getDamagedProductsData();
      
      // Create a comprehensive table with all data in proper column format
      const maxRows = Math.max(
        inboundData.length,
        outboundData.length,
        damagedData.length,
        inventoryData.length
      );

      // Build the CSV with proper column structure
      const csvRows = [];
      
      // Header row with metadata
      csvRows.push(`Warehouse Analytics Report - ${periodLabel} - Time Range: ${timeRange.charAt(0).toUpperCase() + timeRange.slice(1)} - Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`);
      csvRows.push(''); // Empty row for separation
      
      // Statistics summary row
      csvRows.push('SUMMARY STATISTICS');
      const csvSummaryRow = `Total Stock Added (${periodLabel}),${stats.todayStockAdditions},Total Units Deducted (${periodLabel}),${stats.totalDeductions},Total Damaged Products (${periodLabel}),${stats.totalDamagedProducts}${user?.role === 'admin' ? `,Total Inventory Value,£${stats.totalInventoryValue.toLocaleString('en-GB')}` : ''}`;
      csvRows.push(csvSummaryRow);
      csvRows.push(''); // Empty row for separation
      
      // Main data table headers
      csvRows.push('INBOUND DATA,,,OUTBOUND DATA,,DAMAGED DATA,,,INVENTORY DATA,,,,,');
      csvRows.push('Date,Activities,Units Added,Affected Products,Date,Units Deducted,Date,Incidents,Units Damaged,Product Name,Quantity,Price,Location,Status,Damaged Items');
      
      // Data rows
      for (let i = 0; i < maxRows; i++) {
        const row = [];
        
        // Inbound data columns
        if (i < inboundData.length) {
          const inbound = inboundData[i];
          row.push(inbound.date, inbound.activities, inbound.units, inbound.uniqueProducts);
        } else {
          row.push('', '', '', '');
        }
        
        // Outbound data columns
        if (i < outboundData.length) {
          const outbound = outboundData[i];
          row.push(outbound.date, outbound.products);
        } else {
          row.push('', '');
        }
        
        // Damaged data columns
        if (i < damagedData.length) {
          const damaged = damagedData[i];
          row.push(damaged.date, damaged.products, damaged.units);
        } else {
          row.push('', '', '');
        }
        
        // Inventory data columns
        if (i < inventoryData.length) {
          const invRow = inventoryData[i];
          row.push(...invRow);
        } else {
          row.push('', '', '', '', '', '');
        }
        
        csvRows.push(row.join(','));
      }
      
      // Add detailed damaged products incidents
      csvRows.push(''); // Empty row for separation
      csvRows.push('DETAILED DAMAGED PRODUCTS INCIDENTS');
      csvRows.push('Date,Time,User,Product Name,Units Damaged,Details');
      
      if ((damagedData as any).detailedIncidents && (damagedData as any).detailedIncidents.length > 0) {
        (damagedData as any).detailedIncidents.forEach((incident: any) => {
          csvRows.push(`${incident.date},${incident.time},${incident.user},${incident.productName},${incident.units},"${incident.detail.replace(/"/g, '""')}"`);
        });
      } else {
        csvRows.push('No detailed incidents available,,,,,');
      }
      
      const csvContent = csvRows.join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
      link.download = `warehouse-report-${periodLabel}-${timestamp}.csv`;
    link.click();
      
      // Clean up
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Failed to export CSV. Please try again.');
    }
  };

  const exportToPDF = () => {
    try {
      // Create a simple HTML report that can be printed as PDF
      const periodLabel = timeRange === 'hourly' ? 'Last 24 Hours' :
                         timeRange === 'daily' ? 'Last 7 Days' : 
                         timeRange === 'weekly' ? 'Last Month' : 
                         timeRange === 'monthly' ? 'Last 3 Months' : 'Last 6 Months';
      
      // Get current page data (exactly what's shown on the page)
      const inboundData = getInboundProductsData();
      const outboundData = getOutboundProductsData();
      const damagedData = getDamagedProductsData();
      
      // Extract detailed incidents data for PDF export
      const detailedIncidents = (damagedData as any).detailedIncidents || [];
      
      // Debug logging
      console.log('Damaged Data:', damagedData);
      console.log('Detailed Incidents:', detailedIncidents);
      console.log('Activity Logs Count:', activityLogs.length);
      console.log('Sample Activity Logs:', activityLogs.slice(0, 3));
      
      // If no detailed incidents, try to generate them on the fly
      if (!detailedIncidents || detailedIncidents.length === 0) {
        console.log('No detailed incidents found, generating on the fly...');
        // This will be handled by the fallback in the template
      }
      
      const reportContent = `
        <html>
          <head>
            <title>Warehouse Analytics Report - ${periodLabel}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
              .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
              .section { margin-bottom: 30px; page-break-inside: avoid; }
              .section h2 { color: #2563eb; border-bottom: 1px solid #2563eb; padding-bottom: 5px; margin-bottom: 15px; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
              th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
              th { background-color: #f8fafc; font-weight: bold; }
              .detailed-table th, .detailed-table td { font-size: 10px; padding: 4px; }
              .detailed-table td { max-width: 150px; word-wrap: break-word; }
              .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; }
              .stat-card { border: 1px solid #e2e8f0; padding: 15px; text-align: center; border-radius: 8px; }
              .stat-value { font-size: 24px; font-weight: bold; color: #2563eb; margin-bottom: 5px; }
              .stat-title { font-size: 14px; color: #64748b; }
              .chart-summary { background-color: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 15px; }
              @media print { 
                body { margin: 0; } 
                .section { page-break-inside: avoid; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Warehouse Analytics Report</h1>
              <p><strong>Time Period:</strong> ${periodLabel}</p>
              <p><strong>Time Range:</strong> ${timeRange.charAt(0).toUpperCase() + timeRange.slice(1)} View</p>
              <p><strong>Generated:</strong> ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}</p>
            </div>
            
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-value">${stats.todayStockAdditions}</div>
                <div class="stat-title">Total Stock Added<br/>(${periodLabel})</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${stats.totalDeductions}</div>
                <div class="stat-title">Total Units Deducted<br/>(${periodLabel})</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${stats.totalDamagedProducts}</div>
                <div class="stat-title">Total Damaged Products<br/>(${periodLabel})</div>
              </div>
              ${user?.role === 'admin' ? `
              <div class="stat-card">
                <div class="stat-value">£${stats.totalInventoryValue.toLocaleString('en-GB')}</div>
                <div class="stat-title">Total Inventory Value</div>
              </div>
              ` : ''}
            </div>
            
            <div class="section">
              <h2>Inbound Products Analysis (${timeRange.charAt(0).toUpperCase() + timeRange.slice(1)} View)</h2>
              <div class="chart-summary">
                <p><strong>Total Data Points:</strong> ${inboundData.length}</p>
                <p><strong>Total Activities:</strong> ${inboundData.reduce((sum, item) => sum + item.activities, 0)}</p>
                <p><strong>Total Units Added:</strong> ${inboundData.reduce((sum, item) => sum + item.units, 0)}</p>
                <p><strong>Total Products Affected:</strong> ${inboundData.reduce((sum, item) => sum + item.uniqueProducts, 0)}</p>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Activities</th>
                    <th>Units Added</th>
                    <th>Affected Products</th>
                  </tr>
                </thead>
                <tbody>
                  ${inboundData.slice(0, 15).map(item => `
                    <tr>
                      <td>${item.date}</td>
                      <td>${item.activities}</td>
                      <td>${item.units}</td>
                      <td>${item.uniqueProducts}</td>
                    </tr>
                  `).join('')}
                  ${inboundData.length > 15 ? `<tr><td colspan="4"><em>... and ${inboundData.length - 15} more entries</em></td></tr>` : ''}
                </tbody>
              </table>
            </div>
            
            <div class="section">
              <h2>Outbound Products Analysis (${timeRange.charAt(0).toUpperCase() + timeRange.slice(1)} View)</h2>
              <div class="chart-summary">
                <p><strong>Total Data Points:</strong> ${outboundData.length}</p>
                <p><strong>Total Units Deducted:</strong> ${outboundData.reduce((sum, item) => sum + item.products, 0)}</p>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Units Deducted</th>
                  </tr>
                </thead>
                <tbody>
                  ${outboundData.slice(0, 15).map(item => `
                    <tr>
                      <td>${item.date}</td>
                      <td>${item.products}</td>
                    </tr>
                  `).join('')}
                  ${outboundData.length > 15 ? `<tr><td colspan="2"><em>... and ${outboundData.length - 15} more entries</em></td></tr>` : ''}
                </tbody>
              </table>
            </div>
            
            <div class="section">
              <h2>Damaged Products Analysis (${timeRange.charAt(0).toUpperCase() + timeRange.slice(1)} View)</h2>
              <div class="chart-summary">
                <p><strong>Total Data Points:</strong> ${damagedData.length}</p>
                <p><strong>Total Incidents:</strong> ${damagedData.reduce((sum, item) => sum + item.products, 0)}</p>
                <p><strong>Total Units Damaged:</strong> ${damagedData.reduce((sum, item) => sum + item.units, 0)}</p>
                <p><strong>Detailed Incidents Available:</strong> ${detailedIncidents.length}</p>
                <p><strong>Note:</strong> Detailed incident breakdown with user information is shown below.</p>
              </div>
              
              <h3>Summary by Date</h3>
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Incidents</th>
                    <th>Units Damaged</th>
                    <th>Product Names</th>
                  </tr>
                </thead>
                <tbody>
                  ${damagedData.slice(0, 15).map(item => `
                    <tr>
                      <td>${item.date}</td>
                      <td>${item.products}</td>
                      <td>${item.units}</td>
                      <td>${item.productNames ? item.productNames.join(', ') : 'N/A'}</td>
                    </tr>
                  `).join('')}
                  ${damagedData.length > 15 ? `<tr><td colspan="4"><em>... and ${damagedData.length - 15} more entries</em></td></tr>` : ''}
                </tbody>
              </table>
              
              <h3>Detailed Incidents by Entry</h3>
              <table class="detailed-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>User</th>
                    <th>Product</th>
                    <th>Units Damaged</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  ${detailedIncidents.length > 0 ? detailedIncidents.slice(0, 50).map((incident: any) => `
                    <tr>
                      <td>${incident.date} ${incident.time}</td>
                      <td>${incident.user}</td>
                      <td>${incident.productName}</td>
                      <td>${incident.units}</td>
                      <td style="max-width: 200px; word-wrap: break-word;">${incident.detail}</td>
                    </tr>
                  `).join('') : '<tr><td colspan="5">No detailed incidents available</td></tr>'}
                  ${detailedIncidents.length > 50 ? `<tr><td colspan="5"><em>... and ${detailedIncidents.length - 50} more incidents</em></td></tr>` : ''}
                </tbody>
              </table>
            </div>
            
            <div class="section">
              <h2>Inventory Summary (${inventory.length} items)</h2>
              <div class="chart-summary">
                <p><strong>Total Products:</strong> ${inventory.length}</p>
                <p><strong>Active Products:</strong> ${inventory.filter(item => item.status === 'active').length}</p>
                <p><strong>Pending Products:</strong> ${inventory.filter(item => item.status === 'pending').length}</p>
                <p><strong>Total Quantity:</strong> ${inventory.reduce((sum, item) => sum + (item.quantity || 0), 0)}</p>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Price</th>
                    <th>Location</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${inventory.map(item => `
                    <tr>
                      <td>${item.name}</td>
                      <td>${item.quantity}</td>
                      <td>${item.price && !isNaN(item.price) ? `£${item.price.toFixed(2)}` : 'Not set'}</td>
                      <td>${item.locationCode}-${item.shelfNumber}</td>
                      <td>${item.status}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </body>
        </html>
      `;

      // Open in new window for printing
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(reportContent);
        newWindow.document.close();
        newWindow.focus();
        
        // Auto-print after a short delay
        setTimeout(() => {
          newWindow.print();
        }, 500);
      } else {
        alert('Please allow pop-ups to export PDF');
      }
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <style>
        {`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(1rem);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fade-in-up {
            animation: fadeInUp 0.5s ease-out forwards;
          }
        `}
      </style>
      
      {/* Header Section */}
      <div className="space-y-4">
        {/* Title */}
        <div className="text-center md:text-left">
          <h1 className={`text-xl md:text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Reports and Analytics</h1>
          <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mt-1 text-sm md:text-base`}>Admin Dashboard - Comprehensive warehouse insights</p>
        </div>
        
        {/* Controls - Responsive layout */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
          {/* Export Buttons */}
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={exportToCSV}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 border shadow-sm text-sm leading-4 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 animate-fade-in-up ${
                isDarkMode 
                  ? 'border-slate-600 text-slate-200 bg-slate-700 hover:bg-slate-600' 
                  : 'border-slate-300 text-slate-700 bg-white hover:bg-slate-50'
              }`}
              style={{ animationDelay: '200ms' }}
            >
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden xs:inline">Export </span>CSV
            </button>
            <button
              onClick={exportToPDF}
              className={`flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-2 border shadow-sm text-sm leading-4 font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 animate-fade-in-up ${
                isDarkMode 
                  ? 'border-slate-600 text-slate-200 bg-slate-700 hover:bg-slate-600' 
                  : 'border-slate-300 text-slate-700 bg-white hover:bg-slate-50'
              }`}
              style={{ animationDelay: '400ms' }}
            >
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden xs:inline">Export </span>PDF
            </button>
          </div>

          {/* Filters and Controls */}
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {/* Time Range Filter */}
            <div className="w-full sm:w-auto">
              <Select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as 'hourly' | 'daily' | 'weekly' | 'monthly')}
                options={[
                  { value: 'hourly', label: 'Hourly' },
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' }
                ]}
                className="animate-fade-in-up text-sm w-full sm:w-auto"
                style={{ animationDelay: '100ms' }}
              />
            </div>
            
            {/* Calendar Date Range Picker */}
            <div className="w-full sm:w-auto">
              <CalendarDateRangePicker
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
                onClear={clearDateRange}
                className="animate-fade-in-up text-sm w-full sm:w-auto"
              />
            </div>
            
            {/* Refresh Button */}
            <Button
              variant="secondary"
              onClick={fetchData}
              className={`flex items-center justify-center gap-2 w-full sm:w-auto ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={isLoading}
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
              
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {isLoading ? (
          <>
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
            <StatsCardSkeleton />
          </>
        ) : (
          <>
            <StatsCard 
              title={`Total Stock Added (${startDate && endDate ? `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}` : startDate ? `From ${format(startDate, 'MMM d, yyyy')}` : endDate ? `To ${format(endDate, 'MMM d, yyyy')}` : 'Last 7 Days'})`}
              value={stats.todayStockAdditions}
              icon={<Package size={24} className="text-blue-600" />}
            />
            <StatsCard 
              title={`Total Units Deducted (${startDate && endDate ? `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}` : startDate ? `From ${format(startDate, 'MMM d, yyyy')}` : endDate ? `To ${format(endDate, 'MMM d, yyyy')}` : 'Last 7 Days'})`}
              value={stats.totalDeductions}
              icon={<TrendingDown size={24} className="text-blue-600" />}
            />
            <StatsCard 
              title={`Total Damaged Products (${startDate && endDate ? `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}` : startDate ? `From ${format(startDate, 'MMM d, yyyy')}` : endDate ? `To ${format(endDate, 'MMM d, yyyy')}` : 'Last 7 Days'})`}
              value={stats.totalDamagedProducts}
              icon={<AlertCircle size={24} className="text-blue-600" />}
            />
            {user?.role === 'admin' && (
              <StatsCard 
                title="Total Inventory Value" 
                value={`£${stats.totalInventoryValue.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                icon={<PoundSterling size={24} className="text-blue-600" />}
              />
            )}
            
          </>
        )}
      </div>



      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${isDarkMode ? 'border-white' : 'border-slate-800'}`}></div>
        </div>
      ) : (
        <>
          {/* Charts */}
          <div className="space-y-4 md:space-y-6">
            {/* Inbound Products Trends */}
            <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} p-3 md:p-4 rounded-lg shadow-sm`}>
              <h3 className={`text-base md:text-lg font-medium ${isDarkMode ? 'text-white' : 'text-slate-800'} mb-3 md:mb-4`}>Inbound Products - Daily Additions & Units</h3>
              <div className="h-64 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={getInboundProductsData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
                    <XAxis dataKey="date" stroke={isDarkMode ? '#94a3b8' : '#64748b'} />
                    <YAxis stroke={isDarkMode ? '#94a3b8' : '#64748b'} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                        border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
                        color: isDarkMode ? '#e2e8f0' : '#1e293b'
                      }}
                      formatter={(value: number, name: string) => {
                        if (name === 'Inbound Activities') {
                          return [`${value} activities`, name];
                        } else if (name === 'Units Added') {
                          return [`${value} units`, name];
                        } else if (name === 'Affected Products') {
                          return [`${value} products`, name];
                        }
                        return [value, name];
                      }}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="activities" stroke="#8884d8" name="Inbound Activities" strokeWidth={2} />
                    <Line type="monotone" dataKey="units" stroke="#82ca9d" name="Units Added" strokeWidth={2} />
                    <Line type="monotone" dataKey="uniqueProducts" stroke="#ffc658" name="Affected Products" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Outbound Products Trends */}
            <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} p-3 md:p-4 rounded-lg shadow-sm`}>
              <h3 className={`text-base md:text-lg font-medium ${isDarkMode ? 'text-white' : 'text-slate-800'} mb-3 md:mb-4`}>Outbound Products - Daily Deductions</h3>
              <div className="h-64 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={getOutboundProductsData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
                    <XAxis dataKey="date" stroke={isDarkMode ? '#94a3b8' : '#64748b'} />
                    <YAxis stroke={isDarkMode ? '#94a3b8' : '#64748b'} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                        border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
                        color: isDarkMode ? '#e2e8f0' : '#1e293b'
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="products" stroke="#ff6b6b" name="Units Deducted" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Damaged Products Trends */}
            <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} p-3 md:p-4 rounded-lg shadow-sm`}>
              <h3 className={`text-base md:text-lg font-medium ${isDarkMode ? 'text-white' : 'text-slate-800'} mb-3 md:mb-4`}>Damaged Products - Daily Incidents & Units</h3>
              <div className="h-64 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={getDamagedProductsData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
                    <XAxis dataKey="date" stroke={isDarkMode ? '#94a3b8' : '#64748b'} />
                    <YAxis stroke={isDarkMode ? '#94a3b8' : '#64748b'} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                        border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
                        color: isDarkMode ? '#e2e8f0' : '#1e293b'
                      }}
                      formatter={(value: number, name: string) => {
                        if (name === 'Damaged Incidents') {
                          return [`${value} incidents`, name];
                        } else if (name === 'Units Damaged') {
                          return [`${value} units`, name];
                        }
                        return [value, name];
                      }}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="products" stroke="#ffa726" name="Damaged Incidents" strokeWidth={2} />
                    <Line type="monotone" dataKey="units" stroke="#ef5350" name="Units Damaged" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ReportsAnalytics; 