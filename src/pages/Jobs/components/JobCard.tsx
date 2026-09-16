import React from 'react';
import { ClipboardList, ChevronUp, ChevronDown, CheckSquare, RefreshCw, Trash2, Undo2, Package } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import type { Job } from '../types';
import {
  formatElapsedTime,
  formatStageClockRange,
  getJobStageTiming,
} from '../utils/formatters';
import {
  areAllItemsVerified,
  countVerifiedItems,
  getJobStatusLabel,
  getJobWorkflowPhase,
} from '../utils/jobWorkflow';

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
  jobIdInPackingMode: string | null;
  verifyingElapsedSeconds: number;
  packingElapsedSeconds: number;
  onStopVerification: (job: Job) => void;
  onRefreshJobs: () => void;
  onRequestDeleteJob: (job: Job) => void;
  completingJobs: Set<string>;
  onCompletePicking: (job: Job) => void;
  onCompleteVerification: (job: Job) => void;
  onStartPacking: (job: Job) => void;
  onStopPacking: (job: Job) => void;
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
  isExpanded,
  onToggleExpand,
  jobIdInVerificationMode,
  jobIdInPackingMode,
  verifyingElapsedSeconds,
  packingElapsedSeconds,
  onStopVerification,
  onRefreshJobs,
  onRequestDeleteJob,
  completingJobs,
  onCompletePicking,
  onCompleteVerification,
  onStartPacking,
  onStopPacking,
  onOpenStockUpdateModal,
  locallyVerifiedItems,
  editingJobItem,
  setEditingJobItem,
  onUpdateJobItem,
  onVerifyItem,
  verifyingItems,
  onOpenAddBackToStock,
}) => {
  const phase = getJobWorkflowPhase(job);
  const allItemsVerified = areAllItemsVerified(job, locallyVerifiedItems);
  const isPicking = phase === 'picking';
  const isAwaitingVerification = phase === 'awaiting_verification';
  const isAwaitingPack = phase === 'awaiting_pack';
  const isPacking = phase === 'packing';
  const isCompleted = phase === 'completed';
  const isVerifyingThisJob = jobIdInVerificationMode === job.id;
  const isPackingThisJob = jobIdInPackingMode === job.id || isPacking;
  const verifiedCount = countVerifiedItems(job, locallyVerifiedItems);
  const verifierName =
    job.verifier ||
    (isCompleted && job.verifyingTime && !job.packingTime ? job.packer : null);
  const showVerificationSummary =
    (isAwaitingPack || isPacking || isCompleted) &&
    (verifierName || (job.verifyingTime != null && job.verifyingTime > 0));

  const pickingTiming =
    isCompleted && job.pickingTime != null && job.pickingTime > 0
      ? getJobStageTiming(job.createdAt, null, job.pickingTime)
      : null;
  const verificationTiming = getJobStageTiming(
    job.verificationCompletedAt,
    job.verificationStartedAt,
    job.verifyingTime
  );
  const packingTiming = getJobStageTiming(
    job.packingCompletedAt,
    job.packingStartedAt,
    job.packingTime
  );

  const statusBadgeClass = isCompleted
    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
    : isPacking
      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300'
      : isAwaitingPack
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
        : isAwaitingVerification
          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';

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
                  {job.picker && <>Picked by {job.picker}</>}
                  {!job.picker && <>Created by {job.createdBy}</>}
                  {' • '}
                  {(pickingTiming?.endAt ?? job.createdAt).toLocaleString()}
                  {job.pickingTime != null && job.pickingTime > 0 && (
                    <span className={`ml-2 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                      • Picking: {formatElapsedTime(job.pickingTime)}
                      {pickingTiming && (
                        <span className="ml-1">
                          ({formatStageClockRange(pickingTiming.startedAt, pickingTiming.endAt)})
                        </span>
                      )}
                    </span>
                  )}
                  {job.trolleyNumber && (
                    <span className={`ml-2 ${isDarkMode ? 'text-purple-400' : 'text-purple-600'} font-medium`}>
                      • Trolley: {job.trolleyNumber}
                    </span>
                  )}
                </p>

                {showVerificationSummary && verificationTiming && (
                  <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} text-xs leading-relaxed mt-1`}>
                    {verifierName && <>Verified by {verifierName}</>}
                    {' • '}
                    {verificationTiming.endAt.toLocaleString()}
                    {verificationTiming.durationLabel && (
                      <span className={`ml-2 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        • Verifying: {verificationTiming.durationLabel}
                        <span className="ml-1">
                          ({formatStageClockRange(verificationTiming.startedAt, verificationTiming.endAt)})
                        </span>
                      </span>
                    )}
                  </p>
                )}

                {showVerificationSummary && !verificationTiming && job.verifyingTime != null && job.verifyingTime > 0 && (
                  <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} text-xs leading-relaxed mt-1`}>
                    {verifierName && <>Verified by {verifierName}</>}
                    <span className={`${verifierName ? 'ml-2' : ''} ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      {verifierName ? '• ' : ''}Verifying: {formatElapsedTime(job.verifyingTime)}
                    </span>
                  </p>
                )}

                {(isPacking || isCompleted) && packingTiming && (
                  <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} text-xs leading-relaxed mt-1`}>
                    {job.packer && <>Packed by {job.packer}</>}
                    {' • '}
                    {packingTiming.endAt.toLocaleString()}
                    {packingTiming.durationLabel && (
                      <span className={`ml-2 ${isDarkMode ? 'text-sky-400' : 'text-sky-600'}`}>
                        • Packing: {packingTiming.durationLabel}
                        <span className="ml-1">
                          ({formatStageClockRange(packingTiming.startedAt, packingTiming.endAt)})
                        </span>
                      </span>
                    )}
                  </p>
                )}

                {!isExpanded && job.items.length > 0 && (
                  <div className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} text-xs mt-2`}>
                    {job.items.length} item{job.items.length !== 1 ? 's' : ''} • Total Qty:{' '}
                    {job.items.reduce((sum, item) => sum + item.quantity, 0)}
                    {isAwaitingVerification && (
                      <span className="ml-2">
                        • Verified: {verifiedCount}/{job.items.length}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadgeClass}`}>
                {getJobStatusLabel(phase)}
              </span>
              {isAwaitingVerification && isVerifyingThisJob && (
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
              )}
              {isPackingThisJob && !isCompleted && (
                <span
                  className={`text-xs font-medium px-2 py-1 rounded ${
                    isDarkMode ? 'text-orange-300 bg-slate-700' : 'text-orange-700 bg-orange-50'
                  }`}
                >
                  Packing: {formatElapsedTime(packingElapsedSeconds)}
                </span>
              )}
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
            {isAwaitingVerification && isVerifyingThisJob && (
              <div
                className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'} bg-slate-100 dark:bg-slate-700 px-3 py-2 rounded-lg`}
              >
                Verification Status: {verifiedCount}/{job.items.length} items verified
                {allItemsVerified && (
                  <span className={`block mt-1 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    All items verified — press Complete Verification to continue.
                  </span>
                )}
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
                        {isAwaitingVerification && (
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
                        {isAwaitingVerification && !editingJobItem && (
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
            {isAwaitingVerification && isVerifyingThisJob && (
              <Button
                onClick={() => onCompleteVerification(job)}
                size="sm"
                className="flex items-center gap-1 w-full sm:w-auto"
                isLoading={completingJobs.has(job.id)}
                disabled={completingJobs.has(job.id) || !allItemsVerified}
              >
                <CheckSquare size={14} /> <span className="hidden sm:inline">Complete Verification</span>
              </Button>
            )}
            {isAwaitingPack && (
              <Button
                onClick={() => onStartPacking(job)}
                size="sm"
                className="flex items-center gap-1 w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white"
                isLoading={completingJobs.has(job.id)}
                disabled={completingJobs.has(job.id)}
              >
                <Package size={14} /> <span className="hidden sm:inline">Start Packing</span>
              </Button>
            )}
            {isPackingThisJob && !isCompleted && (
              <Button
                onClick={() => onStopPacking(job)}
                size="sm"
                className="flex items-center gap-1 w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white"
                isLoading={completingJobs.has(job.id)}
                disabled={completingJobs.has(job.id)}
              >
                <CheckSquare size={14} /> <span className="hidden sm:inline">Stop Packing</span>
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default JobCard;
