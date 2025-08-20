import React, { useCallback, useEffect, useState } from 'react';
import { Plus, RefreshCw, Barcode, CheckSquare, ClipboardList, Trash2 } from 'lucide-react';
import { db } from '../../config/firebase';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy, query, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import Button from '../../components/ui/Button';
import Modal from '../../components/modals/Modal';
import DeleteConfirmationModal from '../../components/modals/DeleteConfirmationModal';
import BarcodeScanModal from '../../components/modals/BarcodeScanModal';
import { useAuth } from '../../contexts/AuthContext';
import Input from '../../components/ui/Input'; // Import the Input component

type JobStatus = 'picking' | 'awaiting_pack' | 'completed';

type JobItem = {
  barcode: string;
  name?: string | null;
  asin?: string | null;
  quantity: number;
  verified: boolean; // set by packer
};

type Job = {
  id: string;
  jobId: string; // same as id, for display
  createdAt: Date;
  createdBy: string;
  status: JobStatus;
  picker?: string | null;
  packer?: string | null;
  items: JobItem[];
};

type FirestoreJobItem = {
  barcode?: string;
  name?: string | null;
  asin?: string | null;
  quantity?: number;
  verified?: boolean;
};

type FirestoreJob = {
  jobId?: string;
  createdAt?: Timestamp | Date | string;
  createdBy?: string;
  status?: JobStatus;
  picker?: string | null;
  packer?: string | null;
  items?: FirestoreJobItem[];
};

const Jobs: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { showToast } = useToast();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [isNewJobModalOpen, setIsNewJobModalOpen] = useState(false);
  const [newJobItems, setNewJobItems] = useState<JobItem[]>([]);
  const [isNewJobScanOpen, setIsNewJobScanOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [manualBarcode, setManualBarcode] = useState(''); // State for manual barcode input

  const filteredJobs = jobs.filter(job =>
    showCompleted ? job.status === 'completed' : job.status !== 'completed'
  );

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

  const fetchJobs = useCallback(async () => {
    setIsLoading(true);
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
          })) : [],
        };
      });
      setJobs(list);
    } catch (e) {
      console.error(e);
      showToast('Failed to fetch jobs', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const openNewJobModal = () => {
    setNewJobItems([]);
    setManualBarcode(''); // Reset manual barcode input
    setIsNewJobModalOpen(true);
  };

  const onNewJobBarcodeScanned = (barcode: string) => {
    addBarcodeToJob(barcode);
    setIsNewJobScanOpen(false);
  };

  const addBarcodeToJob = (barcode: string) => {
    setNewJobItems(prev => {
      const idx = prev.findIndex(i => i.barcode === barcode);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], quantity: copy[idx].quantity + 1 };
        return copy;
      }
      return [...prev, { barcode, quantity: 1, verified: false }];
    });
  };

  const handleManualBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      addBarcodeToJob(manualBarcode.trim());
      setManualBarcode(''); // Clear the input after adding
    }
  };

  const finishNewJobPicking = async () => {
    if (newJobItems.length === 0) {
      showToast('Scan at least one item', 'error');
      return;
    }
    setIsLoading(true);
    try {
      const numericId = Date.now().toString(); 

      const ref = await addDoc(collection(db, 'jobs'), {
        jobId: numericId,
        createdAt: serverTimestamp(),
        createdBy: user?.name || 'Unknown',
        status: 'awaiting_pack' as JobStatus,
        picker: user?.name || null,
        packer: null,
        items: newJobItems,
      });
      await updateDoc(ref, { docId: ref.id });
      
      // Add activity log
      await logActivity(
        `created new job ${numericId} with ${newJobItems.length} items (${newJobItems.reduce((sum, item) => sum + item.quantity, 0)} total units)`
      );

      showToast(`Job ${numericId} created and awaiting pack`, 'success');
      setIsNewJobModalOpen(false);
      setNewJobItems([]);
      fetchJobs();
    } catch (e) {
      console.error(e);
      showToast('Failed to create job', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const onBarcodeScanned = async (barcode: string) => {
    if (!activeJobId) return;
    try {
      const jobRef = doc(db, 'jobs', activeJobId);
      const snap = await getDoc(jobRef);
      if (!snap.exists()) return;
      const data = snap.data() as FirestoreJob;
      const items: JobItem[] = Array.isArray(data.items) ? data.items.map((it: FirestoreJobItem) => ({
        barcode: String(it.barcode || ''),
        name: it.name ?? null,
        asin: it.asin ?? null,
        quantity: Number(it.quantity || 1),
        verified: Boolean(it.verified),
      })) : [];
      const idx = items.findIndex(i => i.barcode === barcode);
      if (idx >= 0) {
        items[idx] = { ...items[idx], quantity: (items[idx].quantity || 0) + 1 };
      } else {
        // We only store minimal product info for speed
        items.push({ barcode, quantity: 1, verified: false });
      }
      await updateDoc(jobRef, { items });
      showToast('Scanned added to job', 'success');
      setIsScanModalOpen(false);
      fetchJobs();
    } catch (e) {
      console.error(e);
      showToast('Failed adding scan to job', 'error');
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

  const verifyItem = async (job: Job, barcode: string, verified: boolean, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    try {
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
      })) : [];
      const idx = items.findIndex(i => i.barcode === barcode);
      if (idx >= 0) {
        items[idx] = { ...items[idx], verified };
        await updateDoc(jobRef, { items });
        setJobs(prev => prev.map(j => j.id === job.id ? { ...j, items: items } : j));
      }
        
      // fetchJobs();
    } catch { showToast('Failed to verify item', 'error'); }
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

  const JobRow: React.FC<{ job: Job }> = ({ job }) => {
    const isAwaitingPack = job.status === 'awaiting_pack';
    const isPicking = job.status === 'picking';
    const isCompleted = job.status === 'completed';
    return (
      <div className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} rounded-lg shadow-sm border`}>        
        <div className={`p-3 sm:p-4 border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
        <div className={`${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'} p-1 sm:p-2 rounded-lg`}>
                <ClipboardList className={`${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} size={18} />
              </div>

              {/*  */}
              <div>
              <h3 className={`text-base sm:text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Job {job.jobId}</h3>
              <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} text-xs`}>Created by {job.createdBy} • {job.createdAt.toLocaleString()}</p>
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
        <div className="p-3 sm:p-4 space-y-3">
          <div className="flex items-center gap-2">
            {isPicking && (
              <Button onClick={() => { setActiveJobId(job.id); setIsScanModalOpen(true); }} className="flex items-center gap-1" size='sm'>
                <Barcode size={14} /> Scan
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {job.items.map(it => ( 
              <div key={it.barcode} className={`flex items-center justify-between p-2 rounded ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}>
                <div className="flex-1 min-w-0">
                  <div className={`${isDarkMode ? 'text-white' : 'text-slate-800'} text-sm font-medium truncate`}>{it.barcode}</div>
                  <div className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} text-xs`}>Qty: {it.quantity}</div>
                </div>
                {isAwaitingPack && (
                  <label className={`flex items-center gap-2 text-sm cursor-pointer ${isDarkMode? 'text-white': 'text-slate-700'}`}>
                    <input 
                      type="checkbox" 
                      checked={it.verified} 
                      onChange={e => verifyItem(job, it.barcode, e.target.checked, e as unknown as React.MouseEvent<Element>)} 
                      onClick={e => e.stopPropagation()}
                      className='w-4 h-4'
                    />
                     <span className="sm:inline hidden">Verify</span>
                  </label>
                )}
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
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      <h1 className={`text-xl sm:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{showCompleted ? 'Completed' : 'Active'} Jobs</h1>
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
            
            variant={showCompleted ? "primary" : "secondary"} 
            onClick={() => setShowCompleted(!showCompleted)}
            size='sm'
          >
            {showCompleted ? "Show Active Jobs" : "Show Completed Jobs"}
          </Button>

        </div>
      </div>

      <div className="space-y-4">
        {filteredJobs.map(job => (
          <JobRow key={job.id} job={job} />
        ))}
        {jobs.length === 0 && (
          <div className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{showCompleted ? 'No completed jobs.' : 'No active jobs.'}</div>
        )}
      </div>

      {/* No title modal; jobs are identified by generated ID */}

      <BarcodeScanModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        onBarcodeScanned={onBarcodeScanned}
      />

      {/* New Job Picking Modal */}
      <Modal 
        isOpen={isNewJobModalOpen} 
        onClose={() => setIsNewJobModalOpen(false)} 
        title="Start Picking"
        size='sm'
      >
        <div className="space-y-4">
          {/* Barcode Input Field */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
              Barcode
            </label>
            <form onSubmit={handleManualBarcodeSubmit} className="flex gap-2">
              <Input
                name="manualBarcode"
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

          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              onClick={() => setIsNewJobScanOpen(true)} 
              className="flex items-center gap-1 justify-center"
              size='sm'
            >
              <Barcode size={16} /> Scan Item
            </Button>
            <Button 
              onClick={finishNewJobPicking} 
              disabled={newJobItems.length === 0} 
              className="flex items-center gap-1 justify-center"
              size='sm'
            >
              <CheckSquare size={16} /> Finish Picking
            </Button>
          </div>
          
          <div className="max-h-64 overflow-auto space-y-2">
            {newJobItems.map(it => (
              <div key={it.barcode} className={`flex items-center justify-between p-2 rounded ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
                <div className="text-sm truncate flex-1">{it.barcode}</div>
                <div className="text-xs">Qty: {it.quantity}</div>
              </div>
            ))}
            {newJobItems.length === 0 && (
              <div className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} text-sm text-center py-4`}>No items scanned yet.</div>
            )}
          </div>
        </div>
      </Modal>

      <BarcodeScanModal
        isOpen={isNewJobScanOpen}
        onClose={() => setIsNewJobScanOpen(false)}
        onBarcodeScanned={onNewJobBarcodeScanned}
      />

      {/* Delete confirmation modal */}
      <DeleteConfirmationModal
        isOpen={!!jobToDelete}
        onClose={() => setJobToDelete(null)}
        onConfirm={confirmDeleteJob}
        title="Delete Job"
        message={jobToDelete ? `Are you sure you want to delete Job ${jobToDelete.jobId}? This action cannot be undone.` : ''}
        isLoading={false}
      />
    </div>
  );
};

export default Jobs;