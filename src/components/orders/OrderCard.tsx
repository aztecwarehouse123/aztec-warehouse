// Add the following CSS to your global stylesheet (e.g., index.css or tailwind.css):
// @keyframes fade-in-up {
//   0% { opacity: 0; transform: translateY(10px); }
//   100% { opacity: 1; transform: translateY(0); }
// }
// .animate-fade-in-up {
//   animation: fade-in-up 0.18s cubic-bezier(0.4,0,0.2,1);
// }

import React from 'react';
import { Order } from '../../types';
import StatusBadge from '../ui/StatusBadge';
import { format } from 'date-fns';
import { useTheme } from '../../contexts/ThemeContext';

interface OrderCardProps {
  order: Order;
  onClick?: () => void;
  editButton?: React.ReactNode;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, onClick, editButton }) => {
  const { isDarkMode } = useTheme();

  return (
    <div 
      className={`border ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-slate-200 bg-white'} rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer`}
      onClick={onClick}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{order.orderNumber}</h3>
          <div className="flex items-center gap-2">
            {editButton}
            <StatusBadge status={order.status} />
          </div>
        </div>
        
        <p className={`${isDarkMode ? 'text-slate-300' : 'text-slate-700'} mb-2`}>{order.customerName}</p>
        
        <div className="space-y-1 mb-3">
          <div className="flex justify-between text-sm">
            <span className={`${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Total Products: {order.items.length}</span>
            <span className={`${isDarkMode ? 'text-slate-200' : 'text-slate-800'} font-medium`}>Total Quantity: {order.items.reduce((sum, item) => sum + item.quantity, 0)}</span>
          </div>
        </div>
        
        <div className={`pt-2 border-t ${isDarkMode ? 'border-slate-700' : 'border-slate-200'} flex items-center justify-between`}>
          <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            {format(order.createdAt, 'MMM d, yyyy')}
          </span>
          <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Total: ${order.totalAmount.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default OrderCard;