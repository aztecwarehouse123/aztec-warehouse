import React from 'react';
import { Order } from '../../types';
import StatusBadge from '../ui/StatusBadge';
import { format } from 'date-fns';

interface OrderCardProps {
  order: Order;
  onClick?: () => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, onClick }) => {
  return (
    <div 
      className="border border-slate-200 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-slate-800">{order.orderNumber}</h3>
          <StatusBadge status={order.status} />
        </div>
        
        <p className="text-slate-700 mb-2">{order.customerName}</p>
        
        <div className="space-y-1 mb-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-slate-600">{item.productName} x{item.quantity}</span>
              <span className="text-slate-800 font-medium">${item.totalPrice.toFixed(2)}</span>
            </div>
          ))}
        </div>
        
        <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {format(order.createdAt, 'MMM d, yyyy')}
          </span>
          <span className="font-medium">Total: ${order.totalAmount.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default OrderCard;