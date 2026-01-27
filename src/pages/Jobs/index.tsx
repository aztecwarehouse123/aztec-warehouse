import React, { useCallback, useEffect, useState } from 'react';
import { Plus, RefreshCw, CheckSquare, ClipboardList, Trash2, ChevronUp, ChevronDown, Search, ArrowLeft, Calculator, Clock } from 'lucide-react';
import { db } from '../../config/firebase';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, Timestamp, updateDoc, where, onSnapshot } from 'firebase/firestore';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import Button from '../../components/ui/Button';
import Modal from '../../components/modals/Modal';
import DeleteConfirmationModal from '../../components/modals/DeleteConfirmationModal';
import ConfirmationModal from '../../components/modals/ConfirmationModal';
import DateRangePicker from '../../components/ui/DateRangePicker';
import { useAuth } from '../../contexts/AuthContext';
import Input from '../../components/ui/Input';
import JobStockUpdateForm from '../../components/stock/JobStockUpdateForm';
import CalculatorModal from '../../components/modals/CalculatorModal';
import { StockItem, JobItem } from '../../types';
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { format } from 'date-fns';

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
  trolleyNumber?: number | null; // Trolley number assigned to the job (1-20)
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
  stockItemId?: string; // Document ID of the stock item
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
  trolleyNumber?: number | null; // Trolley number assigned to the job (1-20)
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
  const [showLiveJobs, setShowLiveJobs] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [showProductivity, setShowProductivity] = useState(false);
  const [manualBarcode, setManualBarcode] = useState(''); // State for manual barcode input
  const [isStockUpdateModalOpen, setIsStockUpdateModalOpen] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState<StockItem | null>(null);
  const [jobCreationStartTime, setJobCreationStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [verifyingItems, setVerifyingItems] = useState<Set<string>>(new Set());
  // State to prevent duplicate job creation when button is clicked multiple times
  const [isJobCreationInProgress, setIsJobCreationInProgress] = useState(false);
  // State to track jobs currently being completed to prevent duplicate completions
  const [completingJobs, setCompletingJobs] = useState<Set<string>>(new Set());
  // Timer alert states
  const [showHurryUpAlert, setShowHurryUpAlert] = useState(false);
  // Confirm closing Add Barcode modal (lose progress)
  const [isCloseBarcodeConfirmOpen, setIsCloseBarcodeConfirmOpen] = useState(false);
  const [lastAlertTime, setLastAlertTime] = useState<number>(0);
  
  // State to track locally verified items (not yet saved to database)
  const [locallyVerifiedItems, setLocallyVerifiedItems] = useState<Set<string>>(new Set());
  
  // State to track expanded jobs to prevent collapse on re-render
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());
  
  // Calculator modal state
  const [isCalculatorModalOpen, setIsCalculatorModalOpen] = useState(false);
  
  // Trolley number state for new job
  const [selectedTrolleyNumber, setSelectedTrolleyNumber] = useState<number | null>(null);
  
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
  
  // Search functionality for archived jobs
  const [archivedJobsSearchQuery, setArchivedJobsSearchQuery] = useState('');

  // State to track currently active job creation sessions
  const [activeJobSessions, setActiveJobSessions] = useState<Array<{
    id: string;
    createdBy: string;
    startTime: Date;
    items: JobItem[];
    isActive: boolean;
  }>>([]);

  // Reports state
  const [reportDate, setReportDate] = useState<Date>(() => {
    const today = new Date();
    // Set to start of day to avoid timezone issues
    today.setHours(0, 0, 0, 0);
    return today;
  });
  const [selectedUserForChart, setSelectedUserForChart] = useState<string>('');
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date }>(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 6); // Default to last 7 days
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  });
  const [reportData, setReportData] = useState<{
    dailyStats: Array<{ date: string; itemsPicked: number; jobsCompleted: number }>;
    userStats: Array<{ 
      name: string; 
      jobsCreated: number; 
      jobsCompleted: number; 
      itemsPicked: number; 
      avgTimePerJob: number;
      totalTime: number;
    }>;
  }>({ dailyStats: [], userStats: [] });
  const [isLoadingReports, setIsLoadingReports] = useState(false);

  // Productivity data state
  const [productivityData, setProductivityData] = useState<{
    workerStats: Array<{
      name: string;
      totalJobs: number;
      completedJobs: number;
      avgPickingTime: number;
      totalPickingTime: number;
      itemsPicked: number;
      efficiency: number; // items per minute
      performance: 'excellent' | 'good' | 'average' | 'needs_improvement';
    }>;
    hourlyProductivity: Array<{
      hour: string;
      totalJobs: number;
      avgPickingTime: number;
      totalItems: number;
    }>;
  }>({ workerStats: [], hourlyProductivity: [] });
  const [isLoadingProductivity, setIsLoadingProductivity] = useState(false);
  const [productivityDate, setProductivityDate] = useState<Date>(() => {
    const today = new Date();
    // Ensure we get the local date without timezone issues
    const year = today.getFullYear();
    const month = today.getMonth();
    const date = today.getDate();
    return new Date(year, month, date);
  });

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

  // Check if job matches search query
  const isJobMatchingSearch = (job: Job): boolean => {
    if (!archivedJobsSearchQuery.trim()) return true;
    
    const searchTerm = archivedJobsSearchQuery.toLowerCase().trim();
    
    // Search by job ID
    if (job.jobId.toLowerCase().includes(searchTerm)) {
      return true;
    }
    
    // Search by item names in the job
    return job.items.some(item => 
      item.name && item.name.toLowerCase().includes(searchTerm)
    );
  };

  const filteredJobs = jobs.filter(job => {
    if (showArchived) {
      return isJobArchived(job) && isJobInDateRange(job) && isJobMatchingUser(job) && isJobMatchingSearch(job);
    } else if (showCompleted) {
      return job.status === 'completed' && !isJobArchived(job);
    } else if (showLiveJobs) {
      return job.status === 'picking';
    } else {
      return job.status !== 'completed';
    }
  });

  // Get live jobs (jobs being created in UI + database jobs with picking status)
  const getLiveJobs = () => {
    const databaseLiveJobs = jobs.filter(job => job.status === 'picking');
    const uiLiveJobs = activeJobSessions.filter(session => session.isActive);
    
    return {
      databaseJobs: databaseLiveJobs,
      uiSessions: uiLiveJobs,
      totalCount: databaseLiveJobs.length + uiLiveJobs.length
    };
  };

  // Cleanup function to remove old live job sessions
  const cleanupOldLiveJobSessions = useCallback(async () => {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      // Query for sessions older than 1 hour
      const cleanupQuery = query(
        collection(db, 'liveJobSessions'),
        where('startTime', '<', oneHourAgo)
      );
      
      const snapshot = await getDocs(cleanupQuery);
      const sessionsToDelete: string[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const items = data.items || [];
        
        // Only delete if no items have been scanned (empty items array)
        if (items.length === 0) {
          sessionsToDelete.push(doc.id);
        }
      });
      
      // Delete the old sessions with no items
      if (sessionsToDelete.length > 0) {
        
        const deletePromises = sessionsToDelete.map(sessionId => 
          deleteDoc(doc(db, 'liveJobSessions', sessionId))
        );
        
        await Promise.all(deletePromises);
      }
    } catch (error) {
      console.log('error', error);
    }
  }, []);

  // Generate productivity data
  const generateProductivityData = useCallback(async () => {
    console.log('Starting productivity data generation...');
    console.log('Selected productivity date:', productivityDate);
    setIsLoadingProductivity(true);
    try {
      // Set date range to selected date (start of day to end of day)
      const year = productivityDate.getFullYear();
      const month = productivityDate.getMonth();
      const date = productivityDate.getDate();
      
      const start = new Date(year, month, date, 0, 0, 0, 0);
      const end = new Date(year, month, date, 23, 59, 59, 999);
      
      console.log('Date range:', { start: start.toISOString(), end: end.toISOString() });
      
      // Filter jobs within date range
      const jobsInRange = jobs.filter(job => {
        const jobDate = job.createdAt;
        return jobDate >= start && jobDate <= end && job.status === 'completed';
      });
      
      console.log('Jobs in range:', jobsInRange.length);

      // Calculate worker statistics
      const workerMap = new Map<string, {
        totalJobs: number;
        completedJobs: number;
        totalPickingTime: number;
        totalItems: number;
        pickingTimes: number[];
      }>();

      jobsInRange.forEach(job => {
        if (!job.picker) return;
        
        const worker = job.picker;
        const current = workerMap.get(worker) || {
          totalJobs: 0,
          completedJobs: 0,
          totalPickingTime: 0,
          totalItems: 0,
          pickingTimes: []
        };

        current.totalJobs++;
        if (job.status === 'completed') {
          current.completedJobs++;
        }
        
        if (job.pickingTime && job.pickingTime > 0) {
          current.totalPickingTime += job.pickingTime;
          current.pickingTimes.push(job.pickingTime);
        }
        
        current.totalItems += job.items.reduce((sum, item) => sum + item.quantity, 0);
        
        workerMap.set(worker, current);
      });

      // Convert to array and calculate metrics
      const workerStats = Array.from(workerMap.entries()).map(([name, data]) => {
        const avgPickingTime = data.pickingTimes.length > 0 
          ? data.pickingTimes.reduce((sum, time) => sum + time, 0) / data.pickingTimes.length 
          : 0;
        
        const efficiency = data.totalPickingTime > 0 
          ? (data.totalItems / (data.totalPickingTime / 60)) // items per minute
          : 0;

        // Determine performance level
        let performance: 'excellent' | 'good' | 'average' | 'needs_improvement';
        if (efficiency >= 10) performance = 'excellent';
        else if (efficiency >= 7) performance = 'good';
        else if (efficiency >= 4) performance = 'average';
        else performance = 'needs_improvement';

        return {
          name,
          totalJobs: data.totalJobs,
          completedJobs: data.completedJobs,
          avgPickingTime: Math.round(avgPickingTime),
          totalPickingTime: data.totalPickingTime,
          itemsPicked: data.totalItems,
          efficiency: Math.round(efficiency * 100) / 100,
          performance
        };
      }).sort((a, b) => b.efficiency - a.efficiency);

      // Calculate hourly productivity for the selected date
      const hourlyProductivity = [];
      for (let hour = 0; hour < 24; hour++) {
        const hourStart = new Date(productivityDate);
        hourStart.setHours(hour, 0, 0, 0);
        const hourEnd = new Date(productivityDate);
        hourEnd.setHours(hour, 59, 59, 999);

        const hourJobs = jobsInRange.filter(job => {
          const jobDate = job.createdAt;
          return jobDate >= hourStart && jobDate <= hourEnd;
        });

        const totalItems = hourJobs.reduce((sum, job) => 
          sum + job.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
        );

        const pickingTimes = hourJobs
          .filter(job => job.pickingTime && job.pickingTime > 0)
          .map(job => job.pickingTime!);

        const avgPickingTime = pickingTimes.length > 0 
          ? pickingTimes.reduce((sum, time) => sum + time, 0) / pickingTimes.length 
          : 0;

        hourlyProductivity.push({
          hour: `${hour.toString().padStart(2, '0')}:00`,
          totalJobs: hourJobs.length,
          avgPickingTime: Math.round(avgPickingTime),
          totalItems
        });
      }

      setProductivityData({
        workerStats,
        hourlyProductivity
      });
      
      // Add a small delay to make loading more visible
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('Productivity data generation completed');
    } catch (error) {
      console.error('Error generating productivity data:', error);
      showToast('Failed to generate productivity data', 'error');
    } finally {
      setIsLoadingProductivity(false);
    }
  }, [jobs, productivityDate, showToast]);

  // Generate reports data
  const generateReports = useCallback(async (date: Date) => {
    console.log('Starting reports generation...');
    setIsLoadingReports(true);
    try {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Get jobs for the selected date
      const jobsForDate = jobs.filter(job => {
        const jobDate = job.createdAt;
        return jobDate >= startOfDay && jobDate <= endOfDay;
      });

      // Generate daily stats for the last 7 days
      const dailyStats = [];
      for (let i = 6; i >= 0; i--) {
        const checkDate = new Date(date);
        checkDate.setDate(checkDate.getDate() - i);
        const checkStart = new Date(checkDate);
        checkStart.setHours(0, 0, 0, 0);
        const checkEnd = new Date(checkDate);
        checkEnd.setHours(23, 59, 59, 999);

        const dayJobs = jobs.filter(job => {
          const jobDate = job.createdAt;
          return jobDate >= checkStart && jobDate <= checkEnd;
        });

        const itemsPicked = dayJobs.reduce((sum, job) => 
          sum + job.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
        );
        const jobsCompleted = dayJobs.filter(job => job.status === 'completed').length;

        dailyStats.push({
          date: checkDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          itemsPicked,
          jobsCompleted
        });
      }

      // Generate user stats
      const userStats = [];
      const uniqueUsers = new Set(jobsForDate.map(job => job.createdBy));
      
      for (const userName of uniqueUsers) {
        const userJobs = jobsForDate.filter(job => job.createdBy === userName);
        const completedJobs = userJobs.filter(job => job.status === 'completed');
        const itemsPicked = userJobs.reduce((sum, job) => 
          sum + job.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
        );
        
        // Calculate time metrics
        let totalTime = 0;
        let jobsWithTime = 0;
        completedJobs.forEach(job => {
          if (job.pickingTime && job.pickingTime > 0) {
            totalTime += job.pickingTime;
            jobsWithTime++;
          }
        });
        
        const avgTimePerJob = jobsWithTime > 0 ? totalTime / jobsWithTime : 0;

        userStats.push({
          name: userName,
          jobsCreated: userJobs.length,
          jobsCompleted: completedJobs.length,
          itemsPicked,
          avgTimePerJob,
          totalTime
        });
      }

      // Sort user stats by items picked (descending)
      userStats.sort((a, b) => b.itemsPicked - a.itemsPicked);

              setReportData({ dailyStats, userStats });
      
      // Add a small delay to make loading more visible
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('Reports generation completed');
    } catch (error) {
      console.log('error', error);
      showToast('Failed to generate reports', 'error');
    } finally {
      setIsLoadingReports(false);
    }
  }, [jobs, showToast]);

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
      console.log('error', e);
    }
  };

      const formatElapsedTime = (seconds: number): string => {
      if (seconds < 60) {
        return `${Math.round(seconds)}s`;
      } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.round(seconds % 60);
        return `${minutes}m ${remainingSeconds}s`;
      } else {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = Math.round(seconds % 60);
        return `${hours}h ${minutes}m ${remainingSeconds}s`;
      }
    };

  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
    // Reset view states when refreshing - default to Active Jobs
    setShowCompleted(false);
    setShowArchived(false);
    setShowLiveJobs(false);
    setShowReports(false);
    // Reset filters when refreshing
    setStartDate(null);
    setEndDate(null);
    setSelectedUser('all');
    // Clear local verification state when refreshing
    setLocallyVerifiedItems(new Set());
    // Keep expanded state when refreshing (don't clear expandedJobs)
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
            stockItemId: it.stockItemId, // Include document ID if available
          })) : [],
          pickingTime: data.pickingTime || 0,
          trolleyNumber: data.trolleyNumber ?? null,
        };
      });
      
      // OPTIMIZED: Fetch all inventory items once and create a barcode-to-name map
      // This replaces the N+1 query problem (hundreds of individual queries)
      // with just 1 additional query
      const inventoryQuery = query(collection(db, 'inventory'));
      const inventorySnapshot = await getDocs(inventoryQuery);
      const barcodeToNameMap = new Map<string, string | null>();
      
      inventorySnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.barcode) {
          barcodeToNameMap.set(data.barcode, data.name || null);
        }
      });
      
      // Enhance items with product names using the map (no additional queries)
      const enhancedList = list.map(job => ({
        ...job,
        items: job.items.map(item => ({
          ...item,
          name: item.name || barcodeToNameMap.get(item.barcode) || null
        }))
      }));
      
      setJobs(enhancedList);
    } catch (e) {
      console.log('error', e);
      showToast('Failed to fetch jobs', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  // Cleanup old live job sessions on component mount
  useEffect(() => {
    cleanupOldLiveJobSessions();
  }, [cleanupOldLiveJobSessions]);

  // Set up periodic cleanup every 30 minutes
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      cleanupOldLiveJobSessions();
    }, 30 * 60 * 1000); // 30 minutes

    return () => clearInterval(cleanupInterval);
  }, [cleanupOldLiveJobSessions]);

  // Clear local verification state when jobs change or component unmounts
  useEffect(() => {
    return () => {
      setLocallyVerifiedItems(new Set());
      setExpandedJobs(new Set());
    };
  }, [jobs]);

  // Automatically set date range from yesterday to today when switching to archived jobs
  useEffect(() => {
    if (showArchived && !startDate && !endDate) {
      setDateRangeToYesterdayToToday();
    }
  }, [showArchived, startDate, endDate]);

  // Real-time listener for live job sessions
  useEffect(() => {
    if (!showLiveJobs) return; // Only listen when Live Jobs view is active

    // Cleanup old sessions when live jobs view is shown
    cleanupOldLiveJobSessions();

    const unsubscribe = onSnapshot(
      collection(db, 'liveJobSessions'),
      (snapshot) => {
        const sessions: Array<{
          id: string;
          createdBy: string;
          startTime: Date;
          items: JobItem[];
          isActive: boolean;
        }> = [];
        
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.isActive) {
            sessions.push({
              id: doc.id,
              createdBy: data.createdBy || 'Unknown',
              startTime: data.startTime instanceof Timestamp ? data.startTime.toDate() : new Date(data.startTime),
              items: data.items || [],
              isActive: data.isActive || false
            });
          }
        });
        
        setActiveJobSessions(sessions);
      },
      (error) => {
        console.log('error', error);
      }
    );

    return () => unsubscribe();
  }, [showLiveJobs, cleanupOldLiveJobSessions]);

  // Generate reports when Reports view is shown
  useEffect(() => {
    if (showReports) {
      console.log('Reports view shown, generating reports for date:', reportDate);
      generateReports(reportDate);
    }
  }, [showReports, reportDate, generateReports]);

  // Generate productivity data when Productivity view is shown
  useEffect(() => {
    if (showProductivity) {
      console.log('Productivity view shown, generating productivity data');
      generateProductivityData();
    }
  }, [showProductivity, generateProductivityData]);

  // Regenerate reports when date range changes
  useEffect(() => {
    if (showReports) {
      // Update reportDate to match the end of the date range for the main reports
      setReportDate(new Date(dateRange.end));
    }
  }, [dateRange, showReports]);

  // Initialize selected user for chart when reports are shown
  useEffect(() => {
    if (showReports && jobs.length > 0) {
      const uniqueUsers = Array.from(new Set(jobs.map(job => job.createdBy)));
      if (uniqueUsers.length > 0 && !selectedUserForChart) {
        setSelectedUserForChart(uniqueUsers[0]);
      }
    }
  }, [showReports, jobs, selectedUserForChart]);

  // Debug: Log when reportDate changes
  useEffect(() => {
    if (showReports) {
      console.log('reportDate', reportDate);
    }
  }, [reportDate, showReports]);

  // Function to toggle job expansion
  const toggleJobExpansion = (jobId: string) => {
    setExpandedJobs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  // Timer for job creation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (jobCreationStartTime) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - jobCreationStartTime.getTime()) / 1000);
        setElapsedTime(elapsed);
        
        // Show hurry up alert at 10 minutes (600 seconds)
        if (elapsed >= 600 && !showHurryUpAlert) {
          setShowHurryUpAlert(true);
          setLastAlertTime(600);
        }
        
        // Show recurring alerts every 5 minutes after 10 minutes (15, 20, 25, etc.)
        if (elapsed >= 600 && elapsed % 300 === 0 && elapsed !== lastAlertTime) {
          setShowHurryUpAlert(true);
          setLastAlertTime(elapsed);
        }
      }, 1000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [jobCreationStartTime, showHurryUpAlert, lastAlertTime]);

  // Format elapsed time for display
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const openNewJobModal = () => {
    setManualBarcode(''); // Reset manual barcode input
    setNewJobItems([]); // Reset job items
    setPendingStockUpdates([]); // Reset pending updates
    setJobCreationStartTime(new Date()); // Start timer
    setElapsedTime(0); // Reset elapsed time
    setShowHurryUpAlert(false); // Reset alert state
    setLastAlertTime(0); // Reset last alert time
    setSelectedTrolleyNumber(null); // Reset trolley number
    setIsNewJobModalOpen(true);
    
    // Create a live job session in Firebase
    const sessionId = `session_${Date.now()}_${user?.name || 'Unknown'}`;
    addDoc(collection(db, 'liveJobSessions'), {
      id: sessionId,
      createdBy: user?.name || 'Unknown',
      startTime: serverTimestamp(),
      items: [],
      isActive: true,
      createdAt: serverTimestamp()
    }).catch(error => {
      console.log('error', error);
    });
  };

  //check barcode if exists
  const checkBarcodeExists = async (barcode: string): Promise<boolean> => {
    try {
      const q = query(collection(db, 'inventory'), where('barcode', '==', barcode));
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.log('error', error);
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
      console.log('error', error);
      showToast('Error fetching stock item details', 'error');
    }
  };

  const handleStockUpdate = async (data: { id: string; quantity: number; reason: string; storeName: string; locationCode: string; shelfNumber: string }) => {
    if (!selectedStockItem) return;
    
    let deductedQuantity = 0; // Declare outside try block so it's accessible later
    
    // Use the specific document ID that was selected
    try {
      const stockDocRef = doc(db, 'inventory', data.id);
      const stockDoc = await getDoc(stockDocRef);

      if (!stockDoc.exists()) {
        showToast('Stock item not found', 'error');
        return;
      }

      const docData = stockDoc.data();
      const currentQuantity = Number(docData.quantity) || 0;
      const locationSpecificStockItem = {
        ...selectedStockItem,
        id: stockDoc.id,
        quantity: currentQuantity
      };

      // Calculate the deducted quantity (data.quantity is the new quantity after deduction)
      deductedQuantity = currentQuantity - data.quantity;

      // Validate that we don't deduct more than available
      if (deductedQuantity > currentQuantity) {
        showToast(`Cannot deduct ${deductedQuantity} units - only ${currentQuantity} units available at this location`, 'error');
        return;
      }

      if (deductedQuantity < 0) {
        showToast('Cannot deduct negative quantity', 'error');
        return;
      }

      // Add to pending stock updates with the location-specific stock item
      setPendingStockUpdates(prev => [...prev, {
        stockItem: locationSpecificStockItem,
        deductedQuantity,
        reason: data.reason,
        storeName: data.storeName,
        locationCode: data.locationCode,
        shelfNumber: data.shelfNumber
      }]);
    } catch {
      showToast('Error locating stock for this location', 'error');
      return;
    }
    
    // Add the barcode to the job items - use stockItemId to uniquely identify separate entries
    if (selectedStockItem.barcode) {
      setNewJobItems(prev => {
        const barcode = selectedStockItem.barcode!;
        
        // Check if this exact stockItemId already exists (for separate entries at same location)
        // Fall back to barcode+location if stockItemId is not available
        const existingIndex = prev.findIndex(item => 
          item.stockItemId 
            ? item.stockItemId === data.id 
            : (item.barcode === barcode && 
               item.locationCode === data.locationCode && 
               item.shelfNumber === data.shelfNumber)
        );
        
        if (existingIndex >= 0) {
          // Update existing item quantity for this specific stock item entry
          const updated = [...prev];
          updated[existingIndex] = { ...updated[existingIndex], quantity: updated[existingIndex].quantity + deductedQuantity };
          return updated;
        } else {
          // Add new item with location information and stock item ID
          return [...prev, { 
            barcode: barcode, 
            name: selectedStockItem.name, // Add product name
            quantity: deductedQuantity, 
            verified: false,
            locationCode: data.locationCode,
            shelfNumber: data.shelfNumber,
            reason: data.reason,
            storeName: data.storeName,
            stockItemId: data.id // Include document ID to distinguish separate entries at same location
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
    
    // Update the active session items in Firebase
    const sessionQuery = query(
      collection(db, 'liveJobSessions'),
      where('createdBy', '==', user?.name),
      where('isActive', '==', true)
    );
    const sessionSnapshot = await getDocs(sessionQuery);
    if (!sessionSnapshot.empty) {
      const sessionDoc = sessionSnapshot.docs[0];
      const currentItems = sessionDoc.data().items || [];
      
      // Add new item to the session
      const newItem = {
        barcode: selectedStockItem.barcode!,
        name: selectedStockItem.name,
        quantity: deductedQuantity,
        verified: false,
        locationCode: data.locationCode,
        shelfNumber: data.shelfNumber,
        reason: data.reason,
        storeName: data.storeName,
        stockItemId: data.id // Include document ID to distinguish separate entries at same location
      };
      
      await updateDoc(doc(db, 'liveJobSessions', sessionDoc.id), {
        items: [...currentItems, newItem]
      });
    }
    
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
    if (showArchived) {
      // For archived jobs, reset to yesterday to today date range instead of clearing completely
      setDateRangeToYesterdayToToday();
    } else {
      setStartDate(null);
      setEndDate(null);
    }
  };

  // Function to set date range from yesterday to today
  const setDateRangeToYesterdayToToday = () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1); // Yesterday
    
    const yesterdayStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()); // Start of yesterday (12 AM)
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999); // End of today (11:59:59 PM)
    setStartDate(yesterdayStart);
    setEndDate(todayEnd);
  };
  
  const clearAllFilters = () => {
    if (showArchived) {
      // For archived jobs, reset to yesterday to today date range instead of clearing completely
      setDateRangeToYesterdayToToday();
    } else {
      setStartDate(null);
      setEndDate(null);
    }
    setSelectedUser('all');
    setArchivedJobsSearchQuery('');
  };

  const finishNewJobPicking = async () => {
    if (newJobItems.length === 0) {
      showToast('Add at least one item to create a job', 'error');
      return;
    }
    
    // Prevent duplicate job creation
    if (isJobCreationInProgress) {
      showToast('Job creation is already in progress. Please wait for the current job to be created.', 'warning');
      return;
    }
    
    setIsJobCreationInProgress(true);
    setIsLoading(true);
    try {
      // Apply all pending stock updates with validation
      for (const update of pendingStockUpdates) {
        const stockRef = doc(db, 'inventory', update.stockItem.id);
        const newQuantity = update.stockItem.quantity - update.deductedQuantity;
        
        // Validate that we don't go negative
        if (newQuantity < 0) {
          showToast(`Error: Cannot deduct ${update.deductedQuantity} units from "${update.stockItem.name}" - only ${update.stockItem.quantity} units available`, 'error');
          throw new Error(`Insufficient stock: trying to deduct ${update.deductedQuantity} from ${update.stockItem.quantity} units`);
        }
        
        await updateDoc(stockRef, {
          quantity: newQuantity,
          lastUpdated: serverTimestamp()
        });
        
        // Add activity log for each stock update
        await addDoc(collection(db, 'activityLogs'), {
          detail: `${update.deductedQuantity} units deducted from stock "${update.stockItem.name}"  (Reason: ${update.reason}, Store: ${update.storeName}) by ${user?.role} from location ${update.locationCode} shelf ${update.shelfNumber}`,
          time: new Date().toISOString(),
          user: user?.name,
          role: user?.role
        });
      }
      
      // Note: Stock updates are already handled by pendingStockUpdates above
      // This section was causing double deduction and has been removed
      
      const numericId = Date.now().toString(); 

      const ref = await addDoc(collection(db, 'jobs'), {
        jobId: numericId,
        createdAt: serverTimestamp(),
        createdBy: user?.name || 'Unknown',
        status: 'awaiting_pack' as JobStatus,
        picker: user?.name || null,
        packer: null,
        items: newJobItems,
        pickingTime: elapsedTime, // Store the elapsed time
        trolleyNumber: selectedTrolleyNumber ?? null // Store the selected trolley number
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
      setJobCreationStartTime(null); // Reset timer
      setElapsedTime(0); // Reset elapsed time
      setShowHurryUpAlert(false); // Reset alert state
      setLastAlertTime(0); // Reset last alert time
      setSelectedTrolleyNumber(null); // Reset trolley number
      
              // Delete the live job session from Firebase since job is now completed
        const sessionQuery = query(
          collection(db, 'liveJobSessions'),
          where('createdBy', '==', user?.name),
          where('isActive', '==', true)
        );
        const sessionSnapshot = await getDocs(sessionQuery);
        if (!sessionSnapshot.empty) {
          await deleteDoc(doc(db, 'liveJobSessions', sessionSnapshot.docs[0].id));
        }
      
      fetchJobs();
    } catch (e) {
      console.log('error', e);
      showToast('Failed to create job', 'error');
    } finally {
      setIsLoading(false);
      setIsJobCreationInProgress(false);
    }
  };

  const completePicking = async (job: Job) => {
    // Prevent duplicate completions
    if (completingJobs.has(job.id)) {
      return;
    }

    // Set loading state
    setCompletingJobs(prev => new Set(prev).add(job.id));

    try {
      await updateDoc(doc(db, 'jobs', job.id), { status: 'awaiting_pack', picker: user?.name || job.picker || null });
      
      await logActivity(
        `completed picking for job ${job.jobId} with ${job.items.length} items (${job.items.reduce((sum, item) => sum + item.quantity, 0)} total units)`
      );

      showToast(`Job ${job.jobId} completed and awaiting pack`, 'success');
      
      fetchJobs();
    } catch (error) {
      showToast('Failed to update job', 'error');
      console.error('Error completing picking:', error);
    } finally {
      // Clear loading state
      setCompletingJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(job.id);
        return newSet;
      });
    }
  };

  const verifyItem = async (job: Job, barcode: string, verified: boolean) => {
    const itemKey = `${job.id}-${barcode}`;
    
    // Set loading state
    setVerifyingItems(prev => new Set(prev).add(itemKey));
    
    try {
      // Validate inputs
      if (!job.id || !barcode) {
        showToast('Invalid job or barcode', 'error');
        return;
      }

      // Track locally verified items instead of updating database immediately
      if (verified) {
        setLocallyVerifiedItems(prev => new Set(prev).add(itemKey));
      } else {
        setLocallyVerifiedItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(itemKey);
          return newSet;
        });
      }
      
      // showToast(`Item ${verified ? 'verified' : 'unverified'} locally`, 'success');
      
    } catch (error) { 
      console.log('error', error);
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
    // Prevent duplicate completions
    if (completingJobs.has(job.id)) {
      return;
    }

    // Set loading state
    setCompletingJobs(prev => new Set(prev).add(job.id));

    try {
      // Get all locally verified items for this job
      const jobVerifiedItems = Array.from(locallyVerifiedItems)
        .filter(itemKey => itemKey.startsWith(job.id))
        .map(itemKey => itemKey.split('-')[1]); // Extract barcode from itemKey
      
      // Count total verified items (both from database and locally)
      const totalVerifiedCount = job.items.filter(item => 
        item.verified || jobVerifiedItems.includes(item.barcode)
      ).length;
      
      // Validate that all items are verified before completing the job
      if (totalVerifiedCount < job.items.length) {
        showToast(`Cannot complete job ${job.jobId}. Please verify all items first. (${totalVerifiedCount}/${job.items.length} verified)`, 'error');
        setCompletingJobs(prev => {
          const newSet = new Set(prev);
          newSet.delete(job.id);
          return newSet;
        });
        return;
      }
      
      // Validate and fix items before updating - ensure all required fields are present
      // Firestore doesn't accept undefined values, so we need to use null or omit fields
      const updatedItems: FirestoreJobItem[] = job.items.map(item => {
        // Ensure all required fields have valid values
        const validatedItem: FirestoreJobItem = {
          barcode: item.barcode || '',
          name: item.name ?? null,
          asin: item.asin ?? null,
          quantity: Number(item.quantity) || 1,
          verified: jobVerifiedItems.includes(item.barcode) || item.verified,
          reason: item.reason || 'Unknown',
          storeName: item.storeName || 'Unknown'
        };
        
        // Only include optional fields if they have values (Firestore doesn't accept undefined)
        if (item.locationCode) {
          validatedItem.locationCode = item.locationCode;
        }
        if (item.shelfNumber) {
          validatedItem.shelfNumber = item.shelfNumber;
        }
        if (item.stockItemId) {
          validatedItem.stockItemId = item.stockItemId;
        }
        
        return validatedItem;
      });
      
      // Check for items with missing critical data
      const invalidItems = updatedItems.filter(item => !item.barcode || !item.reason || !item.storeName);
      if (invalidItems.length > 0) {
        console.error('Invalid items found:', invalidItems);
        showToast(`Job ${job.jobId} has ${invalidItems.length} item(s) with missing required data (barcode, reason, or storeName). Please check the job items.`, 'error');
        return;
      }
      
      // Verify the job document exists before updating
      const jobDocRef = doc(db, 'jobs', job.id);
      const jobDoc = await getDoc(jobDocRef);
      if (!jobDoc.exists()) {
        showToast(`Job ${job.jobId} not found in database. It may have been deleted.`, 'error');
        fetchJobs(); // Refresh to sync with database
        return;
      }
      
      // Update the job in database with all verified items
      await updateDoc(jobDocRef, { 
        status: 'completed', 
        packer: user?.name || job.packer || null,
        items: updatedItems
      });
      
      await logActivity(  
        `completed packing for job ${job.jobId} with ${job.items.length} items (${job.items.reduce((sum, item) => sum + item.quantity, 0)} total units) - ${totalVerifiedCount} items verified`
      );
      
      // Clear locally verified items for this job
      setLocallyVerifiedItems(prev => {
        const newSet = new Set(prev);
        jobVerifiedItems.forEach(barcode => {
          newSet.delete(`${job.id}-${barcode}`);
        });
        return newSet;
      });
      
      showToast(`Job ${job.jobId} completed successfully with ${totalVerifiedCount}/${job.items.length} items verified`, 'success');
      fetchJobs();
    } catch (error: unknown) { 
      console.error('Error completing job:', error);
      const errorMessage = (error instanceof Error && error.message) ? error.message : 'Unknown error';
      const errorCode = (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string') ? error.code : '';
      
      // Provide more specific error messages
      if (errorCode === 'permission-denied') {
        showToast(`Permission denied: Unable to complete job ${job.jobId}. Please check your permissions.`, 'error');
      } else if (errorCode === 'not-found') {
        showToast(`Job ${job.jobId} not found in database. It may have been deleted.`, 'error');
        fetchJobs(); // Refresh to sync with database
      } else if (errorMessage.includes('Invalid data') || errorMessage.includes('Field value') || errorMessage.includes('undefined')) {
        showToast(`Invalid data in job ${job.jobId}: ${errorMessage}. Please check job items.`, 'error');
      } else {
        showToast(`Failed to complete job ${job.jobId}: ${errorMessage}`, 'error');
      }
    } finally {
      // Clear loading state
      setCompletingJobs(prev => {
        const newSet = new Set(prev);
        newSet.delete(job.id);
        return newSet;
      });
    }
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
      
      // Clear local verification state for the deleted job
      setLocallyVerifiedItems(prev => {
        const newSet = new Set(prev);
        jobToDelete.items.forEach(item => {
          newSet.delete(`${jobToDelete.id}-${item.barcode}`);
        });
        return newSet;
      });
      
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
        const data = doc.data();
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
      console.log('error', error);
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
    const isExpanded = expandedJobs.has(job.id);
    
    return (
      <div className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} rounded-lg shadow-sm border`}>        
        <div className={`p-3 sm:p-4 border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
          <div className="flex flex-col gap-3">
            {/* Job Header Row */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className={`${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'} p-2 rounded-lg flex-shrink-0`}>
                  <ClipboardList className={`${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} size={18} />
                </div>

                {/* Job Header with Expandable Items */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                    <h3 className={`text-base sm:text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'} break-all`}>
                      Job {job.jobId}
                    </h3>
                    <button
                      onClick={() => toggleJobExpansion(job.id)}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors flex-shrink-0 ${
                        isDarkMode 
                          ? 'text-slate-300 hover:text-white hover:bg-slate-700' 
                          : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200'
                      }`}
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp size={14} />
                          <span className="hidden sm:inline">Hide Items</span> ({job.items.length})
                        </>
                      ) : (
                        <>
                          <ChevronDown size={14} />
                          <span className="hidden sm:inline">Show Items</span> ({job.items.length})
                        </>
                      )}
                    </button>
                  </div>
                  
                  <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} text-xs leading-relaxed`}>
                    Created by {job.createdBy} • {job.createdAt.toLocaleString()}
                    {job.pickingTime && job.pickingTime > 0 && (
                      <span className={`ml-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                        • Picking: {formatElapsedTime(job.pickingTime)}
                      </span>
                    )}
                    {job.trolleyNumber && (
                      <span className={`ml-2 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'} font-medium`}>
                        • Trolley: {job.trolleyNumber}
                      </span>
                    )}
                  </p>
                  
                  {/* Verified by packer info for completed and archived jobs */}
                  {(showCompleted || showArchived) && job.packer && (
                    <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} text-xs leading-relaxed`}>
                      Verified by {job.packer}
                    </p>
                  )}
                  
                  {/* Quick summary when collapsed */}
                  {!isExpanded && job.items.length > 0 && (
                    <div className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} text-xs mt-2`}>
                      {job.items.length} item{job.items.length !== 1 ? 's' : ''} • 
                      Total Qty: {job.items.reduce((sum, item) => sum + item.quantity, 0)}
                      {isAwaitingPack && (
                        <span className="ml-2">
                          • Verified: {job.items.filter(item => 
                            item.verified || locallyVerifiedItems.has(`${job.id}-${item.barcode}`)
                          ).length}/{job.items.length}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${isCompleted ? 'bg-green-100 text-green-700' : isAwaitingPack ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                  {isCompleted ? 'Completed' : isAwaitingPack ? 'Awaiting Pack' : 'Picking'}
                </span>
                <Button variant="secondary" onClick={fetchJobs} size='sm' className="h-8 w-8 p-0">
                  <RefreshCw size={14} />
                </Button>
                <Button variant="danger" onClick={() => requestDeleteJob(job)} size='sm' className="h-8 w-8 p-0">
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Expandable Items Section */}
        {isExpanded && (
          <div className="p-3 sm:p-4 space-y-4">
            {/* Action Buttons Row */}
            <div className="flex flex-wrap items-center gap-2">
              {isPicking && (
                <Button onClick={() => setIsStockUpdateModalOpen(true)} className="flex items-center gap-1" size='sm'>
                  <ClipboardList size={14} /> <span className="hidden sm:inline">Scan</span>
                </Button>
              )}
              {isAwaitingPack && (
                <div className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'} bg-slate-100 dark:bg-slate-700 px-3 py-2 rounded-lg`}>
                  Verification Status: {job.items.filter(item => 
                    item.verified || locallyVerifiedItems.has(`${job.id}-${item.barcode}`)
                  ).length}/{job.items.length} items verified
                </div>
              )}
            </div>
            
            {/* Job Items List */}
            <div className="space-y-3">
              {job.items.map((it, itemIndex) => (
                <div key={`${it.barcode}-${itemIndex}-${job.id}`} className={`p-3 rounded-lg ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                  {editingJobItem?.jobId === job.id && editingJobItem?.itemIndex === itemIndex ? (
                    // Edit mode
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex flex-col sm:flex-row gap-2 flex-1">
                        <Input 
                          value={editingJobItem.barcode} 
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingJobItem({...editingJobItem, barcode: e.target.value})} 
                          className="w-full sm:w-32 text-sm" 
                          placeholder="Barcode"
                        />
                        <Input 
                          type="number" 
                          value={editingJobItem.quantity.toString()} 
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditingJobItem({...editingJobItem, quantity: Number(e.target.value) || 1})} 
                          className="w-full sm:w-20 text-sm" 
                          min="1" 
                          placeholder="Qty"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          onClick={() => updateJobItem(job, itemIndex, editingJobItem.barcode, editingJobItem.quantity)} 
                          className="h-8 px-3"
                        >
                          ✓
                        </Button>
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          onClick={() => setEditingJobItem(null)} 
                          className="h-8 px-3"
                        >
                          ✕
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // Display mode
                    <div className="space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className={`${isDarkMode ? 'text-white' : 'text-slate-800'} text-sm font-medium break-words`}>
                            {it.name || it.barcode}
                          </div>
                          {it.name && (
                            <div className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} text-xs mt-1 break-all`}>
                              Barcode: {it.barcode}
                            </div>
                          )}
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {isAwaitingPack && (
                            <Button
                              variant={it.verified || locallyVerifiedItems.has(`${job.id}-${it.barcode}`) ? "success" : "primary"}
                              size="sm"
                              onClick={() => verifyItem(job, it.barcode, !(it.verified || locallyVerifiedItems.has(`${job.id}-${it.barcode}`)))}
                              disabled={verifyingItems.has(`${job.id}-${it.barcode}`)}
                              className={`h-7 px-2 text-xs transition-all duration-200 ${
                                it.verified || locallyVerifiedItems.has(`${job.id}-${it.barcode}`)
                                  ? 'bg-green-500 hover:bg-green-600 text-white' 
                                  : 'bg-blue-500 hover:bg-blue-600 text-white'
                              }`}
                            >
                              {verifyingItems.has(`${job.id}-${it.barcode}`) ? (
                                <RefreshCw size={12} className="animate-spin" />
                              ) : (
                                <span className="hidden sm:inline">
                                  {it.verified || locallyVerifiedItems.has(`${job.id}-${it.barcode}`) ? 'Verified' : 'Verify'}
                                </span>
                              )}
                            </Button>
                          )}
                          

                          
                          {isAwaitingPack && !editingJobItem && (
                            <>
                              {/* <Button 
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
                                className="h-8 w-8 p-0 flex items-center justify-center"
                                title="Edit item"
                              >
                                <Edit size={16} />
                              </Button> */}
                              <Button 
                                variant="danger" 
                                size="sm" 
                                onClick={() => removeJobItem(job, itemIndex)} 
                                className="h-8 w-8 p-0 flex items-center justify-center"
                                title="Remove item"
                              >
                                <Trash2 size={16} />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Item Details */}
                      <div className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} text-xs space-y-1`}>
                        <div>Qty: {it.quantity}</div>
                        {it.locationCode && it.shelfNumber && (
                          <div>Location: {it.locationCode}-{it.shelfNumber}</div>
                        )}
                        {it.reason && (
                          <div>Reason: {it.reason}</div>
                        )}
                        {it.storeName && (
                          <div>Store: {it.storeName?.toUpperCase()}</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {job.items.length === 0 && (
                <div className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} text-sm text-center py-4`}>
                  No items scanned yet.
                </div>
              )}
            </div>
            
            {/* Bottom Action Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              {isPicking && (
                <Button 
                  onClick={() => completePicking(job)} 
                  size='sm' 
                  className="flex items-center gap-1 w-full sm:w-auto"
                  isLoading={completingJobs.has(job.id)}
                  disabled={completingJobs.has(job.id)}
                >
                  <CheckSquare size={14} /> <span className="hidden sm:inline">Finish Picking</span>
                </Button>
              )}
              {isAwaitingPack && (
                <Button 
                  onClick={() => completePacking(job)} 
                  size='sm' 
                  className="flex items-center gap-1 w-full sm:w-auto"
                  isLoading={completingJobs.has(job.id)}
                  disabled={completingJobs.has(job.id)}
                >
                  <CheckSquare size={14} /> <span className="hidden sm:inline">Complete Job</span>
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
              {showArchived ? 'Archived' : showCompleted ? 'Completed' : showLiveJobs ? 'Live' : showReports ? 'Reports' : showProductivity ? 'Worker Productivity' : 'Active'} Jobs
            </h1>
            {showLiveJobs && (
              <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Showing jobs currently being created (in progress)
              </p>
            )}
            {/* {showReports && (
              <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Analytics and performance reports for warehouse operations
              </p>
            )} */}
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
              variant={!showCompleted && !showArchived && !showLiveJobs && !showReports && !showProductivity ? "primary" : "secondary"} 
              onClick={() => {
                setShowCompleted(false);
                setShowArchived(false);
                setShowLiveJobs(false);
                setShowReports(false);
                setShowProductivity(false);
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
                setShowLiveJobs(false);
                setShowReports(false);
                setShowProductivity(false);
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
                setShowLiveJobs(false);
                setShowReports(false);
                setShowProductivity(false);
                setDateRangeToYesterdayToToday(); // Automatically set date range from yesterday to today for archived jobs
              }}
              size='sm'
            >
              Archived Jobs
            </Button>
            {(user?.role === 'admin' || user?.role === 'manager') && (
              <Button 
                variant={showLiveJobs ? "primary" : "secondary"} 
                onClick={() => {
                  setShowCompleted(false);
                  setShowArchived(false);
                  setShowLiveJobs(true);
                  setShowReports(false);
                  setShowProductivity(false);
                }}
                size='sm'
              >
                Live Jobs
              </Button>
            )}
            {user?.role !=='staff' && (<Button 
              variant={showReports ? "primary" : "secondary"} 
              onClick={() => {
                setShowCompleted(false);
                setShowArchived(false);
                setShowLiveJobs(false);
                setShowProductivity(false);
                setShowReports(true);
              }}
              size='sm'
            >
              Reports
            </Button>)}
            {(user?.role === 'admin' || user?.role === 'manager') && (
              <Button 
                variant={showProductivity ? "primary" : "secondary"} 
                onClick={() => {
                  setShowCompleted(false);
                  setShowArchived(false);
                  setShowLiveJobs(false);
                  setShowReports(false);
                  setShowProductivity(true);
                }}
                size='sm'
              >
                Productivity
              </Button>
            )}
          </div>
        </div>
        
        {/* Job Type Navigation and Filters Section */}
        <div className="flex flex-col gap-4">
          {/* Filters Section - Only show for Archived Jobs */}
          {showArchived && (
            <div className="w-full">
              <div className="flex flex-col gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                {/* Filter Row 1: Search, User Filter and Date Range */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Search Filter */}
                  <div className="flex flex-col gap-1">
                    <label className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      Search Jobs:
                    </label>
                    <div className="relative">
                      <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
                        isDarkMode ? 'text-slate-400' : 'text-slate-500'
                      }`} />
                      <input
                        type="text"
                        placeholder="Search by job ID or item name..."
                        value={archivedJobsSearchQuery}
                        onChange={(e) => setArchivedJobsSearchQuery(e.target.value)}
                        className={`pl-10 pr-3 py-2 border rounded-md text-sm w-full ${
                          isDarkMode 
                            ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' 
                            : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'
                        }`}
                      />
                    </div>
                  </div>
                  
                  {/* User Filter */}
                  <div className="flex flex-col gap-1">
                    <label className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      Filter by User:
                    </label>
                    <select
                      value={selectedUser}
                      onChange={(e) => setSelectedUser(e.target.value)}
                      className={`px-3 py-2 border rounded-md text-sm w-full ${
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
                      className="w-full"
                    />
                  </div>
                </div>
                
                {/* Filter Row 2: Clear Filters Button */}
                <div className="flex justify-end">
                  <Button
                    variant="secondary"
                    onClick={clearAllFilters}
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    Clear All Filters
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Filter Summary for Archived Jobs */}
        {showArchived && (startDate || endDate || selectedUser !== 'all' || archivedJobsSearchQuery.trim()) && (
          <div className={`p-3 rounded-lg border ${
            isDarkMode 
              ? 'bg-slate-800 border-slate-700 text-slate-300' 
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-sm">
              <span className="font-medium">Active Filters:</span>
              <div className="flex flex-wrap gap-2">
                {archivedJobsSearchQuery.trim() && (
                  <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-xs">
                    Search: "{archivedJobsSearchQuery}"
                  </span>
                )}
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
          </div>
        )}
        
        {!showReports && !showProductivity && filteredJobs.map(job => (
          <JobRow key={job.id} job={job} />
        ))}
        
        {/* Live Jobs Section */}
        {showLiveJobs && (
          <>
            {/* Live Jobs Header with Refresh Button */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                  Live Job Sessions
                </h2>
                <span className={`px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300`}>
                  {getLiveJobs().totalCount} active
                </span>
              </div>
              <Button 
                variant="secondary" 
                onClick={() => {
                  // Refresh both database jobs and clean up old sessions
                  fetchJobs();
                  cleanupOldLiveJobSessions();
                }} 
                className="flex items-center gap-2"
                size='sm'
              >
                <RefreshCw size={16} />
                Refresh Live Jobs
              </Button>
            </div>

            {/* Show Live Jobs UI Sessions */}
            {getLiveJobs().uiSessions.map(session => (
              <div key={session.id} className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} rounded-lg shadow-sm border border-dashed`}>
                <div className={`p-3 sm:p-4 border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className={`${isDarkMode ? 'bg-orange-700' : 'bg-orange-100'} p-2 rounded-lg flex-shrink-0`}>
                          <ClipboardList className={`${isDarkMode ? 'text-orange-300' : 'text-orange-600'}`} size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                            <h3 className={`text-base sm:text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                              Creating New Job
                            </h3>
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                              In Progress
                            </span>
                          </div>
                          <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} text-xs leading-relaxed`}>
                            Created by {session.createdBy} • Started at {session.startTime.toLocaleString()}
                          </p>
                          <div className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} text-xs mt-2`}>
                            {session.items.length} item{session.items.length !== 1 ? 's' : ''} scanned
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </>
        )}

        {/* Reports Section */}
        {showReports && user?.role !=='staff' &&(
          <>
            {/* Reports Header with Date Picker */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                  Warehouse Performance Reports
                </h2>
                <span className={`px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300`}>
                  {(() => {
                    const day = String(reportDate.getDate()).padStart(2, '0');
                    const month = String(reportDate.getMonth() + 1).padStart(2, '0');
                    const year = reportDate.getFullYear();
                    return `${day}/${month}/${year}`;
                  })()}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="date"
                  value={(() => {
                    const year = reportDate.getFullYear();
                    const month = String(reportDate.getMonth() + 1).padStart(2, '0');
                    const day = String(reportDate.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                  })()}
                  onChange={(e) => {
                    const newDate = new Date(e.target.value);
                    setReportDate(newDate);
                    // Regenerate reports for the new date
                    generateReports(newDate);
                  }}
                  className={`px-3 py-2 border rounded-md text-sm ${
                    isDarkMode 
                      ? 'bg-slate-700 border-slate-600 text-white' 
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
                <Button 
                  variant="secondary" 
                  onClick={() => generateReports(reportDate)} 
                  className="flex items-center gap-2"
                  size='sm'
                  disabled={isLoadingReports}
                >
                  <RefreshCw size={16} className={isLoadingReports ? 'animate-spin' : ''} />
                </Button>
              </div>
            </div>

            {isLoadingReports ? (
              <div className={`text-center py-12 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                <div className="flex flex-col items-center space-y-4">
                  <RefreshCw size={32} className="animate-spin text-blue-500" />
                  <div className="space-y-2">
                    <p className="text-lg font-medium">Generating Reports...</p>
                    <p className="text-sm opacity-75">Please wait while we analyze the data</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">

                                    {/* Summary Stats */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    <div className={`p-3 sm:p-4 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                      <div className={`text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mb-1`}>Total Items Picked Today</div>
                      <div className={`text-xl sm:text-2xl font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                        {reportData.userStats.reduce((sum, user) => sum + user.itemsPicked, 0)}
                      </div>
                    </div>
                    <div className={`p-3 sm:p-4 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                      <div className={`text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mb-1`}>Total Jobs Completed</div>
                      <div className={`text-xl sm:text-2xl font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                        {reportData.userStats.reduce((sum, user) => sum + user.jobsCompleted, 0)}
                      </div>
                    </div>
                    <div className={`p-3 sm:p-4 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} sm:col-span-2 lg:col-span-1`}>
                      <div className={`text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mb-1`}>Active Users Today</div>
                      <div className={`text-xl sm:text-2xl font-bold ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                        {reportData.userStats.length}
                      </div>
                    </div>
                  </div>

                                 {/* User Performance Table */}
                  <div className={`p-4 sm:p-6 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <h3 className={`text-base sm:text-lg font-semibold mb-3 sm:mb-4 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                      User Performance - {reportDate.toLocaleDateString()}
                    </h3>
                    {reportData.userStats.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[600px]">
                          <thead>
                            <tr className={`border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                              <th className={`text-left py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>User</th>
                              <th className={`text-center py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Jobs Created</th>
                              <th className={`text-center py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Jobs Completed</th>
                              <th className={`text-center py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Items Picked</th>
                              <th className={`text-center py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Avg Time/Job</th>
                              <th className={`text-center py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>Total Time</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.userStats.map((user, index) => (
                              <tr key={index} className={`border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                                <td className={`py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                  {user.name}
                                </td>
                                <td className={`text-center py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                  {user.jobsCreated}
                                </td>
                                <td className={`text-center py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                  {user.jobsCompleted}
                                </td>
                                <td className={`text-center py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} font-semibold`}>
                                  {user.itemsPicked}
                                </td>
                                <td className={`text-center py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                  {formatElapsedTime(user.avgTimePerJob)}
                                </td>
                                <td className={`text-center py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                  {formatElapsedTime(user.totalTime)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className={`text-center py-6 sm:py-8 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        No data available for selected date
                      </div>
                    )}
                  </div>

                                {/* Performance Overview - Last 7 Days */}
                  <div className={`p-4 sm:p-6 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <h3 className={`text-base sm:text-lg font-semibold mb-3 sm:mb-4 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                      Last 7 Days Performance Overview
                    </h3>
                    <div className="grid grid-cols-4 sm:grid-cols-7 gap-1 sm:gap-2">
                    {(() => {
                      const data: { date: string; itemsPicked: number; jobsCompleted: number }[] = [];
                      
                      // Generate data for the last 7 days
                      for (let i = 6; i >= 0; i--) {
                        const checkDate = new Date();
                        checkDate.setDate(checkDate.getDate() - i);
                        const checkStart = new Date(checkDate);
                        checkStart.setHours(0, 0, 0, 0);
                        const checkEnd = new Date(checkDate);
                        checkEnd.setHours(23, 59, 59, 999);

                        const dayJobs = jobs.filter(job => {
                          const jobDate = job.createdAt;
                          return jobDate >= checkStart && jobDate <= checkEnd;
                        });

                        const itemsPicked = dayJobs.reduce((sum, job) => 
                          sum + job.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
                        );
                        const jobsCompleted = dayJobs.filter(job => job.status === 'completed').length;

                        const dateKey = format(checkDate, 'MMM dd');
                        data.push({ date: dateKey, itemsPicked, jobsCompleted });
                      }
                      
                      return data;
                    })().map((stat, index) => (
                      <div key={index} className="text-center">
                        <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mb-1`}>
                             {stat.date}
                           </div>
                        <div className={`text-lg font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                          {stat.itemsPicked}
                         </div>
                        <div className={`text-xs ${isDarkMode ? 'text-slate-500' : 'text-slate-600'}`}>
                          {stat.jobsCompleted} jobs
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>

                                                          {/* Date Range Selector for Charts */}
                    <div className={`p-3 sm:p-4 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                      <h3 className={`text-base sm:text-lg font-semibold mb-3 sm:mb-4 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                        Chart Date Range
                      </h3>
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                          <div className="flex-1">
                            <label className={`block text-xs sm:text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                              Start Date
                            </label>
                            <input
                              type="date"
                              value={(() => {
                                const year = dateRange.start.getFullYear();
                                const month = String(dateRange.start.getMonth() + 1).padStart(2, '0');
                                const day = String(dateRange.start.getDate()).padStart(2, '0');
                                return `${year}-${month}-${day}`;
                              })()}
                              onChange={(e) => {
                                const newStart = new Date(e.target.value);
                                newStart.setHours(0, 0, 0, 0);
                                // Ensure start date is not after end date
                                if (newStart <= dateRange.end) {
                                  setDateRange(prev => ({ ...prev, start: newStart }));
                                }
                              }}
                              className={`w-full px-2 sm:px-3 py-2 border rounded-md text-xs sm:text-sm ${
                                isDarkMode 
                                  ? 'bg-slate-700 border-slate-600 text-white' 
                                  : 'bg-white border-slate-300 text-slate-900'
                              }`}
                            />
                          </div>
                          <div className="flex-1">
                            <label className={`block text-xs sm:text-sm font-medium mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                              End Date
                            </label>
                            <input
                              type="date"
                              value={(() => {
                                const year = dateRange.end.getFullYear();
                                const month = String(dateRange.end.getMonth() + 1).padStart(2, '0');
                                const day = String(dateRange.end.getDate()).padStart(2, '0');
                                return `${year}-${month}-${day}`;
                              })()}
                              onChange={(e) => {
                                const newEnd = new Date(e.target.value);
                                newEnd.setHours(23, 59, 59, 999);
                                // Ensure end date is not before start date
                                if (newEnd >= dateRange.start) {
                                  setDateRange(prev => ({ ...prev, end: newEnd }));
                                }
                              }}
                              className={`w-full px-2 sm:px-3 py-2 border rounded-md text-xs sm:text-sm ${
                                isDarkMode 
                                  ? 'bg-slate-700 border-slate-600 text-white' 
                                  : 'bg-white border-slate-300 text-slate-900'
                              }`}
                            />
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            onClick={() => {
                              const end = new Date();
                              const start = new Date();
                              start.setDate(start.getDate() - 6);
                              start.setHours(0, 0, 0, 0);
                              end.setHours(23, 59, 59, 999);
                              setDateRange({ start, end });
                            }}
                            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                              (() => {
                                const end = new Date();
                                const start = new Date();
                                start.setDate(start.getDate() - 6);
                                start.setHours(0, 0, 0, 0);
                                end.setHours(23, 59, 59, 999);
                                return dateRange.start.getTime() === start.getTime() && dateRange.end.getTime() === end.getTime();
                              })() 
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25' 
                                : 'bg-slate-600 hover:bg-slate-500 text-white hover:shadow-md'
                            }`}
                          >
                            Last 7 Days
                          </button>
                          <button
                            onClick={() => {
                              const end = new Date();
                              const start = new Date();
                              start.setDate(start.getDate() - 29);
                              start.setHours(0, 0, 0, 0);
                              end.setHours(23, 59, 59, 999);
                              setDateRange({ start, end });
                            }}
                            className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                              (() => {
                                const end = new Date();
                                const start = new Date();
                                start.setDate(start.getDate() - 29);
                                start.setHours(0, 0, 0, 0);
                                end.setHours(23, 59, 59, 999);
                                return dateRange.start.getTime() === start.getTime() && dateRange.end.getTime() === end.getTime();
                              })() 
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25' 
                                : 'bg-slate-600 hover:bg-slate-500 text-white hover:shadow-md'
                            }`}
                          >
                            Last 30 Days
                          </button>
                        </div>
                      </div>
                    </div>

                                        {/* Charts */}
                    <div className="space-y-3 sm:space-y-4 md:space-y-6">
                      {/* Jobs Performance Trends */}
                      <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} p-3 sm:p-4 rounded-lg shadow-sm`}>
                        <h3 className={`text-sm sm:text-base md:text-lg font-medium ${isDarkMode ? 'text-white' : 'text-slate-800'} mb-2 sm:mb-3 md:mb-4`}>Jobs Performance - Daily Overview ({dateRange.start.toLocaleDateString('en-GB')} to {dateRange.end.toLocaleDateString('en-GB')})</h3>
                        <div className="h-48 sm:h-64 md:h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={(() => {
                            const data: { date: string; itemsPicked: number; jobsCompleted: number; jobsCreated: number }[] = [];
                            const groupedData = new Map<string, { itemsPicked: number; jobsCompleted: number; jobsCreated: number }>();

                            // Generate data for the selected date range
                            const startDate = new Date(dateRange.start);
                            const endDate = new Date(dateRange.end);
                            const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                            
                            for (let i = 0; i <= daysDiff; i++) {
                              const checkDate = new Date(startDate);
                              checkDate.setDate(startDate.getDate() + i);
                              const checkStart = new Date(checkDate);
                              checkStart.setHours(0, 0, 0, 0);
                              const checkEnd = new Date(checkDate);
                              checkEnd.setHours(23, 59, 59, 999);

                              const dayJobs = jobs.filter(job => {
                                const jobDate = job.createdAt;
                                return jobDate >= checkStart && jobDate <= checkEnd;
                              });

                              const itemsPicked = dayJobs.reduce((sum, job) => 
                                sum + job.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
                              );
                              const jobsCompleted = dayJobs.filter(job => job.status === 'completed').length;
                              const jobsCreated = dayJobs.length;

                              const dateKey = format(checkDate, 'MMM dd');
                              groupedData.set(dateKey, { itemsPicked, jobsCompleted, jobsCreated });
                            }

                            groupedData.forEach((dataItem, date) => {
                              data.push({
                                date,
                                itemsPicked: dataItem.itemsPicked,
                                jobsCompleted: dataItem.jobsCompleted,
                                jobsCreated: dataItem.jobsCreated
                              });
                            });

                            return data.sort((a, b) => {
                              const dateA = new Date(a.date);
                              const dateB = new Date(b.date);
                              return dateA.getTime() - dateB.getTime();
                            });
                          })()}>
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
                                if (name === 'Items Picked') {
                                  return [`${value} items`, name];
                                } else if (name === 'Jobs Completed') {
                                  return [`${value} jobs`, name];
                                } else if (name === 'Jobs Created') {
                                  return [`${value} jobs`, name];
                                }
                                return [value, name];
                              }}
                              labelFormatter={(label) => `Date: ${label}`}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="itemsPicked" stroke="#10b981" name="Items Picked" strokeWidth={2} />
                            <Line type="monotone" dataKey="jobsCompleted" stroke="#3b82f6" name="Jobs Completed" strokeWidth={2} />
                            <Line type="monotone" dataKey="jobsCreated" stroke="#f59e0b" name="Jobs Created" strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                           </div>
                         </div>

                                          {/* User Performance Chart */}
                      <div className={`${isDarkMode ? 'bg-slate-800' : 'bg-white'} p-3 sm:p-4 rounded-lg shadow-sm`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 mb-2 sm:mb-3 md:mb-4">
                          <h3 className={`text-sm sm:text-base md:text-lg font-medium ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>User Performance - {dateRange.start.toLocaleDateString('en-GB')} to {dateRange.end.toLocaleDateString('en-GB')}</h3>
                          <select
                            value={selectedUserForChart || (() => {
                              const uniqueUsers = Array.from(new Set(jobs.map(job => job.createdBy)));
                              return uniqueUsers.length > 0 ? uniqueUsers[0] : '';
                            })()}
                            onChange={(e) => {
                              setSelectedUserForChart(e.target.value);
                            }}
                            className={`px-2 sm:px-3 py-1 border rounded-md text-xs sm:text-sm ${
                              isDarkMode 
                                ? 'bg-slate-700 border-slate-600 text-white' 
                                : 'bg-white border-slate-300 text-slate-900'
                            }`}
                          >
                            {(() => {
                              const uniqueUsers = Array.from(new Set(jobs.map(job => job.createdBy)));
                              return uniqueUsers.map(userName => (
                                <option key={userName} value={userName}>{userName}</option>
                              ));
                            })()}
                          </select>
                        </div>
                        <div className="h-48 sm:h-64 md:h-80">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={(() => {
                            const data: { date: string; itemsPicked: number; jobsCompleted: number; jobsCreated: number; totalPickingTime: number }[] = [];
                            const groupedData = new Map<string, { itemsPicked: number; jobsCompleted: number; jobsCreated: number; totalPickingTime: number }>();

                            // Get the selected user from state, or default to first user
                            const uniqueUsers = Array.from(new Set(jobs.map(job => job.createdBy)));
                            const selectedUser = selectedUserForChart || (uniqueUsers.length > 0 ? uniqueUsers[0] : '');

                            // Generate data for the selected date range for the selected user
                            const startDate = new Date(dateRange.start);
                            const endDate = new Date(dateRange.end);
                            const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                            
                            for (let i = 0; i <= daysDiff; i++) {
                              const checkDate = new Date(startDate);
                              checkDate.setDate(startDate.getDate() + i);
                              const checkStart = new Date(checkDate);
                              checkStart.setHours(0, 0, 0, 0);
                              const checkEnd = new Date(checkDate);
                              checkEnd.setHours(23, 59, 59, 999);

                              const dayJobs = jobs.filter(job => {
                                const jobDate = job.createdAt;
                                return jobDate >= checkStart && jobDate <= checkEnd && job.createdBy === selectedUser;
                              });

                              const itemsPicked = dayJobs.reduce((sum, job) => 
                                sum + job.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
                              );
                              const jobsCompleted = dayJobs.filter(job => job.status === 'completed').length;
                              const jobsCreated = dayJobs.length;
                              
                              // Calculate total picking time for the day
                              let totalPickingTime = 0;
                              dayJobs.forEach(job => {
                                if (job.pickingTime && job.pickingTime > 0) {
                                  totalPickingTime += job.pickingTime;
                                }
                              });

                              const dateKey = format(checkDate, 'MMM dd');
                              groupedData.set(dateKey, { itemsPicked, jobsCompleted, jobsCreated, totalPickingTime });
                            }

                            groupedData.forEach((dataItem, date) => {
                              data.push({
                                date,
                                itemsPicked: dataItem.itemsPicked,
                                jobsCompleted: dataItem.jobsCompleted,
                                jobsCreated: dataItem.jobsCreated,
                                totalPickingTime: dataItem.totalPickingTime
                              });
                            });

                            return data.sort((a, b) => {
                              const dateA = new Date(a.date);
                              const dateB = new Date(b.date);
                              return dateA.getTime() - dateB.getTime();
                            });
                          })()}>
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
                                if (name === 'Items Picked') {
                                  return [`${value} items`, name];
                                } else if (name === 'Jobs Completed') {
                                  return [`${value} jobs`, name];
                                } else if (name === 'Jobs Created') {
                                  return [`${value} jobs`, name];
                                } else if (name === 'Total Picking Time') {
                                  return [`${formatElapsedTime(value)}`, name];
                                }
                                return [value, name];
                              }}
                              labelFormatter={(label) => `Date: ${label}`}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="itemsPicked" stroke="#10b981" name="Items Picked" strokeWidth={2} />
                            <Line type="monotone" dataKey="jobsCompleted" stroke="#3b82f6" name="Jobs Completed" strokeWidth={2} />
                            <Line type="monotone" dataKey="jobsCreated" stroke="#f59e0b" name="Jobs Created" strokeWidth={2} />
                            <Line type="monotone" dataKey="totalPickingTime" stroke="#8b5cf6" name="Total Picking Time" strokeWidth={2} />
                          </LineChart>
                        </ResponsiveContainer>
                   </div>
                 </div>
                  </div>

                

                
              </div>
            )}
          </>
        )}
        
        {/* Productivity Section */}
        {showProductivity && (
          <>
            {/* Productivity Header with Date Picker */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                  Productivity Analytics
                </h2>
                <span className={`px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300`}>
                  {productivityDate.toLocaleDateString()}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                    Date:
                  </label>
                  <input
                    type="date"
                    value={`${productivityDate.getFullYear()}-${String(productivityDate.getMonth() + 1).padStart(2, '0')}-${String(productivityDate.getDate()).padStart(2, '0')}`}
                    onChange={(e) => {
                      const dateString = e.target.value;
                      const [year, month, day] = dateString.split('-').map(Number);
                      const newDate = new Date(year, month - 1, day); // month is 0-indexed
                      setProductivityDate(newDate);
                      generateProductivityData();
                    }}
                    className={`px-3 py-2 border rounded-md text-sm ${
                      isDarkMode 
                        ? 'bg-slate-700 border-slate-600 text-white' 
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
                <Button 
                  variant="secondary" 
                  onClick={generateProductivityData} 
                  className="flex items-center gap-2"
                  size='sm'
                  disabled={isLoadingProductivity}
                >
                  <RefreshCw size={16} className={isLoadingProductivity ? 'animate-spin' : ''} />
                </Button>
              </div>
            </div>

            {isLoadingProductivity ? (
              <div className={`text-center py-12 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                <div className="flex flex-col items-center space-y-4">
                  <RefreshCw size={32} className="animate-spin text-green-500" />
                  <div className="space-y-2">
                    <p className="text-lg font-medium">Analyzing Worker Productivity...</p>
                    <p className="text-sm opacity-75">Please wait while we calculate performance metrics</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Productivity Summary Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div className={`p-3 sm:p-4 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <div className={`text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mb-1`}>Total Workers</div>
                    <div className={`text-xl sm:text-2xl font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                      {productivityData.workerStats.length}
                    </div>
                  </div>
                  <div className={`p-3 sm:p-4 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <div className={`text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mb-1`}>Total Jobs Completed</div>
                    <div className={`text-xl sm:text-2xl font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                      {productivityData.workerStats.reduce((sum, worker) => sum + worker.completedJobs, 0)}
                    </div>
                  </div>
                  <div className={`p-3 sm:p-4 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <div className={`text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mb-1`}>Total Items Picked</div>
                    <div className={`text-xl sm:text-2xl font-bold ${isDarkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                      {productivityData.workerStats.reduce((sum, worker) => sum + worker.itemsPicked, 0)}
                    </div>
                  </div>
                  <div className={`p-3 sm:p-4 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <div className={`text-xs sm:text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mb-1`}>Avg Efficiency</div>
                    <div className={`text-xl sm:text-2xl font-bold ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>
                      {productivityData.workerStats.length > 0 
                        ? (productivityData.workerStats.reduce((sum, worker) => sum + worker.efficiency, 0) / productivityData.workerStats.length).toFixed(1)
                        : '0'} items/min
                    </div>
                  </div>
                </div>

                {/* Worker Performance Table */}
                <div className={`p-4 sm:p-6 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <h3 className={`text-base sm:text-lg font-semibold mb-3 sm:mb-4 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                    Worker Performance Ranking
                  </h3>
                  {productivityData.workerStats.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[700px]">
                        <thead>
                          <tr className={`border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                            <th className={`text-left py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Rank</th>
                            <th className={`text-left py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Worker</th>
                            <th className={`text-center py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Jobs</th>
                            <th className={`text-center py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Items</th>
                            <th className={`text-center py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Efficiency</th>
                            <th className={`text-center py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Avg Time</th>
                            <th className={`text-center py-2 px-2 sm:px-3 text-xs sm:text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>Performance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productivityData.workerStats.map((worker, index) => (
                            <tr key={worker.name} className={`border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
                              <td className={`py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                #{index + 1}
                              </td>
                              <td className={`py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm font-medium ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                {worker.name}
                              </td>
                              <td className={`text-center py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                {worker.completedJobs}
                              </td>
                              <td className={`text-center py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} font-semibold`}>
                                {worker.itemsPicked}
                              </td>
                              <td className={`text-center py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm ${isDarkMode ? 'text-green-400' : 'text-green-600'} font-semibold`}>
                                {worker.efficiency} items/min
                              </td>
                              <td className={`text-center py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                                {Math.round(worker.avgPickingTime / 60)}m {worker.avgPickingTime % 60}s
                              </td>
                              <td className={`text-center py-2 sm:py-3 px-2 sm:px-3 text-xs sm:text-sm`}>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  worker.performance === 'excellent' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                                  worker.performance === 'good' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
                                  worker.performance === 'average' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
                                  'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                }`}>
                                  {worker.performance === 'needs_improvement' ? 'Needs Improvement' : 
                                   worker.performance.charAt(0).toUpperCase() + worker.performance.slice(1)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className={`text-center py-6 sm:py-8 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      No productivity data available for the selected date range
                    </div>
                  )}
                </div>

                {/* Hourly Productivity Chart */}
                <div className={`p-4 sm:p-6 rounded-lg border ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                  <h3 className={`text-base sm:text-lg font-semibold mb-3 sm:mb-4 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                    Hourly Productivity Trends
                  </h3>
                  <div className="h-80 w-full overflow-x-auto">
                    <ResponsiveContainer width="100%" height="100%" minWidth={800}>
                      <LineChart data={productivityData.hourlyProductivity} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#334155' : '#e2e8f0'} />
                        <XAxis 
                          dataKey="hour" 
                          stroke={isDarkMode ? '#94a3b8' : '#64748b'} 
                          fontSize={10}
                          interval={1}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis stroke={isDarkMode ? '#94a3b8' : '#64748b'} fontSize={12} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                            border: isDarkMode ? '1px solid #334155' : '1px solid #e2e8f0',
                            color: isDarkMode ? '#e2e8f0' : '#1e293b'
                          }}
                          formatter={(value: number, name: string) => {
                            if (name === 'Total Items') {
                              return [`${value} items`, name];
                            } else if (name === 'Total Jobs') {
                              return [`${value} jobs`, name];
                            } else if (name === 'Avg Picking Time') {
                              return [`${Math.round(value / 60)}m ${value % 60}s`, name];
                            }
                            return [value, name];
                          }}
                          labelFormatter={(label) => `Hour: ${label}`}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="totalJobs" stroke="#10b981" name="Total Jobs" strokeWidth={2} />
                        <Line type="monotone" dataKey="totalItems" stroke="#3b82f6" name="Total Items" strokeWidth={2} />
                        <Line type="monotone" dataKey="avgPickingTime" stroke="#f59e0b" name="Avg Picking Time" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        
        {!showReports && !showProductivity && filteredJobs.length === 0 && getLiveJobs().uiSessions.length === 0 && (
          <div className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} text-center py-8`}>
            {showArchived ? (
              <div className="space-y-2">
                <p>No archived jobs found.</p>
                {(startDate || endDate || selectedUser !== 'all') && (
                  <p className="text-sm">Try adjusting your filters or clearing them to see more results.</p>
                )}
              </div>
            ) : showCompleted ? 'No completed jobs found.' : showLiveJobs ? 'No live jobs found.' : 'No active jobs found.'}
          </div>
        )}
      </div>

      {/* No title modal; jobs are identified by generated ID */}

      {/* New Job Picking Modal */}
      <Modal 
        isOpen={isNewJobModalOpen} 
        onClose={() => setIsCloseBarcodeConfirmOpen(true)} 
        title={showSearchSection ? "Search Product from Inventory" : "Add Barcode to Job"}
        size='md'
        closeOnOutsideClick={false}
      >
        <div className="space-y-4">
          
          {/* Search Toggle Button, Timer, and Calculator - Only show when search section is closed */}
          {!showSearchSection && (
            <div className="flex justify-between items-center gap-2">
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSearchSection(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-md transition-colors bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"
                  title="Show search section"
                >
                  <Search size={16} />
                  <span className="text-sm font-medium">Search Product</span>
                </button>
                
                {/* Calculator Button */}
                <Button
                  variant="secondary"
                  onClick={() => setIsCalculatorModalOpen(true)}
                  size="sm"
                  className="px-3 py-2"
                >
                  <Calculator size={16} />
                </Button>
              </div>
              
              {/* Timer Display */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-md ${
                elapsedTime >= 600 
                  ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
              }`}>
                <Clock size={16} />
                <span className="text-sm font-mono font-medium">
                  {formatTime(elapsedTime)}
                </span>
              </div>
            </div>
          )}
          
          {/* Hurry Up Alert - Show in both search and non-search modes */}
          {showHurryUpAlert && (
            <div className={`p-3 rounded-md border-l-4 ${
              isDarkMode 
                ? 'bg-red-900/20 border-red-500 text-red-200' 
                : 'bg-red-50 border-red-500 text-red-800'
            }`}>
              <div className="flex items-center gap-2">
                <div className="animate-pulse">⚠️</div>
                <span className="font-medium">
                  {elapsedTime >= 600 && elapsedTime < 900 
                    ? "Hurry up! You've been working on this job for 10+ minutes."
                    : `Time Alert: ${Math.floor(elapsedTime / 60)} minutes elapsed. Please complete the job soon.`
                  }
                </span>
                <button
                  onClick={() => setShowHurryUpAlert(false)}
                  className={`ml-auto px-2 py-1 rounded text-xs ${
                    isDarkMode 
                      ? 'bg-red-800 hover:bg-red-700 text-red-200' 
                      : 'bg-red-200 hover:bg-red-300 text-red-800'
                  }`}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
          
          {/* Search Section - Full screen when active */}
          {showSearchSection && (
            <div className="space-y-4">
                              {/* Search Header with Back Button, Timer, and Calculator */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
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
                    
                    {/* Calculator Button */}
                    <Button
                      variant="secondary"
                      onClick={() => setIsCalculatorModalOpen(true)}
                      size="sm"
                      className="px-3 py-2"
                    >
                      <Calculator size={16} />
                    </Button>
                  </div>
                  
                  {/* Timer Display */}
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-md ${
                    elapsedTime >= 600 
                      ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  }`}>
                    <Clock size={16} />
                    <span className="text-sm font-mono font-medium">
                      {formatTime(elapsedTime)}
                    </span>
                  </div>
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
                        <span>Store: {item.storeName?.toUpperCase()}</span>
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
                              
                              // Update the active session items in Firebase
                              const sessionQuery = query(
                                collection(db, 'liveJobSessions'),
                                where('createdBy', '==', user?.name),
                                where('isActive', '==', true)
                              );
                              getDocs(sessionQuery).then(sessionSnapshot => {
                                if (!sessionSnapshot.empty) {
                                  const sessionDoc = sessionSnapshot.docs[0];
                                  const currentItems = sessionDoc.data().items || [];
                                  const updatedItems = currentItems.map((item: JobItem) => 
                                    item.barcode === newJobItems[index].barcode &&
                                    item.locationCode === newJobItems[index].locationCode &&
                                    item.shelfNumber === newJobItems[index].shelfNumber
                                      ? { ...item, barcode: editingItem.barcode, quantity: newQuantity, reason: editingItem.reason || 'Unknown', storeName: editingItem.storeName || 'Unknown', name: editingItem.name || null }
                                      : item
                                  );
                                  
                                  updateDoc(doc(db, 'liveJobSessions', sessionDoc.id), {
                                    items: updatedItems
                                  });
                                }
                              }).catch(error => {
                                console.log('error', error);
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
                              Store: {item.storeName?.toUpperCase()}
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
                              
                              const itemToRemove = newJobItems[index];
                              
                              // Remove corresponding pending stock update
                              setPendingStockUpdates(prev => {
                                return prev.filter(update => 
                                  !(update.stockItem.barcode === itemToRemove.barcode &&
                                    update.locationCode === itemToRemove.locationCode &&
                                    update.shelfNumber === itemToRemove.shelfNumber)
                                );
                              });

                              // Update the active session items in Firebase
                              const sessionQuery = query(
                                collection(db, 'liveJobSessions'),
                                where('createdBy', '==', user?.name),
                                where('isActive', '==', true)
                              );
                              getDocs(sessionQuery).then(sessionSnapshot => {
                                if (!sessionSnapshot.empty) {
                                  const sessionDoc = sessionSnapshot.docs[0];
                                  const currentItems = sessionDoc.data().items || [];
                                  const updatedItems = currentItems.filter((item: JobItem) => 
                                    !(item.barcode === itemToRemove.barcode &&
                                      item.locationCode === itemToRemove.locationCode &&
                                      item.shelfNumber === itemToRemove.shelfNumber)
                                  );
                                  
                                  updateDoc(doc(db, 'liveJobSessions', sessionDoc.id), {
                                    items: updatedItems
                                  });
                                }
                              }).catch(error => {
                                console.log('error', error);
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
                  
              {/* Trolley Number Selector */}
              <div className="pt-2 space-y-2">
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Select Trolley Number <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                  {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setSelectedTrolleyNumber(num)}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        selectedTrolleyNumber === num
                          ? 'bg-blue-500 text-white hover:bg-blue-600'
                          : isDarkMode
                          ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                {!selectedTrolleyNumber && (
                  <p className={`text-xs ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                    Please select a trolley number before finishing picking
                  </p>
                )}
              </div>
                  
              {/* Finish Picking Button */}
              <div className="pt-2">
                  <Button 
                  onClick={finishNewJobPicking}
                  disabled={newJobItems.length === 0 || isJobCreationInProgress || !selectedTrolleyNumber}
                  isLoading={isJobCreationInProgress}
                  className="w-full flex items-center justify-center gap-2"
                    size="sm" 
                  >
                  <CheckSquare size={16} /> 
                  {isJobCreationInProgress ? 'Creating Job...' : 'Finish Picking'}
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

  {/* Confirm close Add Barcode modal */}
  <ConfirmationModal
    isOpen={isCloseBarcodeConfirmOpen}
    onClose={() => setIsCloseBarcodeConfirmOpen(false)}
    onConfirm={() => {
      setIsCloseBarcodeConfirmOpen(false);
      setIsNewJobModalOpen(false);
      setJobCreationStartTime(null); // Reset timer
      setElapsedTime(0); // Reset elapsed time
      setShowHurryUpAlert(false); // Reset alert state
      setLastAlertTime(0); // Reset last alert time
      setShowSearchSection(false); // Reset search section
      setSelectedTrolleyNumber(null); // Reset trolley number

      // Delete the live job session from Firebase if user closes without finishing
      const sessionQuery = query(
        collection(db, 'liveJobSessions'),
        where('createdBy', '==', user?.name),
        where('isActive', '==', true)
      );
      getDocs(sessionQuery).then(sessionSnapshot => {
        if (!sessionSnapshot.empty) {
          // Delete the document entirely since the job wasn't completed
          deleteDoc(doc(db, 'liveJobSessions', sessionSnapshot.docs[0].id));
        }
      }).catch(error => {
        console.log('error', error);
      });
    }}
    title="Close without finishing?"
    message="Are you sure you want to close? All jobs will be lost."
    confirmLabel="Yes"
    cancelLabel="No"
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

      {/* Calculator Modal */}
      <CalculatorModal
        isOpen={isCalculatorModalOpen}
        onClose={() => setIsCalculatorModalOpen(false)}
      />
    </div>
  );
};

export default Jobs;