import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { db } from '../../config/firebase';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, runTransaction, serverTimestamp, Timestamp, updateDoc, where, onSnapshot } from 'firebase/firestore';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import DeleteConfirmationModal from '../../components/modals/DeleteConfirmationModal';
import ConfirmationModal from '../../components/modals/ConfirmationModal';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../../components/modals/Modal';
import JobStockUpdateForm from '../../components/stock/JobStockUpdateForm';
import CalculatorModal from '../../components/modals/CalculatorModal';
import { StockItem, JobItem } from '../../types';
import type {
  Job,
  JobStatus,
  FirestoreJob,
  FirestoreJobItem,
  ActiveJobSession,
  ReportDataState,
  ProductivityDataState,
  PendingStockUpdate,
} from './types';
import { filterJobs, getUniqueJobCreators } from './utils/jobFilters';
import { computeLiveJobsSummary } from './utils/liveJobs';
import JobCard from './components/JobCard';
import type { EditingJobItemState } from './components/JobCard';
import JobsToolbar from './components/JobsToolbar';
import type { JobsViewMode } from './components/JobsToolbar';
import ArchivedJobsPanel from './components/ArchivedJobsPanel';
import LiveJobsPanel from './components/LiveJobsPanel';
import JobsReportsSection from './components/JobsReportsSection';
import JobsProductivitySection from './components/JobsProductivitySection';
import NewJobPickingModal from './components/NewJobPickingModal';
import AddBackToStockModal from './components/AddBackToStockModal';
import { mergePendingStockUpdates } from './utils/mergePendingStockUpdates';
import { WMS_ALERT_PREFIX, formatLogError } from '../../utils/wmsActivityLog';

const Jobs: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { showToast } = useToast();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isNewJobModalOpen, setIsNewJobModalOpen] = useState(false);
  const [newJobItems, setNewJobItems] = useState<JobItem[]>([]);
  const [pendingStockUpdates, setPendingStockUpdates] = useState<PendingStockUpdate[]>([]);
  const [editingItem, setEditingItem] = useState<{index: number, barcode: string, quantity: number, reason?: string, storeName?: string, name?: string | null} | null>(null);
  const [editingJobItem, setEditingJobItem] = useState<EditingJobItemState>(null);
  const [addBackToStockItem, setAddBackToStockItem] = useState<{ job: Job; itemIndex: number; item: JobItem } | null>(null);
  const [addBackToStockLoading, setAddBackToStockLoading] = useState(false);
  const [addBackQuantity, setAddBackQuantity] = useState<number>(0);
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
  /** Synchronous guard — React state updates are async, so double-clicks could still run two finishes. */
  const jobFinishInFlightRef = useRef(false);
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
  // Verification mode: only one job at a time; user cannot collapse or open another job until Complete or Stop Verifying
  const [jobIdInVerificationMode, setJobIdInVerificationMode] = useState<string | null>(null);
  // Current verification segment start (ms); used to compute elapsed when Stop or Complete
  const [verificationSegmentStartTime, setVerificationSegmentStartTime] = useState<number | null>(null);
  // Live verifying elapsed (seconds) for UI; updated every second when in verification mode
  const [verifyingElapsedSeconds, setVerifyingElapsedSeconds] = useState<number>(0);
  
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
  const [activeJobSessions, setActiveJobSessions] = useState<ActiveJobSession[]>([]);

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
  const [reportData, setReportData] = useState<ReportDataState>({
    dailyStats: [],
    userStats: [],
    verifierStats: [],
  });
  const [isLoadingReports, setIsLoadingReports] = useState(false);

  // Productivity data state
  const [productivityData, setProductivityData] = useState<ProductivityDataState>({
    workerStats: [],
    hourlyProductivity: [],
  });
  const [isLoadingProductivity, setIsLoadingProductivity] = useState(false);
  // Global jobs operation loading (hide jobs list while backend updates run)
  const [isJobsOperationInProgress, setIsJobsOperationInProgress] = useState(false);
  const [productivityDate, setProductivityDate] = useState<Date>(() => {
    const today = new Date();
    // Ensure we get the local date without timezone issues
    const year = today.getFullYear();
    const month = today.getMonth();
    const date = today.getDate();
    return new Date(year, month, date);
  });

  const filteredJobs = useMemo(
    () =>
      filterJobs(jobs, {
        showArchived,
        showCompleted,
        showLiveJobs,
        startDate,
        endDate,
        selectedUser,
        archivedJobsSearchQuery,
      }),
    [
      jobs,
      showArchived,
      showCompleted,
      showLiveJobs,
      startDate,
      endDate,
      selectedUser,
      archivedJobsSearchQuery,
    ]
  );

  const liveSummary = useMemo(
    () => computeLiveJobsSummary(jobs, activeJobSessions),
    [jobs, activeJobSessions]
  );

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

      // Generate verifier productivity stats from activity logs
      // (same source as Warehouse Operations page, so counts stay consistent)
      const verifierStats: Array<{
        name: string;
        jobsVerified: number;
        itemsVerified: number;
        avgVerifyingTime: number;
        totalVerifyingTime: number;
      }> = [];
      const verifierMap = new Map<string, { jobsVerified: number; itemsVerified: number; totalVerifyingTime: number; jobsWithTime: number }>();
      const logsQuery = query(
        collection(db, 'activityLogs'),
        where('time', '>=', startOfDay.toISOString()),
        where('time', '<=', endOfDay.toISOString()),
        orderBy('time', 'desc')
      );
      const logsSnapshot = await getDocs(logsQuery);
      logsSnapshot.forEach((logDoc) => {
        const data = logDoc.data();
        const detail = String(data.detail || '').toLowerCase();
        const role = String(data.role || '');
        const verifierName = String(data.user || '').trim();
        if (!verifierName) return;
        if (detail.includes('completed packing for job') === false) return;
        // Keep staff parity with Warehouse Operations visibility
        if (user?.role === 'staff' && role === 'admin') return;

        const current = verifierMap.get(verifierName) || {
          jobsVerified: 0,
          itemsVerified: 0,
          totalVerifyingTime: 0,
          jobsWithTime: 0
        };
        current.jobsVerified += 1;

        const itemsMatch = detail.match(/-\s*(\d+)\s*items verified/i);
        if (itemsMatch) {
          current.itemsVerified += Number(itemsMatch[1]) || 0;
        }

        const timeMatch = detail.match(/verifying time:\s*(\d+)s/i);
        if (timeMatch) {
          const seconds = Number(timeMatch[1]) || 0;
          current.totalVerifyingTime += seconds;
          current.jobsWithTime += 1;
        }

        verifierMap.set(verifierName, current);
      });

      verifierMap.forEach((stats, name) => {
        verifierStats.push({
          name,
          jobsVerified: stats.jobsVerified,
          itemsVerified: stats.itemsVerified,
          avgVerifyingTime: stats.jobsWithTime > 0 ? stats.totalVerifyingTime / stats.jobsWithTime : 0,
          totalVerifyingTime: stats.totalVerifyingTime
        });
      });

      // Sort verifier stats by jobs verified (descending)
      verifierStats.sort((a, b) => b.jobsVerified - a.jobsVerified);

      setReportData({ dailyStats, userStats, verifierStats });
      
      // Add a small delay to make loading more visible
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('Reports generation completed');
    } catch (error) {
      console.log('error', error);
      showToast('Failed to generate reports', 'error');
    } finally {
      setIsLoadingReports(false);
    }
  }, [jobs, showToast, user?.role]);

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

  /** Activity log line shown in red on Warehouse Operations; does not require user. */
  const logWmsAlert = async (detail: string) => {
    try {
      await addDoc(collection(db, 'activityLogs'), {
        user: user?.name ?? 'System',
        role: user?.role ?? 'system',
        detail,
        time: new Date().toISOString(),
      });
    } catch (e) {
      console.error('Failed to write WMS alert log', e);
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
          verifyingTimeAccumulated: data.verifyingTimeAccumulated ?? 0,
          verifyingTime: data.verifyingTime ?? null,
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

  // Function to toggle job expansion (only one job open at a time). Lock: cannot expand another or collapse current when in verification mode.
  const toggleJobExpansion = (jobId: string) => {
    if (jobIdInVerificationMode !== null && jobIdInVerificationMode !== jobId) {
      showToast('Finish or stop verifying the current job first.', 'warning');
      return;
    }
    if (jobIdInVerificationMode === jobId) {
      showToast('Stop verifying or complete the job to close.', 'info');
      return;
    }
    setExpandedJobs(prev => {
      if (prev.has(jobId)) {
        const newSet = new Set(prev);
        newSet.delete(jobId);
        return newSet;
      }
      return new Set([jobId]);
    });
  };

  const startVerification = (job: Job) => {
    setJobIdInVerificationMode(job.id);
    setVerificationSegmentStartTime(Date.now());
    setVerifyingElapsedSeconds(0);
    setExpandedJobs(new Set([job.id]));
  };

  const stopVerification = async (job: Job) => {
    const segmentSeconds = verificationSegmentStartTime
      ? Math.floor((Date.now() - verificationSegmentStartTime) / 1000)
      : 0;
    setVerificationSegmentStartTime(null);
    setJobIdInVerificationMode(null);
    setVerifyingElapsedSeconds(0);
    try {
      const newAccumulated = (job.verifyingTimeAccumulated ?? 0) + segmentSeconds;
      await updateDoc(doc(db, 'jobs', job.id), {
        verifyingTimeAccumulated: newAccumulated,
      });
      showToast('Verifying paused. You can resume by clicking Verify Items again.', 'success');
      fetchJobs();
    } catch (e) {
      console.error('Stop verification error:', e);
      showToast('Failed to pause verifying time', 'error');
      fetchJobs();
    }
  };

  // Live verifying timer: update every second when in verification mode
  useEffect(() => {
    if (!jobIdInVerificationMode || verificationSegmentStartTime === null) return;
    const interval = setInterval(() => {
      const job = jobs.find(j => j.id === jobIdInVerificationMode);
      const accumulated = job?.verifyingTimeAccumulated ?? 0;
      const currentSegment = Math.floor((Date.now() - verificationSegmentStartTime) / 1000);
      setVerifyingElapsedSeconds(accumulated + currentSegment);
    }, 1000);
    return () => clearInterval(interval);
  }, [jobIdInVerificationMode, verificationSegmentStartTime, jobs]);

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
    if (jobFinishInFlightRef.current) {
      showToast(
        'This job is already being saved. Please wait—extra taps are ignored so stock is not counted twice.',
        'warning'
      );
      return;
    }
    // Lock immediately so two fast taps cannot both pass validation before React disables the button.
    jobFinishInFlightRef.current = true;
    try {
      if (newJobItems.length === 0) {
        showToast('Add at least one item to create a job', 'error');
        return;
      }
      if (pendingStockUpdates.length === 0) {
        showToast('Stock deductions are out of sync. Close the modal and re-add items from inventory.', 'error');
        return;
      }
      if (selectedTrolleyNumber == null) {
        showToast('Please select a trolley number', 'error');
        return;
      }

      setIsJobCreationInProgress(true);
      setIsLoading(true);
      setIsJobsOperationInProgress(true);

      const numericId = Date.now().toString();
      const merged = mergePendingStockUpdates(pendingStockUpdates);
      const jobRef = doc(collection(db, 'jobs'));

      type StockResult = {
        merged: (typeof merged)[0];
        qtyBefore: number;
        qtyAfter: number;
      };
      let stockResults: StockResult[] = [];

      await runTransaction(db, async (transaction) => {
        stockResults = [];
        for (const m of merged) {
          const stockRef = doc(db, 'inventory', m.stockItemId);
          const stockSnap = await transaction.get(stockRef);
          if (!stockSnap.exists()) {
            throw new Error(`Stock item not found for id ${m.stockItemId}`);
          }
          const quantityBefore = Number(stockSnap.data()?.quantity ?? 0);
          const quantityAfter = quantityBefore - m.totalDeducted;
          if (quantityAfter < 0) {
            throw new Error(
              `Insufficient stock for "${m.stockItem.name}" (${m.stockItemId}): deduct ${m.totalDeducted} from ${quantityBefore} units`
            );
          }
          stockResults.push({ merged: m, qtyBefore: quantityBefore, qtyAfter: quantityAfter });
        }

        transaction.set(jobRef, {
          jobId: numericId,
          createdAt: serverTimestamp(),
          createdBy: user?.name || 'Unknown',
          status: 'awaiting_pack' as JobStatus,
          picker: user?.name || null,
          packer: null,
          items: newJobItems,
          pickingTime: elapsedTime,
          trolleyNumber: selectedTrolleyNumber,
          docId: jobRef.id,
        });

        for (const r of stockResults) {
          transaction.update(doc(db, 'inventory', r.merged.stockItemId), {
            quantity: r.qtyAfter,
            lastUpdated: serverTimestamp(),
          });
        }
      });

      for (const r of stockResults) {
        const rep = r.merged.representative;
        await addDoc(collection(db, 'activityLogs'), {
          detail: `${r.merged.totalDeducted} units deducted from stock "${r.merged.stockItem.name}" (Reason: ${rep.reason}, Store: ${rep.storeName}) by ${user?.role} from location ${rep.locationCode} shelf ${rep.shelfNumber} — Quantity before: ${r.qtyBefore}, Quantity after: ${r.qtyAfter}`,
          time: new Date().toISOString(),
          user: user?.name,
          role: user?.role,
        });
      }

      await logActivity(
        `created new job ${numericId} with ${newJobItems.length} items (${newJobItems.reduce((sum, item) => sum + item.quantity, 0)} total units)`
      );

      showToast(`Job ${numericId} created and awaiting pack`, 'success');
      setIsNewJobModalOpen(false);
      setNewJobItems([]);
      setPendingStockUpdates([]);
      setManualBarcode('');
      setJobCreationStartTime(null);
      setElapsedTime(0);
      setShowHurryUpAlert(false);
      setLastAlertTime(0);
      setSelectedTrolleyNumber(null);

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
      console.error('finishNewJobPicking', e);
      const errStr = formatLogError(e);
      await logWmsAlert(
        `${WMS_ALERT_PREFIX} Job creation failed while finishing picking. Error: (${errStr}) | Correction applied: Single atomic Firestore transaction — no inventory was deducted and no job document was created (all-or-nothing). Rapid double-clicks are ignored via an in-app lock. If this keeps happening, check network connectivity and Firestore security rules.`
      );
      showToast('Failed to create job', 'error');
    } finally {
      jobFinishInFlightRef.current = false;
      setIsLoading(false);
      setIsJobCreationInProgress(false);
      setIsJobsOperationInProgress(false);
    }
  };

  const completePicking = async (job: Job) => {
    // Prevent duplicate completions
    if (completingJobs.has(job.id)) {
      return;
    }

    // Set loading state
    setCompletingJobs(prev => new Set(prev).add(job.id));
     setIsJobsOperationInProgress(true);

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
      setIsJobsOperationInProgress(false);
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
    setIsJobsOperationInProgress(true);

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
      
      // Compute final verifying time (current segment + accumulated)
      const segmentSeconds = verificationSegmentStartTime && jobIdInVerificationMode === job.id
        ? Math.floor((Date.now() - verificationSegmentStartTime) / 1000)
        : 0;
      const totalVerifyingTime = (job.verifyingTimeAccumulated ?? 0) + segmentSeconds;
      setVerificationSegmentStartTime(null);
      setJobIdInVerificationMode(prev => (prev === job.id ? null : prev));

      // Update the job in database with all verified items and verifying time
      await updateDoc(jobDocRef, { 
        status: 'completed', 
        packer: user?.name || job.packer || null,
        items: updatedItems,
        verifyingTime: totalVerifyingTime,
      });
      
      await logActivity(  
        `completed packing for job ${job.jobId} with ${job.items.length} items (${job.items.reduce((sum, item) => sum + item.quantity, 0)} total units) - ${totalVerifiedCount} items verified (verifying time: ${totalVerifyingTime}s)`
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
      setIsJobsOperationInProgress(false);
    }
  };

  const requestDeleteJob = (job: Job) => {
    setJobToDelete(job);
  };

  const confirmDeleteJob = async () => {
    if (!jobToDelete) return;
    try {
      setIsJobsOperationInProgress(true);
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
    } finally {
      setIsJobsOperationInProgress(false);
    }
  };

  const updateJobItem = async (job: Job, itemIndex: number, newBarcode: string, newQuantity: number) => {
    try {
      setIsJobsOperationInProgress(true);
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
    } finally {
      setIsJobsOperationInProgress(false);
    }
  };

  const confirmAddBackToStock = async () => {
    if (!addBackToStockItem || !user) return;
    const { job, itemIndex, item } = addBackToStockItem;
    const maxQty = item.quantity;
    const qtyToReturn = Math.max(1, Math.min(addBackQuantity || maxQty, maxQty));
    setAddBackToStockLoading(true);
    try {
      setIsJobsOperationInProgress(true);
      let stockRef: ReturnType<typeof doc> | null = null;

      if (item.stockItemId) {
        const stockDocRef = doc(db, 'inventory', item.stockItemId);
        const stockSnap = await getDoc(stockDocRef);
        if (stockSnap.exists()) {
          stockRef = stockDocRef;
        }
      }
      if (!stockRef) {
        const q = query(collection(db, 'inventory'), where('barcode', '==', item.barcode));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
          showToast(`Stock record not found for barcode ${item.barcode}`, 'error');
          return;
        }
        const target = item.locationCode && item.shelfNumber
          ? snapshot.docs.find(d => d.data().locationCode === item.locationCode && d.data().shelfNumber === item.shelfNumber)
          : snapshot.docs[0];
        const docToUse = target ?? snapshot.docs[0];
        stockRef = doc(db, 'inventory', docToUse.id);
      }

      let currentQuantity = 0;
      let newQuantity = 0;
      // Atomic stock add-back to avoid race conditions
      await runTransaction(db, async (transaction) => {
        const stockSnap = await transaction.get(stockRef!);
        if (!stockSnap.exists()) {
          throw new Error(`Stock item not found for add-back (${item.barcode})`);
        }
        currentQuantity = Number(stockSnap.data()?.quantity ?? 0);
        newQuantity = currentQuantity + qtyToReturn;
        transaction.update(stockRef!, {
          quantity: newQuantity,
          lastUpdated: serverTimestamp()
        });
      });

      const updatedItems: JobItem[] = qtyToReturn >= item.quantity
        ? job.items.filter((_, index) => index !== itemIndex)
        : job.items.map((jobItem, index) =>
            index === itemIndex
              ? { ...jobItem, quantity: jobItem.quantity - qtyToReturn }
              : jobItem
          );

      if (updatedItems.length === 0) {
        await deleteDoc(doc(db, 'jobs', job.id));
        await logActivity(
          `deleted job ${job.jobId} (empty — last item returned to stock)`
        );
        await logActivity(
          `added ${qtyToReturn} unit(s) back to stock for "${item.name || item.barcode}" (barcode: ${item.barcode}) from job ${job.jobId} — Reason: ${item.reason}, Store: ${item.storeName}${item.locationCode && item.shelfNumber ? `, Location: ${item.locationCode}-${item.shelfNumber}` : ''} — Quantity before: ${currentQuantity}, Quantity after: ${newQuantity}`
        );
        setLocallyVerifiedItems(prev => {
          const next = new Set(prev);
          job.items.forEach(i => next.delete(`${job.id}-${i.barcode}`));
          return next;
        });
        if (jobIdInVerificationMode === job.id) {
          setJobIdInVerificationMode(null);
          setVerificationSegmentStartTime(null);
        }
        showToast(`${qtyToReturn} unit(s) added back to stock. Job ${job.jobId} deleted (no items left).`, 'success');
      } else {
        await updateDoc(doc(db, 'jobs', job.id), { items: updatedItems });
        await logActivity(
          `added ${qtyToReturn} unit(s) back to stock for "${item.name || item.barcode}" (barcode: ${item.barcode}) from job ${job.jobId} — Reason: ${item.reason}, Store: ${item.storeName}${item.locationCode && item.shelfNumber ? `, Location: ${item.locationCode}-${item.shelfNumber}` : ''} — Quantity before: ${currentQuantity}, Quantity after: ${newQuantity}`
        );
        setLocallyVerifiedItems(prev => {
          const next = new Set(prev);
          next.delete(`${job.id}-${item.barcode}`);
          return next;
        });
        showToast(`${qtyToReturn} unit(s) added back to stock`, 'success');
      }
      setAddBackToStockItem(null);
      setAddBackQuantity(0);
      fetchJobs();
    } catch (e) {
      console.error('Add back to stock error:', e);
      showToast('Failed to add item back to stock', 'error');
    } finally {
      setAddBackToStockLoading(false);
      setIsJobsOperationInProgress(false);
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

  const jobsViewMode: JobsViewMode = showArchived
    ? 'archived'
    : showCompleted
      ? 'completed'
      : showLiveJobs
        ? 'live'
        : showReports
          ? 'reports'
          : showProductivity
            ? 'productivity'
            : 'active';

  const handleSetJobsView = (mode: JobsViewMode) => {
    setShowCompleted(false);
    setShowArchived(false);
    setShowLiveJobs(false);
    setShowReports(false);
    setShowProductivity(false);
    if (mode === 'archived') {
      setShowArchived(true);
      setDateRangeToYesterdayToToday();
    } else if (mode === 'completed') {
      setShowCompleted(true);
    } else if (mode === 'live') {
      setShowLiveJobs(true);
    } else if (mode === 'reports') {
      setShowReports(true);
    } else if (mode === 'productivity') {
      setShowProductivity(true);
    }
  };

  return (
    <div className="space-y-6">
      <JobsToolbar
        isDarkMode={isDarkMode}
        viewMode={jobsViewMode}
        isLoading={isLoading}
        userRole={user?.role}
        onRefresh={fetchJobs}
        onNewJob={openNewJobModal}
        onSetView={handleSetJobsView}
      />

      <ArchivedJobsPanel
        isDarkMode={isDarkMode}
        showArchived={showArchived}
        archivedJobsSearchQuery={archivedJobsSearchQuery}
        onArchivedSearchChange={setArchivedJobsSearchQuery}
        selectedUser={selectedUser}
        onSelectedUserChange={setSelectedUser}
        uniqueUsers={getUniqueJobCreators(jobs)}
        startDate={startDate}
        endDate={endDate}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onClearDateRange={clearDateRange}
        onClearAllFilters={clearAllFilters}
        filteredJobCount={filteredJobs.length}
      />

      <div className="space-y-4">
        {!showReports && !showProductivity && (
          <>
            {isLoading || isJobsOperationInProgress ? (
              <div className="flex items-center justify-center py-16">
                <div className="flex flex-col items-center gap-3">
                  <RefreshCw className="animate-spin text-blue-500" size={24} />
                  <p className={`${isDarkMode ? 'text-slate-300' : 'text-slate-600'} text-sm`}>
                    Updating jobs, please wait...
                  </p>
                </div>
              </div>
            ) : (
              filteredJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  isDarkMode={isDarkMode}
                  showCompleted={showCompleted}
                  showArchived={showArchived}
                  isExpanded={expandedJobs.has(job.id)}
                  onToggleExpand={toggleJobExpansion}
                  jobIdInVerificationMode={jobIdInVerificationMode}
                  verifyingElapsedSeconds={verifyingElapsedSeconds}
                  onStartVerification={startVerification}
                  onStopVerification={stopVerification}
                  onRefreshJobs={fetchJobs}
                  onRequestDeleteJob={requestDeleteJob}
                  completingJobs={completingJobs}
                  onCompletePicking={completePicking}
                  onCompletePacking={completePacking}
                  onOpenStockUpdateModal={() => setIsStockUpdateModalOpen(true)}
                  locallyVerifiedItems={locallyVerifiedItems}
                  editingJobItem={editingJobItem}
                  setEditingJobItem={setEditingJobItem}
                  onUpdateJobItem={updateJobItem}
                  onVerifyItem={verifyItem}
                  verifyingItems={verifyingItems}
                  onOpenAddBackToStock={(j, itemIndex, item) => {
                    setAddBackToStockItem({ job: j, itemIndex, item });
                    setAddBackQuantity(item.quantity);
                  }}
                />
              ))
            )}
          </>
        )}

        <LiveJobsPanel
          isDarkMode={isDarkMode}
          showLiveJobs={showLiveJobs}
          uiSessions={liveSummary.uiSessions}
          totalLiveCount={liveSummary.totalCount}
          onRefresh={() => {
            fetchJobs();
            cleanupOldLiveJobSessions();
          }}
        />

        {showReports && user?.role !== 'staff' && (
          <JobsReportsSection
            isDarkMode={isDarkMode}
            reportDate={reportDate}
            setReportDate={setReportDate}
            generateReports={generateReports}
            isLoadingReports={isLoadingReports}
            reportData={reportData}
            jobs={jobs}
            dateRange={dateRange}
            setDateRange={setDateRange}
            selectedUserForChart={selectedUserForChart}
            setSelectedUserForChart={setSelectedUserForChart}
          />
        )}

        {showProductivity && (
          <JobsProductivitySection
            isDarkMode={isDarkMode}
            productivityDate={productivityDate}
            setProductivityDate={setProductivityDate}
            generateProductivityData={generateProductivityData}
            isLoadingProductivity={isLoadingProductivity}
            productivityData={productivityData}
          />
        )}

        {!showReports &&
          !showProductivity &&
          !isLoading &&
          !isJobsOperationInProgress &&
          filteredJobs.length === 0 &&
          liveSummary.uiSessions.length === 0 && (
            <div className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} text-center py-8`}>
              {showArchived ? (
                <div className="space-y-2">
                  <p>No archived jobs found.</p>
                  {(startDate || endDate || selectedUser !== 'all' || archivedJobsSearchQuery.trim()) && (
                    <p className="text-sm">Try adjusting your filters or clearing them to see more results.</p>
                  )}
                </div>
              ) : showCompleted ? (
                'No completed jobs found.'
              ) : showLiveJobs ? (
                'No live jobs found.'
              ) : (
                'No active jobs found.'
              )}
            </div>
          )}
      </div>

      {/* No title modal; jobs are identified by generated ID */}

      <NewJobPickingModal
        isOpen={isNewJobModalOpen}
        onRequestClose={() => setIsCloseBarcodeConfirmOpen(true)}
        isDarkMode={isDarkMode}
        showSearchSection={showSearchSection}
        setShowSearchSection={setShowSearchSection}
        setIsCalculatorModalOpen={setIsCalculatorModalOpen}
        elapsedTime={elapsedTime}
        showHurryUpAlert={showHurryUpAlert}
        setShowHurryUpAlert={setShowHurryUpAlert}
        searchType={searchType}
        setSearchType={setSearchType}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchResults={searchResults}
        isSearching={isSearching}
        searchInventory={searchInventory}
        manualBarcode={manualBarcode}
        setManualBarcode={setManualBarcode}
        handleManualBarcodeSubmit={handleManualBarcodeSubmit}
        newJobItems={newJobItems}
        setNewJobItems={setNewJobItems}
        editingItem={editingItem}
        setEditingItem={setEditingItem}
        setPendingStockUpdates={setPendingStockUpdates}
        userName={user?.name}
        selectedTrolleyNumber={selectedTrolleyNumber}
        setSelectedTrolleyNumber={setSelectedTrolleyNumber}
        finishNewJobPicking={finishNewJobPicking}
        isJobCreationInProgress={isJobCreationInProgress}
      />

      <AddBackToStockModal
        isOpen={!!addBackToStockItem}
        isDarkMode={isDarkMode}
        item={addBackToStockItem}
        quantity={addBackQuantity}
        onQuantityChange={setAddBackQuantity}
        loading={addBackToStockLoading}
        onClose={() => {
          setAddBackToStockItem(null);
          setAddBackQuantity(0);
        }}
        onConfirm={confirmAddBackToStock}
      />

      {/* Delete confirmation modal */}
      <DeleteConfirmationModal
        isOpen={!!jobToDelete}
        onClose={() => setJobToDelete(null)}
        onConfirm={confirmDeleteJob}
        title="Delete Job"
        message={jobToDelete ? `Are you sure you want to delete Job ${jobToDelete.jobId}? This action cannot be undone. Deleting this job will not add the items back to stock.` : ''}
        isLoading={false}
      />

      {/* Confirm close Add Barcode modal */}
      <ConfirmationModal
        isOpen={isCloseBarcodeConfirmOpen}
        onClose={() => setIsCloseBarcodeConfirmOpen(false)}
        onConfirm={() => {
          setIsCloseBarcodeConfirmOpen(false);
          setIsNewJobModalOpen(false);
          setJobCreationStartTime(null);
          setElapsedTime(0);
          setShowHurryUpAlert(false);
          setLastAlertTime(0);
          setShowSearchSection(false);
          setSelectedTrolleyNumber(null);

          const sessionQuery = query(
            collection(db, 'liveJobSessions'),
            where('createdBy', '==', user?.name),
            where('isActive', '==', true)
          );
          getDocs(sessionQuery).then((sessionSnapshot) => {
            if (!sessionSnapshot.empty) {
              deleteDoc(doc(db, 'liveJobSessions', sessionSnapshot.docs[0].id));
            }
          }).catch((error) => {
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