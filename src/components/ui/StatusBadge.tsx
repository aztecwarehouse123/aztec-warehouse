import React from 'react';
import { OrderStatus } from '../../types';
import Badge from './Badge';

interface StatusBadgeProps {
  status: OrderStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getVariant = () => {
    switch (status) {
      case 'pending':
        return 'info';
      case 'processing':
        return 'primary';
      case 'shipped':
        return 'warning';
      case 'delivered':
        return 'success';
      case 'cancelled':
        return 'danger';
      case 'completed':
        return 'success';
      default:
        return 'info';
    }
  };

  const getStatusText = () => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <Badge variant={getVariant()}>
      {getStatusText()}
    </Badge>
  );
};

export default StatusBadge;