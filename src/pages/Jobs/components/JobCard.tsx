import React from 'react';
import { ClipboardList, ChevronUp, ChevronDown, CheckSquare, RefreshCw, Trash2, Undo2 } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import type { Job } from '../types';
import { formatElapsedTime } from '../utils/formatters';

export type EditingJobItemState = {
  jobId: string;
  itemIndex: number;
  barcode: string;
  quantity: number;
  locationCode?: string;
  shelfNumber?: string;
  reason?: string;
  storeName?: string;
} | null;

export type JobCardProps = {
  job: Job;
  isDarkMode: boolean;
  showCompleted: boolean;
  showArchived: boolean;
  isExpanded: boolean;
  onToggleExpand: (jobId: string) => void;
  jobIdInVerificationMode: string | null;
  verifyingElapsedSeconds: number;
  onStartVerification: (job: Job) => void;
  onStopVerification: (job: Job) => void;
  onRefreshJobs: () => void;
  onRequestDeleteJob: (job: Job) => void;
  completingJobs: Set<string>;
  onCompletePicking: (job: Job) => void;
  onCompletePacking: (job: Job) => void;
  onOpenStockUpdateModal: () => void;
  locallyVerifiedItems: Set<string>;
  editingJobItem: EditingJobItemState;
  setEditingJobItem: React.Dispatch<React.SetStateAction<EditingJobItemState>>;
  onUpdateJobItem: (job: Job, itemIndex: number, newBarcode: string, newQuantity: number) => void;
  onVerifyItem: (job: Job, barcode: string, verified: boolean) => void;
  verifyingItems: Set<string>;
  onOpenAddBackToStock: (job: Job, itemIndex: number, item: Job['items'][number]) => void;
};

const JobCard: React.FC<JobCardProps> = ({
  job,
  isDarkMode,
  showCompleted,
  showArchived,
  isExpanded,
  onToggleExpand,
  jobIdInVerificationMode,
  verifyingElapsedSeconds,
  onStartVerification,
  onStopVerification,
  onRefreshJobs,
  onRequestDeleteJob,
  completingJobs,
  onCompletePicking,
  onCompletePacking,
  onOpenStockUpdateModal,
  locallyVerifiedItems,
  editingJobItem,
  setEditingJobItem,
  onUpdateJobItem,
  onVerifyItem,
  verifyingItems,
  onOpenAddBackToStock,
}) => {
  const isAwaitingPack = job.status === 'awaiting_pack';
  const isPicking = job.status === 'picking';
  const isCompleted = job.status === 'completed';

  return (
    <div
      className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} rounded-lg shadow-sm border`}
    >
      <div className={`p-3 sm:p-4 border-b ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className={`${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'} p-2 rounded-lg flex-shrink-0`}>
                <ClipboardList className={`${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} size={18} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                  <h3
                    className={`text-base sm:text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'} break-all`}
                  >
                    Job {job.jobId}
                  </h3>
                  <button
                    type="button"
                    onClick={() => onToggleExpand(job.id)}
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

                {(showCompleted || showArchived) && job.packer && (
                  <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} text-xs leading-relaxed`}>
                    Verified by {job.packer}
                    {job.verifyingTime != null && job.verifyingTime > 0 && (
                      <span className={`ml-2 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        • Verifying: {formatElapsedTime(job.verifyingTime)}
                      </span>
                    )}
                  </p>
                )}

                {!isExpanded && job.items.length > 0 && (
                  <div className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} text-xs mt-2`}>
                    {job.items.length} item{job.items.length !== 1 ? 's' : ''} • Total Qty:{' '}
                    {job.items.reduce((sum, item) => sum + item.quantity, 0)}
                    {isAwaitingPack && (
                      <span className="ml-2">
                        • Verified:{' '}
                        {
                          job.items.filter(
                            (item) =>
                              item.verified || locallyVerifiedItems.has(`${job.id}-${item.barcode}`)
                          ).length
                        }
                        /{job.items.length}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  isCompleted
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                    : isAwaitingPack
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                }`}
              >
                {isCompleted ? 'Completed' : isAwaitingPack ? 'Awaiting Pack' : 'Picking'}
              </span>
              {isAwaitingPack &&
                (jobIdInVerificationMode === job.id ? (
                  <>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded ${
                        isDarkMode ? 'text-slate-300 bg-slate-700' : 'text-slate-700 bg-slate-200'
                      }`}
                    >
                      Verifying: {formatElapsedTime(verifyingElapsedSeconds)}
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onStopVerification(job)}
                      className="h-8 px-2 text-xs"
                    >
                      Stop Verifying
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => onStartVerification(job)}
                    className="h-8 px-2 text-xs bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    Verify Items
                  </Button>
                ))}
              <Button variant="secondary" onClick={onRefreshJobs} size="sm" className="h-8 w-8 p-0">
                <RefreshCw size={14} />
              </Button>
              <Button variant="danger" onClick={() => onRequestDeleteJob(job)} size="sm" className="h-8 w-8 p-0">
                <Trash2 size={14} />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-3 sm:p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {isPicking && (
              <Button onClick={onOpenStockUpdateModal} className="flex items-center gap-1" size="sm">
                <ClipboardList size={14} /> <span className="hidden sm:inline">Scan</span>
              </Button>
            )}
            {isAwaitingPack && jobIdInVerificationMode === job.id && (
              <div
                className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'} bg-slate-100 dark:bg-slate-700 px-3 py-2 rounded-lg`}
              >
                Verification Status:{' '}
                {
                  job.items.filter(
                    (item) =>
                      item.verified || locallyVerifiedItems.has(`${job.id}-${item.barcode}`)
                  ).length
                }
                /{job.items.length} items verified
              </div>
            )}
          </div>

          <div className="space-y-3">
            {job.items.map((it, itemIndex) => (
              <div
                key={`${it.barcode}-${itemIndex}-${job.id}`}
                className={`p-3 rounded-lg ${isDarkMode ? 'bg-slate-700' : 'bg-slate-100'}`}
              >
                {editingJobItem?.jobId === job.id && editingJobItem?.itemIndex === itemIndex ? (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex flex-col sm:flex-row gap-2 flex-1">
                      <Input
                        value={editingJobItem.barcode}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setEditingJobItem({ ...editingJobItem, barcode: e.target.value })
                        }
                        className="w-full sm:w-32 text-sm"
                        placeholder="Barcode"
                      />
                      <Input
                        type="number"
                        value={editingJobItem.quantity.toString()}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setEditingJobItem({
                            ...editingJobItem,
                            quantity: Number(e.target.value) || 1,
                          })
                        }
                        className="w-full sm:w-20 text-sm"
                        min="1"
                        placeholder="Qty"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          onUpdateJobItem(job, itemIndex, editingJobItem.barcode, editingJobItem.quantity)
                        }
                        className="h-8 px-3"
                      >
                        ✓
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => setEditingJobItem(null)} className="h-8 px-3">
                        ✕
                      </Button>
                    </div>
                  </div>
                ) : (
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

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isAwaitingPack && jobIdInVerificationMode === job.id && (
                          <Button
                            variant={
                              it.verified || locallyVerifiedItems.has(`${job.id}-${it.barcode}`)
                                ? 'success'
                                : 'primary'
                            }
                            size="sm"
                            onClick={() =>
                              onVerifyItem(
                                job,
                                it.barcode,
                                !(it.verified || locallyVerifiedItems.has(`${job.id}-${it.barcode}`))
                              )
                            }
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
                                {it.verified || locallyVerifiedItems.has(`${job.id}-${it.barcode}`)
                                  ? 'Verified'
                                  : 'Verify'}
                              </span>
                            )}
                          </Button>
                        )}
                        {isAwaitingPack && jobIdInVerificationMode === job.id && !editingJobItem && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => onOpenAddBackToStock(job, itemIndex, it)}
                            className="h-8 w-8 p-0 flex items-center justify-center !bg-green-500 !hover:bg-green-600 !text-white dark:!bg-green-600 dark:!hover:bg-green-500"
                            title="Add back to stock"
                          >
                            <Undo2 size={16} />
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} text-xs space-y-1`}>
                      <div>Qty: {it.quantity}</div>
                      {it.locationCode && it.shelfNumber && (
                        <div>
                          Location: {it.locationCode}-{it.shelfNumber}
                        </div>
                      )}
                      {it.reason && <div>Reason: {it.reason}</div>}
                      {it.storeName && <div>Store: {it.storeName?.toUpperCase()}</div>}
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

          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
            {isPicking && (
              <Button
                onClick={() => onCompletePicking(job)}
                size="sm"
                className="flex items-center gap-1 w-full sm:w-auto"
                isLoading={completingJobs.has(job.id)}
                disabled={completingJobs.has(job.id)}
              >
                <CheckSquare size={14} /> <span className="hidden sm:inline">Finish Picking</span>
              </Button>
            )}
            {isAwaitingPack && jobIdInVerificationMode === job.id && (
              <Button
                onClick={() => onCompletePacking(job)}
                size="sm"
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

export default JobCard;
