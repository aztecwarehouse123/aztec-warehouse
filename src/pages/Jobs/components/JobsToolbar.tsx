import React from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import Button from '../../../components/ui/Button';

export type JobsViewMode =
  | 'active'
  | 'completed'
  | 'archived'
  | 'live'
  | 'reports'
  | 'productivity';

export type JobsToolbarProps = {
  isDarkMode: boolean;
  viewMode: JobsViewMode;
  isLoading: boolean;
  userRole?: string;
  onRefresh: () => void;
  onNewJob: () => void;
  onSetView: (mode: JobsViewMode) => void;
};

const JobsToolbar: React.FC<JobsToolbarProps> = ({
  isDarkMode,
  viewMode,
  isLoading,
  userRole,
  onRefresh,
  onNewJob,
  onSetView,
}) => {
  const title =
    viewMode === 'archived'
      ? 'Archived'
      : viewMode === 'completed'
        ? 'Completed'
        : viewMode === 'live'
          ? 'Live'
          : viewMode === 'reports'
            ? 'Reports'
            : viewMode === 'productivity'
              ? 'Worker Productivity'
              : 'Active';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex flex-col gap-2">
          <h1
            className={`text-xl sm:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}
          >
            {title} Jobs
          </h1>
          {viewMode === 'live' && (
            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Showing jobs currently being created (in progress)
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="secondary"
            onClick={onRefresh}
            className={`flex items-center gap-1 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isLoading}
            size="sm"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </Button>
          <Button onClick={onNewJob} className="flex items-center gap-1" size="sm">
            <Plus size={16} /> <span className="sm:inline hidden">New Job</span>
          </Button>
          <Button
            variant={viewMode === 'active' ? 'primary' : 'secondary'}
            onClick={() => onSetView('active')}
            size="sm"
          >
            Active Jobs
          </Button>
          <Button
            variant={viewMode === 'completed' ? 'primary' : 'secondary'}
            onClick={() => onSetView('completed')}
            size="sm"
          >
            Completed Jobs
          </Button>
          <Button
            variant={viewMode === 'archived' ? 'primary' : 'secondary'}
            onClick={() => onSetView('archived')}
            size="sm"
          >
            Archived Jobs
          </Button>
          {(userRole === 'admin' || userRole === 'manager') && (
            <Button
              variant={viewMode === 'live' ? 'primary' : 'secondary'}
              onClick={() => onSetView('live')}
              size="sm"
            >
              Live Jobs
            </Button>
          )}
          {userRole !== 'staff' && (
            <Button
              variant={viewMode === 'reports' ? 'primary' : 'secondary'}
              onClick={() => onSetView('reports')}
              size="sm"
            >
              Reports
            </Button>
          )}
          {(userRole === 'admin' || userRole === 'manager') && (
            <Button
              variant={viewMode === 'productivity' ? 'primary' : 'secondary'}
              onClick={() => onSetView('productivity')}
              size="sm"
            >
              Productivity
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobsToolbar;
