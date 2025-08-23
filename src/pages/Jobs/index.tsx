import React, { useCallback, useEffect, useState } from 'react';
import { Plus, RefreshCw, CheckSquare, ClipboardList, Trash2, Edit, ChevronUp, ChevronDown, Search, X, ArrowLeft } from 'lucide-react';
import { db } from '../../config/firebase';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, Timestamp, updateDoc, where } from 'firebase/firestore';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import Button from '../../components/ui/Button';
import Modal from '../../components/modals/Modal';
import DeleteConfirmationModal from '../../components/modals/DeleteConfirmationModal';
import DateRangePicker from '../../components/ui/DateRangePicker';
import { useAuth } from '../../contexts/AuthContext';
import Input from '../../components/ui/Input';
import JobStockUpdateForm from '../../components/stock/JobStockUpdateForm';
import { StockItem, JobItem } from '../../types';

type JobStatus = 'picking' | 'awaiting_pack' | 'completed';



type Job = {
  id: string;
  jobId: string; // same as id, for display
  createdAt: Date;
  createdBy: string;
  status: JobStatus;
  picker?: string | null;
  packer?: string | null;
  items: JobItem[];
  pickingTime?: number; // Time taken to complete picking in seconds
};

type FirestoreJobItem = {
  barcode?: string;
  name?: string | null;
  asin?: string | null;
  quantity?: number;
  verified?: boolean;
  locationCode?: string;
  shelfNumber?: string;
  reason?: string;
  storeName?: string;
};

type FirestoreJob = {
  jobId?: string;
  createdAt?: Timestamp | Date | string;
  createdBy?: string;
  status?: JobStatus;
  picker?: string | null;
  packer?: string | null;
  items?: FirestoreJobItem[];
  pickingTime?: number; // Time taken to complete picking in seconds
};

const Jobs: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { showToast } = useToast();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isNewJobModalOpen, setIsNewJobModalOpen] = useState(false);
  const [newJobItems, setNewJobItems] = useState<JobItem[]>([]);
  const [pendingStockUpdates, setPendingStockUpdates] = useState<Array<{
    stockItem: StockItem;
    deductedQuantity: number;
    reason: string;
    storeName: string;
    locationCode: string;
    shelfNumber: string;
  }>>([]);
  const [editingItem, setEditingItem] = useState<{index: number, barcode: string, quantity: number, reason?: string, storeName?: string, name?: string | null} | null>(null);
  const [editingJobItem, setEditingJobItem] = useState<{jobId: string, itemIndex: number, barcode: string, quantity: number, locationCode?: string, shelfNumber?: string, reason?: string, storeName?: string} | null>(null);
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [manualBarcode, setManualBarcode] = useState(''); // State for manual barcode input
  const [isStockUpdateModalOpen, setIsStockUpdateModalOpen] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState<StockItem | null>(null);
  const [jobCreationStartTime, setJobCreationStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [verifyingItems, setVerifyingItems] = useState<Set<string>>(new Set());
  
  // Search functionality state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<StockItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchType, setSearchType] = useState<'name' | 'barcode' | 'asin'>('name');
  const [showSearchSection, setShowSearchSection] = useState(false);
  
  // Date range filter for archived jobs
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  
  // User filter for archived jobs
  const [selectedUser, setSelectedUser] = useState<string>('all');

  // Helper function to check if a job should be archived (older than current day at 12 AM)
  const isJobArchived = (job: Job): boolean => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Start of today (12 AM)
    return job.createdAt < todayStart && job.status === 'completed';
  };

  // Helper function to check if a job matches the date range filter
  const isJobInDateRange = (job: Job): boolean => {
    if (!startDate && !endDate) return true; // No date filter applied
    
    const jobDate = job.createdAt;
    
    if (startDate && endDate) {
      return jobDate >= startDate && jobDate <= endDate;
    } else if (startDate) {
      return jobDate >= startDate;
    } else if (endDate) {
      return jobDate <= endDate;
    }
    
    return true;
  };
  
  // Get unique users from jobs for filter dropdown
  const getUniqueUsers = (): string[] => {
    const users = new Set(jobs.map(job => job.createdBy));
    return Array.from(users).sort();
  };
  
  // Check if job matches user filter
  const isJobMatchingUser = (job: Job): boolean => {
    if (selectedUser === 'all') return true;
    return job.createdBy === selectedUser;
  };

  const filteredJobs = jobs.filter(job => {
    if (showArchived) {
      return isJobArchived(job) && isJobInDateRange(job) && isJobMatchingUser(job);
    } else if (showCompleted) {
      return job.status === 'completed' && !isJobArchived(job);
    } else {
      return job.status !== 'completed';
    }
  });

  const logActivity = async ( details: string) => {
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

  const formatElapsedTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const remainingSeconds = seconds % 60;
      return `${hours}h ${minutes}m ${remainingSeconds}s`;
    }
  };

  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    // Reset view states when refreshing - default to Active Jobs
    setShowCompleted(false);
    setShowArchived(false);
    // Reset filters when refreshing
    setStartDate(null);
    setEndDate(null);
    setSelectedUser('all');
    try {
      const q = query(collection(db, 'jobs'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const list: Job[] = snapshot.docs.map(d => {
        const data = d.data() as FirestoreJob;
        return {
          id: d.id,
          jobId: data.jobId || '',
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(),
          createdBy: data.createdBy || 'Unknown',
          status: (data.status as JobStatus) || 'picking',
          picker: data.picker ?? null,
          packer: data.packer ?? null,
          items: Array.isArray(data.items) ? data.items.map((it: FirestoreJobItem) => ({
            barcode: String(it.barcode || ''),
            name: it.name ?? null,
            asin: it.asin ?? null,
            quantity: Number(it.quantity || 1),
            verified: Boolean(it.verified),
            locationCode: it.locationCode,
            shelfNumber: it.shelfNumber,
            reason: it.reason || 'Unknown',
            storeName: it.storeName || 'Unknown',
          })) : [],
          pickingTime: data.pickingTime || 0,
        };
      });
      
      // Enhance items with product names from inventory for items that don't have names
      const enhancedList = await Promise.all(list.map(async (job) => {
        const enhancedItems = await Promise.all(job.items.map(async (item) => {
          if (item.name) return item; // Item already has a name
          
          try {
            // Fetch product name from inventory
            const q = query(collection(db, 'inventory'), where('barcode', '==', item.barcode));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
              const stockData = snapshot.docs[0].data();
              return { ...item, name: stockData.name || null };
            }
          } catch (error) {
            console.error('Error fetching product name for barcode:', item.barcode, error);
          }
          return item;
        }));
        
        return { ...job, items: enhancedItems };
      }));
      
      setJobs(enhancedList);
    } catch (e) {
      console.error(e);
      showToast('Failed to fetch jobs', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  // Timer for job creation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (jobCreationStartTime) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - jobCreationStartTime.getTime()) / 1000);
        setElapsedTime(elapsed);
      }, 1000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [jobCreationStartTime]);

  const openNewJobModal = () => {
    setManualBarcode(''); // Reset manual barcode input
    setNewJobItems([]); // Reset job items
    setPendingStockUpdates([]); // Reset pending updates
    setJobCreationStartTime(new Date()); // Start timer
    setElapsedTime(0); // Reset elapsed time
    setIsNewJobModalOpen(true);
  };

  //check barcode if exists
  const checkBarcodeExists = async (barcode: string): Promise<boolean> => {
    try {
      const q = query(collection(db, 'inventory'), where('barcode', '==', barcode));
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.error('Error checking barcode:', error);
      return false;
    }
  };

  const handleManualBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const barcode = manualBarcode.trim();
    if (!barcode) return;

    const exists = await checkBarcodeExists(barcode);
    if (!exists) {
      showToast(`Product with barcode ${barcode} does not exist`, 'error');
      return;
    }

    // Fetch the stock item details and open stock update modal
    try {
      const q = query(collection(db, 'inventory'), where('barcode', '==', barcode));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        // Create a stock item with the barcode and basic info, but let the form fetch all locations
        const stockData = snapshot.docs[0].data() as StockItem;
        const stockItem: StockItem = {
          ...stockData,
          id: snapshot.docs[0].id,
          lastUpdated: stockData.lastUpdated instanceof Timestamp ? stockData.lastUpdated.toDate() : new Date(stockData.lastUpdated)
        };
        setSelectedStockItem(stockItem);
        setIsStockUpdateModalOpen(true);
        setIsNewJobModalOpen(false);
      }
    } catch (error) {
      console.error('Error fetching stock item:', error);
      showToast('Error fetching stock item details', 'error');
    }
  };

  const handleStockUpdate = async (data: { id: string; quantity: number; reason: string; storeName: string; locationCode: string; shelfNumber: string }) => {
    if (!selectedStockItem) return;
    
    // Calculate the deducted quantity
    const deductedQuantity = selectedStockItem.quantity - data.quantity;
    
    // Find the specific stock item for this location (not just by barcode)
    const stockQuery = query(collection(db, 'inventory'), 
      where('barcode', '==', selectedStockItem.barcode),
      where('locationCode', '==', data.locationCode),
      where('shelfNumber', '==', data.shelfNumber)
    );
    const stockSnapshot = await getDocs(stockQuery);
    
    if (stockSnapshot.empty) {
      showToast('Stock item not found for this location', 'error');
      return;
    }
    
    const locationSpecificStockItem = {
      ...selectedStockItem,
      id: stockSnapshot.docs[0].id,
      quantity: stockSnapshot.docs[0].data().quantity || 0
    };
    
    // Add to pending stock updates with the location-specific stock item
    setPendingStockUpdates(prev => [...prev, {
      stockItem: locationSpecificStockItem,
      deductedQuantity,
      reason: data.reason,
      storeName: data.storeName,
      locationCode: data.locationCode,
      shelfNumber: data.shelfNumber
    }]);
    
    // Add the barcode to the job items - treat barcode+location as unique identifier
    if (selectedStockItem.barcode) {
      setNewJobItems(prev => {
        const barcode = selectedStockItem.barcode!;
        
        // Check if this exact barcode+location combination already exists
        const existingIndex = prev.findIndex(item => 
          item.barcode === barcode && 
          item.locationCode === data.locationCode && 
          item.shelfNumber === data.shelfNumber
        );
        
        if (existingIndex >= 0) {
          // Update existing item quantity for this specific location
          const updated = [...prev];
          updated[existingIndex] = { ...updated[existingIndex], quantity: updated[existingIndex].quantity + deductedQuantity };
          return updated;
        } else {
          // Add new item with location information
          return [...prev, { 
            barcode: barcode, 
            name: selectedStockItem.name, // Add product name
            quantity: deductedQuantity, 
            verified: false,
            locationCode: data.locationCode,
            shelfNumber: data.shelfNumber,
            reason: data.reason,
            storeName: data.storeName
          }];
        }
      });
    }
    
    showToast('Item added to job', 'success');
    setIsStockUpdateModalOpen(false);
    setSelectedStockItem(null);
    
    // Return to the Add Barcode modal to continue adding more barcodes
    setIsNewJobModalOpen(true);
    
    // Reset the barcode input field
    setManualBarcode('');
    
    // Refresh the search functionality
    refreshSearch();
  };

  const handleStockUpdateCancel = () => {
    setIsStockUpdateModalOpen(false);
    setSelectedStockItem(null);
    setIsNewJobModalOpen(true);
    
    // Refresh the search functionality
    refreshSearch();
  };

  // Function to refresh search when returning to Add Barcode modal
  const refreshSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchType('name');
    setShowSearchSection(false);
  };

  // Function to clear date range filter
  const clearDateRange = () => {
    setStartDate(null);
    setEndDate(null);
  };
  
  const clearUserFilter = () => {
    setSelectedUser('all');
  };
  
  const clearAllFilters = () => {
    setStartDate(null);
    setEndDate(null);
    setSelectedUser('all');
  };

  const finishNewJobPicking = async () => {
    if (newJobItems.length === 0) {
      showToast('Add at least one item to create a job', 'error');
      return;
    }
    
    setIsLoading(true);
    try {
      // Apply all pending stock updates
      for (const update of pendingStockUpdates) {
        const stockRef = doc(db, 'inventory', update.stockItem.id);
        await updateDoc(stockRef, {
          quantity: update.stockItem.quantity - update.deductedQuantity,
          lastUpdated: serverTimestamp()
        });
        
        // Add activity log for each stock update
        await addDoc(collection(db, 'activityLogs'), {
          detail: `${update.deductedQuantity} units deducted from stock "${update.stockItem.name}" (Reason: ${update.reason}, Store: ${update.storeName}) by ${user?.role}`,
          time: new Date().toISOString(),
          user: user?.name,
          role: user?.role
        });
      }
      
      // Also ensure all job items have corresponding stock updates
      // This handles cases where items might have been edited but pending updates weren't properly synced
      for (const jobItem of newJobItems) {
        // Check if this job item already has a pending update
        const hasPendingUpdate = pendingStockUpdates.some(update => 
          update.stockItem.barcode === jobItem.barcode &&
          update.locationCode === jobItem.locationCode &&
          update.shelfNumber === jobItem.shelfNumber
        );
        
        if (!hasPendingUpdate) {
          // Find the stock item in inventory to update - use the specific location
          const stockQuery = query(collection(db, 'inventory'), 
            where('barcode', '==', jobItem.barcode),
            where('locationCode', '==', jobItem.locationCode),
            where('shelfNumber', '==', jobItem.shelfNumber)
          );
          const stockSnapshot = await getDocs(stockQuery);
          
          if (!stockSnapshot.empty) {
            const stockDoc = stockSnapshot.docs[0];
            const stockData = stockDoc.data();
            const currentQuantity = stockData.quantity || 0;
            
            // Update stock quantity for this specific location
            await updateDoc(doc(db, 'inventory', stockDoc.id), {
              quantity: currentQuantity - jobItem.quantity,
              lastUpdated: serverTimestamp()
            });
            
            // Add activity log for this stock update
            // await addDoc(collection(db, 'activityLogs'), {
            //   detail: `${jobItem.quantity} units deducted from stock "${stockData.name || 'Unknown Product'}" at location ${jobItem.locationCode} shelf ${jobItem.shelfNumber} (Reason: job creation, Store: 'job') by ${user?.role}`,
            //   time: new Date().toISOString(),
            //   user: user?.name,
            //   role: user?.role
            // });
          }
        }
      }
      
      const numericId = Date.now().toString(); 

      const ref = await addDoc(collection(db, 'jobs'), {
        jobId: numericId,
        createdAt: serverTimestamp(),
        createdBy: user?.name || 'Unknown',
        status: 'awaiting_pack' as JobStatus,
        picker: user?.name || null,
        packer: null,
        items: newJobItems,
        pickingTime: elapsedTime // Store the elapsed time
      });
      await updateDoc(ref, { docId: ref.id });
      
      // Add activity log for job creation
      await logActivity(
        `created new job ${numericId} with ${newJobItems.length} items (${newJobItems.reduce((sum, item) => sum + item.quantity, 0)} total units)`
      );

      showToast(`Job ${numericId} created and awaiting pack`, 'success');
      setIsNewJobModalOpen(false);
      setNewJobItems([]);
      setPendingStockUpdates([]);
      setManualBarcode('');
      setJobCreationStartTime(null); // Stop timer
      setElapsedTime(0); // Reset elapsed time
      fetchJobs();
    } catch (e) {
      console.error(e);
      showToast('Failed to create job', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const completePicking = async (job: Job) => {
    try {
      await updateDoc(doc(db, 'jobs', job.id), { status: 'awaiting_pack', picker: user?.name || job.picker || null });
      
      await logActivity(
        `completed picking for job ${job.jobId} with ${job.items.length} items (${job.items.reduce((sum, item) => sum + item.quantity, 0)} total units)`
      );

      showToast(`Job ${job.jobId} completed and awaiting pack`, 'success');
      
      fetchJobs();
    } catch { showToast('Failed to update job', 'error'); }
  };

  const verifyItem = async (job: Job, barcode: string, verified: boolean) => {
    const itemKey = `${job.id}-${barcode}`;
    
    // Set loading state
    setVerifyingItems(prev => new Set(prev).add(itemKey));
    
    try {
      // Optimistically update the UI immediately for better performance
      setJobs(prev => prev.map(j => {
        if (j.id === job.id) {
          return {
            ...j,
            items: j.items.map(item => 
              item.barcode === barcode 
                ? { ...item, verified } 
                : item
            )
          };
        }
        return j;
      }));

      // Update the database in the background
      const jobRef = doc(db, 'jobs', job.id);
      const snap = await getDoc(jobRef);
      if (!snap.exists()) return;
      const data = snap.data() as FirestoreJob;
      const items: JobItem[] = Array.isArray(data.items) ? data.items.map((it: FirestoreJobItem) => ({
        barcode: String(it.barcode || ''),
        name: it.name ?? null,
        asin: it.asin ?? null,
        quantity: Number(it.quantity || 1),
        verified: Boolean(it.verified),
        locationCode: it.locationCode,
        shelfNumber: it.shelfNumber,
        reason: it.reason || 'Unknown',
        storeName: it.storeName || 'Unknown',
      })) : [];
      const idx = items.findIndex(i => i.barcode === barcode);
      if (idx >= 0) {
        items[idx] = { ...items[idx], verified };
        await updateDoc(jobRef, { items });
      }
    } catch { 
      // Revert the optimistic update on error
      setJobs(prev => prev.map(j => {
        if (j.id === job.id) {
          return {
            ...j,
            items: j.items.map(item => 
              item.barcode === barcode 
                ? { ...item, verified: !verified } 
                : item
            )
          };
        }
        return j;
      }));
      showToast('Failed to verify item', 'error'); 
    } finally {
      // Clear loading state
      setVerifyingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemKey);
        return newSet;
      });
    }
  };

  const completePacking = async (job: Job) => {
    try {
      await updateDoc(doc(db, 'jobs', job.id), { status: 'completed', packer: user?.name || job.packer || null });
      await logActivity(  
        `completed packing for job ${job.jobId} with ${job.items.length} items (${job.items.reduce((sum, item) => sum + item.quantity, 0)} total units)`
      );
      showToast(`Job ${job.jobId} completed and awaiting pack`, 'success');
      fetchJobs();
    } catch { showToast('Failed to complete job', 'error'); }
  };

  const requestDeleteJob = (job: Job) => {
    setJobToDelete(job);
  };

  const confirmDeleteJob = async () => {
    if (!jobToDelete) return;
    try {
      await logActivity(
        `deleted job ${jobToDelete.jobId} (status: ${jobToDelete.status} with ${jobToDelete.items.length} items (${jobToDelete.items.reduce((sum, item) => sum + item.quantity, 0)} total units))`
      );
      await deleteDoc(doc(db, 'jobs', jobToDelete.id));
      
      showToast('Job deleted', 'success');
      setJobToDelete(null);
      fetchJobs();
    } catch {
      showToast('Failed to delete job', 'error');
    }
  };

  const updateJobItem = async (job: Job, itemIndex: number, newBarcode: string, newQuantity: number) => {
    try {
      const updatedItems = [...job.items];
      updatedItems[itemIndex] = {
        ...updatedItems[itemIndex],
        barcode: newBarcode,
        quantity: newQuantity
      };
      
      await updateDoc(doc(db, 'jobs', job.id), {
        items: updatedItems
      });
      
      await logActivity(
        `updated job item in job ${job.jobId}: barcode ${job.items[itemIndex].barcode} → ${newBarcode}, quantity ${job.items[itemIndex].quantity} → ${newQuantity}`
      );
      
      showToast('Job item updated successfully', 'success');
      setEditingJobItem(null);
      fetchJobs();
    } catch {
      showToast('Failed to update job item', 'error');
    }
  };

  const removeJobItem = async (job: Job, itemIndex: number) => {
    try {
      const updatedItems = job.items.filter((_, index) => index !== itemIndex);
      
      await updateDoc(doc(db, 'jobs', job.id), {
        items: updatedItems
      });
      
      await logActivity(
        `removed item ${job.items[itemIndex].barcode} (qty: ${job.items[itemIndex].quantity}) from job ${job.jobId}`
      );
      
      showToast('Job item removed successfully', 'success');
      fetchJobs();
    } catch {
      showToast('Failed to remove job item', 'error');
    }
  };

  // Search inventory function
  const searchInventory = async (searchQuery: string, type: 'name' | 'barcode' | 'asin') => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      let q;
      
      switch (type) {
        case 'barcode':
          q = query(collection(db, 'inventory'), where('barcode', '==', searchQuery.trim()));
          break;
        case 'asin':
          q = query(collection(db, 'inventory'), where('asin', '==', searchQuery.trim()));
          break;
        case 'name':
        default:
          // Search by name (case-insensitive)
          q = query(collection(db, 'inventory'), where('name', '>=', searchQuery.trim().toUpperCase()), where('name', '<=', searchQuery.trim().toUpperCase() + '\uf8ff'));
          break;
      }
      
      const snapshot = await getDocs(q);
      const results: StockItem[] = snapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          id: doc.id,
          name: data.name || '',
          quantity: data.quantity || 0,
          price: data.price || 0,
          unit: data.unit || null,
          supplier: data.supplier || null,
          lastUpdated: data.lastUpdated instanceof Timestamp ? data.lastUpdated.toDate() : new Date(),
          locationCode: data.locationCode || '',
          shelfNumber: data.shelfNumber || '',
          barcode: data.barcode || null,
          asin: data.asin || null,
          status: data.status || 'pending',
          damagedItems: data.damagedItems || 0,
          fulfillmentType: data.fulfillmentType || 'fba',
          storeName: data.storeName || '',
        };
      });
      
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      showToast('Failed to search inventory', 'error');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const JobRow: React.FC<{ job: Job }> = ({ job }) => {
    const isAwaitingPack = job.status === 'awaiting_pack';
    const isPicking = job.status === 'picking';
    const isCompleted = job.status === 'completed';
    const [isExpanded, setIsExpanded] = useState(false);
    
    return (
      <div className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} rounded-lg shadow-sm border`}>        
        <div className={`p-3 sm:p-4 border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
        <div className={`${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'} p-1 sm:p-2 rounded-lg`}>
                <ClipboardList className={`${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} size={18} />
              </div>

              {/* Job Header with Expandable Items */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
              <h3 className={`text-base sm:text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Job {job.jobId}</h3>
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                      isDarkMode 
                        ? 'text-slate-300 hover:text-white hover:bg-slate-700' 
                        : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200'
                    }`}
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp size={14} />
                        Hide Items ({job.items.length})
                      </>
                    ) : (
                      <>
                        <ChevronDown size={14} />
                        Show Items ({job.items.length})

                      </>
                    )}
                  </button>
                </div>
              <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} text-xs`}>
                Created by {job.createdBy} • {job.createdAt.toLocaleString()}
                {job.pickingTime && job.pickingTime > 0 && (
                  <span className={`ml-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                    • Picking: {formatElapsedTime(job.pickingTime)}
                  </span>
                )}
              </p>
                {/* Quick summary when collapsed */}
                {!isExpanded && job.items.length > 0 && (
                  <div className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} text-xs mt-1`}>
                    {job.items.length} item{job.items.length !== 1 ? 's' : ''} • 
                    Total Qty: {job.items.reduce((sum, item) => sum + item.quantity, 0)}
                    {/* {job.items.some(item => item.locationCode && item.shelfNumber) && (
                      <span> • Has locations</span>
                    )} */}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${isCompleted ? 'bg-green-100 text-green-700' : isAwaitingPack ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                {isCompleted ? 'Completed' : isAwaitingPack ? 'Awaiting Pack' : 'Picking'}
              </span>
              <Button variant="secondary" onClick={fetchJobs} size='sm'>
                <RefreshCw size={14} />
              </Button>
              <Button variant="danger" onClick={() => requestDeleteJob(job)} size='sm'>
                <Trash2 size={14} />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Expandable Items Section */}
        {isExpanded && (
        <div className="p-3 sm:p-4 space-y-3">
          <div className="flex items-center gap-2">
            {isPicking && (
              <Button onClick={() => setIsStockUpdateModalOpen(true)} className="flex items-center gap-1" size='sm'>
                <ClipboardList size={14} /> Scan
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {job.items.map((it, itemIndex) => (
              <div key={`${it.barcode}-${itemIndex}-${job.id}`} className={`flex items-center justify-between p-2 rounded ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                <div className="flex-1 min-w-0">
                  {editingJobItem?.jobId === job.id && editingJobItem?.itemIndex === itemIndex ? (
                    // Edit mode
                    <div className="flex items-center gap-2">
                      <Input 
                        value={editingJobItem.barcode} 
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingJobItem({...editingJobItem, barcode: e.target.value})} 
                        className="w-24 text-sm" 
                      />
                      <Input 
                        type="number" 
                        value={editingJobItem.quantity.toString()} 
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingJobItem({...editingJobItem, quantity: Number(e.target.value) || 1})} 
                        className="w-16 text-sm" 
                        min="1" 
                      />
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          onClick={() => updateJobItem(job, itemIndex, editingJobItem.barcode, editingJobItem.quantity)} 
                          className="h-6 px-2"
                        >
                          ✓
                        </Button>
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          onClick={() => setEditingJobItem(null)} 
                          className="h-6 px-2"
                        >
                          ✕
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Display mode
                    <>
                  <div className={`${isDarkMode ? 'text-white' : 'text-slate-800'} text-sm font-medium truncate`}>
                    {it.name || it.barcode}
                  </div>
                  {it.name && (
                    <div className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} text-xs`}>
                      Barcode: {it.barcode}
                    </div>
                  )}
                      <div className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} text-xs`}>
                        Qty: {it.quantity}
                        {it.locationCode && it.shelfNumber && (
                          <span className="ml-2">• Location: {it.locationCode}-{it.shelfNumber}</span>
                        )}
                        {it.reason && (
                          <span className="ml-2">• Reason: {it.reason}</span>
                        )}
                        {it.storeName && (
                          <span className="ml-2">• Store: {it.storeName}</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                {isAwaitingPack && (
                    <Button
                      variant={it.verified ? "success" : "primary"}
                      size="sm"
                      onClick={() => verifyItem(job, it.barcode, !it.verified)}
                      disabled={verifyingItems.has(`${job.id}-${it.barcode}`)}
                      className={`h-6 px-2 transition-all duration-200 ${
                        it.verified 
                          ? 'bg-green-500 hover:bg-green-600 text-white' 
                          : 'bg-blue-500 hover:bg-blue-600 text-white'
                      }`}
                    >
                      {verifyingItems.has(`${job.id}-${it.barcode}`) ? (
                        <RefreshCw size={12} className="animate-spin" />
                      ) : (
                        it.verified ? 'Verified' : 'Verify'
                      )}
                    </Button>
                )}
                  {isAwaitingPack && !editingJobItem && (
                    <>
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        onClick={() => setEditingJobItem({
                          jobId: job.id,
                          itemIndex,
                          barcode: it.barcode,
                          quantity: it.quantity,
                          locationCode: it.locationCode,
                          shelfNumber: it.shelfNumber,
                          reason: it.reason,
                          storeName: it.storeName
                        })} 
                        className="h-6 px-2"
                      >
                        <Edit size={14} />
                      </Button>
                      <Button 
                        variant="danger" 
                        size="sm" 
                        onClick={() => removeJobItem(job, itemIndex)} 
                        className="h-6 px-2"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </>
                  )}
                  
                </div>
              </div>
            ))}
            {job.items.length === 0 && (
              <div className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} text-sm`}>No items scanned yet.</div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            {isPicking && (
              <Button onClick={() => completePicking(job)} size='sm' className="flex items-center gap-1">
                <CheckSquare size={14} /> Finish Picking
              </Button>
            )}
            {isAwaitingPack && (
              <Button onClick={() => completePacking(job)} size='sm' className="flex items-center gap-1">
                <CheckSquare size={14} /> Complete Job
              </Button>
            )}
          </div>
        </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        {/* Header with title and action buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex flex-col gap-2">
            <h1 className={`text-xl sm:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              {showArchived ? 'Archived' : showCompleted ? 'Completed' : 'Active'} Jobs
            </h1>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Button 
              variant="secondary" 
              onClick={fetchJobs} 
              className={`flex items-center gap-1 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`} 
              disabled={isLoading}
              size='sm'
            >
              <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            </Button>
            <Button 
              onClick={openNewJobModal} 
              className="flex items-center gap-1"
              size='sm'
            >
                <Plus size={16} /> <span className="sm:inline hidden">New Job</span>
            </Button>
            <Button 
              variant={!showCompleted && !showArchived ? "primary" : "secondary"} 
              onClick={() => {
                setShowCompleted(false);
                setShowArchived(false);
              }}
              size='sm'
            >
              Active Jobs
            </Button>
            <Button 
              variant={showCompleted ? "primary" : "secondary"} 
              onClick={() => {
                setShowCompleted(true);
                setShowArchived(false);
              }}
              size='sm'
            >
              Completed Jobs
            </Button>
            <Button 
              variant={showArchived ? "primary" : "secondary"} 
              onClick={() => {
                setShowCompleted(false);
                setShowArchived(true);
              }}
              size='sm'
            >
              Archived Jobs
            </Button>
          </div>
        </div>
        
        {/* Job Type Navigation and Filters Section */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Job Type Buttons - Positioned on the right */}
          <div className="flex items-center gap-2 flex-wrap lg:ml-auto">
            
          </div>
          
          {/* Filters Section - Only show for Archived Jobs, positioned below job type buttons on the right */}
          {showArchived && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 lg:ml-auto">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                {/* User Filter */}
                <div className="flex flex-col gap-1">
                  <label className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Filter by User:
                  </label>
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className={`px-3 py-2 border rounded-md text-sm ${
                      isDarkMode 
                        ? 'bg-slate-700 border-slate-600 text-white' 
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="all">All Users</option>
                    {getUniqueUsers().map(userName => (
                      <option key={userName} value={userName}>{userName}</option>
                    ))}
                  </select>
                </div>
                
                {/* Date Range Filter */}
                <div className="flex flex-col gap-1">
                  <label className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Filter by Date Range:
                  </label>
                  <DateRangePicker
                    startDate={startDate}
                    endDate={endDate}
                    onStartDateChange={setStartDate}
                    onEndDateChange={setEndDate}
                    onClear={clearDateRange}
                    className="w-64"
                  />
                </div>
              </div>
              
              {/* Clear Filters Button */}
              <Button
                variant="secondary"
                onClick={clearAllFilters}
                size="sm"
                className="self-end"
              >
                Clear All Filters
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Filter Summary for Archived Jobs */}
        {showArchived && (startDate || endDate || selectedUser !== 'all') && (
          <div className={`p-3 rounded-lg border ${
            isDarkMode 
              ? 'bg-slate-800 border-slate-700 text-slate-300' 
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Active Filters:</span>
              {selectedUser !== 'all' && (
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">
                  User: {selectedUser}
                </span>
              )}
              {startDate && (
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs">
                  From: {startDate.toLocaleDateString()}
                </span>
              )}
              {endDate && (
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs">
                  To: {endDate.toLocaleDateString()}
                </span>
              )}
              <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-xs">
                {filteredJobs.length} jobs found
              </span>
            </div>
          </div>
        )}
        
        {filteredJobs.map(job => (
          <JobRow key={job.id} job={job} />
        ))}
        {filteredJobs.length === 0 && (
          <div className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} text-center py-8`}>
            {showArchived ? (
              <div className="space-y-2">
                <p>No archived jobs found.</p>
                {(startDate || endDate || selectedUser !== 'all') && (
                  <p className="text-sm">Try adjusting your filters or clearing them to see more results.</p>
                )}
              </div>
            ) : showCompleted ? 'No completed jobs found.' : 'No active jobs found.'}
          </div>
        )}
      </div>

      {/* No title modal; jobs are identified by generated ID */}

      {/* New Job Picking Modal */}
      <Modal 
        isOpen={isNewJobModalOpen} 
        onClose={() => {
          setIsNewJobModalOpen(false);
          setJobCreationStartTime(null); // Reset timer
          setElapsedTime(0); // Reset elapsed time
          setShowSearchSection(false); // Reset search section
        }} 
        title={showSearchSection ? "Search Product from Inventory" : "Add Barcode to Job"}
        size='md'
        closeOnOutsideClick={false}
      >
        <div className="space-y-4">
          
          {/* Search Toggle Button - Only show when search section is closed */}
          {!showSearchSection && (
            <div className="flex justify-start">
              <button
                onClick={() => setShowSearchSection(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-md transition-colors bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"
                title="Show search section"
              >
                <Search size={16} />
                <span className="text-sm font-medium">Search Product</span>
              </button>
            </div>
          )}
          
          {/* Search Section - Full screen when active */}
          {showSearchSection && (
            <div className="space-y-4">
                              {/* Search Header with Close Button */}
                <div className="flex items-center justify-between">
                  
                  <button
                    onClick={() => setShowSearchSection(false)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                      isDarkMode 
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white' 
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300 hover:text-slate-800'
                    }`}
                    title="Back to Add Barcode"
                  >
                    <ArrowLeft size={16} />
                    <span className="text-sm font-medium">Back to Add Barcode</span>
                  </button>
                </div>
              
              {/* Search Type Selector */}
              <div className="flex gap-2 mb-3">
                {(['name', 'barcode', 'asin'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setSearchType(type)}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      searchType === type
                        ? 'bg-blue-500 text-white'
                        : isDarkMode
                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>

              {/* Search Input */}
              <div className="flex gap-2 mb-3">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Search by ${searchType}...`}
                  className="flex-1"
                  onKeyPress={(e) => e.key === 'Enter' && searchInventory(searchQuery, searchType)}
                />
                <Button
                  onClick={() => searchInventory(searchQuery, searchType)}
                  disabled={isSearching || !searchQuery.trim()}
                  size="sm"
                  className="px-4"
                >
                  {isSearching ? <RefreshCw size={14} className="animate-spin" /> : 'Search'}
                </Button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-auto">
                  <h5 className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Found {searchResults.length} product{searchResults.length !== 1 ? 's' : ''}:
                  </h5>
                  {searchResults.map((item) => (
                    <div
                      key={item.id}
                      className={`p-2 rounded text-sm ${
                        isDarkMode ? 'bg-slate-700 border border-slate-600' : 'bg-slate-100 border border-slate-200'
                      }`}
                    >
                      <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                        {item.name}
                      </div>
                      <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        {item.barcode && <span className="mr-3">Barcode: {item.barcode}</span>}
                        {item.asin && <span className="mr-3">ASIN: {item.asin}</span>}
                        {item.locationCode && item.shelfNumber && (
                          <span className="mr-3">Location: {item.locationCode}-{item.shelfNumber}</span>
                        )}
                        <span className="mr-3">Qty: {item.quantity}</span>
                        <span>Store: {item.storeName}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {searchQuery && searchResults.length === 0 && !isSearching && (
                <div className={`text-center text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                  No products found for "{searchQuery}"
                </div>
              )}
            </div>
          )}
          
          {/* Barcode Input Field - Only show when search section is closed */}
          {!showSearchSection && (
            <>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Barcode
            </label>
            <form onSubmit={handleManualBarcodeSubmit} className="flex gap-2">
              <Input
                name="manualBarcode"
                type="text"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                placeholder="Enter barcode manually"
                fullWidth
              />
              <Button 
                type="submit" 
                className="flex items-center gap-1 whitespace-nowrap"
                size='sm'
              >
                <Plus size={16} /> Add
              </Button>
            </form>
          </div>

          <div className="text-center text-sm text-slate-500 dark:text-slate-400">
            Enter a barcode to update stock quantity for this job
          </div>
            </>
          )}
          
          {/* Display current job items */}
          {!showSearchSection && newJobItems.length > 0 && (
            <div className="space-y-2">
              <h4 className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                Current Job Items:
              </h4>
              <div className="max-h-32 overflow-auto space-y-1">
                {newJobItems.map((item, index) => (
                  <div key={`${item.barcode}-${item.locationCode}-${item.shelfNumber}-${index}`} className={`flex items-center justify-between p-2 rounded text-sm ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    {editingItem?.index === index ? (
                      // Edit mode
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={editingItem.barcode}
                          onChange={(e) => setEditingItem({...editingItem, barcode: e.target.value})}
                          className="w-24 text-sm"
                          //size="sm"
                        />
                      <Input
                        type="number"
                          value={editingItem.quantity}
                          onChange={(e) => setEditingItem({...editingItem, quantity: Number(e.target.value) || 1})}
                          className="w-16 text-sm"
                          //size="sm"
                        min="1"
                      />
                        <div className="flex gap-1">
                      <Button 
                        size="sm" 
                            onClick={() => {
                              const oldQuantity = newJobItems[index].quantity;
                              const newQuantity = Number(editingItem.quantity);
                              const quantityDifference = newQuantity - oldQuantity;
                              
                              // Update job items
                              setNewJobItems(prev => {
                                const updated = [...prev];
                                updated[index] = { ...updated[index], barcode: editingItem.barcode, quantity: newQuantity, reason: editingItem.reason || 'Unknown', storeName: editingItem.storeName || 'Unknown', name: editingItem.name || null };
                                return updated;
                              });
                              
                              // Update pending stock updates to reflect the quantity change
                              setPendingStockUpdates(prev => {
                                const updated = [...prev];
                                // Find the corresponding pending update for this item
                                const pendingIndex = updated.findIndex(update => 
                                  update.stockItem.barcode === editingItem.barcode &&
                                  update.locationCode === newJobItems[index].locationCode &&
                                  update.shelfNumber === newJobItems[index].shelfNumber
                                );
                                
                                if (pendingIndex >= 0) {
                                  // Adjust the deducted quantity based on the change
                                  updated[pendingIndex] = {
                                    ...updated[pendingIndex],
                                    deductedQuantity: updated[pendingIndex].deductedQuantity + quantityDifference
                                  };
                                }
                                
                                return updated;
                              });
                              
                              setEditingItem(null);
                            }}
                            className="h-6 px-2"
                      >
                        ✓
                      </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setEditingItem(null)}
                            className="h-6 px-2"
                          >
                            ✕
                          </Button>
                        </div>
                    </div>
                  ) : (
                      // Display mode
                      <>
                        <div className="flex-1 min-w-0">
                          <span className="truncate block font-medium">{item.name || item.barcode}</span>
                          {item.name && (
                            <span className="text-xs text-slate-500 block">
                              Barcode: {item.barcode}
                            </span>
                          )}
                          {item.locationCode && item.shelfNumber && (
                            <span className="text-xs text-slate-500 block">
                              Location: {item.locationCode} - Shelf {item.shelfNumber}
                            </span>
                          )}
                          {item.reason && (
                            <span className="text-xs text-slate-500 block">
                              Reason: {item.reason}
                            </span>
                          )}
                          {item.storeName && (
                            <span className="text-xs text-slate-500 block">
                              Store: {item.storeName}
                            </span>
                          )}
                        </div>
                    <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">Qty: {item.quantity}</span>
                      <Button 
                        variant="secondary" 
                        size="sm" 
                            onClick={() => setEditingItem({index, barcode: item.barcode, quantity: item.quantity, reason: item.reason, storeName: item.storeName, name: item.name})}
                            className="h-6 px-2"
                      >
                        Edit
                      </Button>
                          <button
                            type="button"
                            onClick={() => {
                              // Remove from job items
                              setNewJobItems(prev => prev.filter((_, i) => i !== index));
                              
                              // Remove corresponding pending stock update
                              setPendingStockUpdates(prev => {
                                const itemToRemove = newJobItems[index];
                                return prev.filter(update => 
                                  !(update.stockItem.barcode === itemToRemove.barcode &&
                                    update.locationCode === itemToRemove.locationCode &&
                                    update.shelfNumber === itemToRemove.shelfNumber)
                                );
                              });
                            }}
                            className={`h-6 w-6 rounded flex items-center justify-center text-white bg-red-500 hover:bg-red-600 transition-colors ${isDarkMode ? 'hover:bg-red-600' : 'hover:bg-red-600'}`}
                            title="Remove item"
                          >
                            ×
                          </button>
                    </div>
                      </>
                  )}
                  </div>
                ))}
              </div>
                  
              {/* Finish Picking Button */}
              <div className="pt-2">
                  <Button 
                  onClick={finishNewJobPicking}
                  disabled={newJobItems.length === 0}
                  className="w-full flex items-center justify-center gap-2"
                    size="sm" 
                  >
                  <CheckSquare size={16} /> Finish Picking
                  </Button>
                </div>     
              </div>
            )}


        </div>
      </Modal>

      {/* Delete confirmation modal */}
      <DeleteConfirmationModal
        isOpen={!!jobToDelete}
        onClose={() => setJobToDelete(null)}
        onConfirm={confirmDeleteJob}
        title="Delete Job"
        message={jobToDelete ? `Are you sure you want to delete Job ${jobToDelete.jobId}? This action cannot be undone.` : ''}
        isLoading={false}
      />

      {/* Stock Update Modal */}
      <Modal
        isOpen={isStockUpdateModalOpen}
        onClose={() => setIsStockUpdateModalOpen(false)}
        title="Update Stock for Job"
        size='lg'
        closeOnOutsideClick={false}
      >
        {selectedStockItem && (
          <JobStockUpdateForm
            item={selectedStockItem}
            onSubmit={handleStockUpdate}
            onCancel={handleStockUpdateCancel}
            isLoading={false}
          />
        )}
      </Modal>
    </div>
  );
};

export default Jobs;