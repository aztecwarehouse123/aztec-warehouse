import React from 'react';
import { ActivityLog } from '../../types';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItemProps {
  activity: ActivityLog;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ activity }) => {
  const getActionColor = (action: string) => {
    if (action.includes('Added')) return 'text-green-600';
    if (action.includes('Updated')) return 'text-blue-600';
    if (action.includes('Shipped')) return 'text-amber-600';
    if (action.includes('Created')) return 'text-purple-600';
    if (action.includes('Reduced')) return 'text-red-600';
    return 'text-slate-600';
  };

  return (
    <div className="flex gap-3 py-3">
      <div className={`h-2 w-2 mt-2 rounded-full ${getActionColor(activity.action)}`}></div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-medium text-slate-800">{activity.action}</h4>
          <span className="text-xs text-slate-500">
            {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
          </span>
        </div>
        <p className="text-sm text-slate-600 truncate">{activity.details}</p>
        <p className="text-xs text-slate-500 mt-1">by {activity.user}</p>
      </div>
    </div>
  );
};

export default ActivityItem;