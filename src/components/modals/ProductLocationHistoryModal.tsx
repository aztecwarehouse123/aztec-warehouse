import React, { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from './Modal';
import { format } from 'date-fns';
import { useTheme } from '../../contexts/ThemeContext';
import { db } from '../../config/firebase';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';

export interface ActivityLogEntry {
  id: string;
  user: string;
  role: string;
  detail: string;
  time: string;
}

interface ProductLocationHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  locationCode: string;
  shelfNumber: string;
}

/** Returns true if this log entry is for the given product at the given location */
function isLogForProductAtLocation(
  detail: string,
  productName: string,
  locationCode: string,
  shelfNumber: string
): boolean {
  const d = detail;
  const locDash = `${locationCode}-${shelfNumber}`;
  const locSpace = `${locationCode} - ${shelfNumber}`;
  const locFromShelf = `from location ${locationCode} shelf ${shelfNumber}`;
  const locAt = `at location ${locDash}`;
  const locFromDash = `from location ${locDash}`;

  const hasProduct = d.includes(`"${productName}"`);
  const hasLocation =
    d.includes(locFromShelf) ||
    d.includes(locAt) ||
    d.includes(locFromDash) ||
    d.includes(locDash) ||
    d.includes(locSpace) ||
    (d.includes(locationCode) && d.includes(shelfNumber));

  return hasProduct && hasLocation;
}

function getActionType(detail: string): { label: string; variant: 'addition' | 'deduction' | 'edit' | 'move' | 'other' } {
  const d = detail.toLowerCase();
  if (
    d.includes('added new product') ||
    d.includes('merged ') ||
    d.includes('restored to inventory')
  )
    return { label: 'Addition', variant: 'addition' };
  if (
    d.includes('units deducted from stock') ||
    d.includes('deleted product') ||
    d.includes('deducted from inventory') ||
    d.includes('bulk deleted')
  )
    return { label: 'Deduction', variant: 'deduction' };
  if (
    d.includes('edited product') ||
    d.includes('quantity from') ||
    d.includes('quantity to')
  )
    return { label: 'Edit', variant: 'edit' };
  if (d.includes('moved ') && d.includes(' unit'))
    return { label: 'Move', variant: 'move' };
  return { label: 'Other', variant: 'other' };
}

const ProductLocationHistoryModal: React.FC<ProductLocationHistoryModalProps> = ({
  isOpen,
  onClose,
  productName,
  locationCode,
  shelfNumber,
}) => {
  const { isDarkMode } = useTheme();
  const [logs, setLogs] = useState<ActivityLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!productName || !locationCode || !shelfNumber) return;
    setLoading(true);
    setError(null);
    try {
      const q = query(
        collection(db, 'activityLogs'),
        orderBy('time', 'desc'),
        limit(500)
      );
      const snapshot = await getDocs(q);
      const all = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<ActivityLogEntry, 'id'>),
      }));
      const filtered = all.filter((log) =>
        isLogForProductAtLocation(log.detail, productName, locationCode, shelfNumber)
      );
      setLogs(filtered);
    } catch (err) {
      console.error('Error fetching product location history:', err);
      setError('Failed to load history.');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [productName, locationCode, shelfNumber]);

  useEffect(() => {
    if (isOpen) fetchLogs();
  }, [isOpen, fetchLogs]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`History: ${productName} at ${locationCode}-${shelfNumber}`}
      size="xl"
    >
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className={`w-8 h-8 animate-spin ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
          </div>
        ) : error ? (
          <p className={`text-center py-8 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>{error}</p>
        ) : logs.length === 0 ? (
          <p className={`text-center py-8 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            No history found for this product at this location.
          </p>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-2">
            {logs.map((log) => {
              const action = getActionType(log.detail);
              const badgeClass =
                action.variant === 'addition'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                  : action.variant === 'deduction'
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                    : action.variant === 'edit'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                      : action.variant === 'move'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                        : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
              return (
                <div
                  key={log.id}
                  className={`rounded-lg border p-3 ${
                    isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badgeClass}`}
                    >
                      {action.label}
                    </span>
                    <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {log.user} ({log.role})
                    </span>
                    <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {format(new Date(log.time), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                  <p className={`text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{log.detail}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ProductLocationHistoryModal;
