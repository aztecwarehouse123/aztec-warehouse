import React from 'react';
import { RefreshCw, ClipboardList } from 'lucide-react';
import Button from '../../../components/ui/Button';
import type { ActiveJobSession } from '../types';

export type LiveJobsPanelProps = {
  isDarkMode: boolean;
  showLiveJobs: boolean;
  uiSessions: ActiveJobSession[];
  totalLiveCount: number;
  onRefresh: () => void;
};

const LiveJobsPanel: React.FC<LiveJobsPanelProps> = ({
  isDarkMode,
  showLiveJobs,
  uiSessions,
  totalLiveCount,
  onRefresh,
}) => {
  if (!showLiveJobs) return null;

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
            Live Job Sessions
          </h2>
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
            {totalLiveCount} active
          </span>
        </div>
        <Button variant="secondary" onClick={onRefresh} className="flex items-center gap-2" size="sm">
          <RefreshCw size={16} />
          Refresh Live Jobs
        </Button>
      </div>

      {uiSessions.map((session) => (
        <div
          key={session.id}
          className={`${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'} rounded-lg shadow-sm border border-dashed`}
        >
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
  );
};

export default LiveJobsPanel;
