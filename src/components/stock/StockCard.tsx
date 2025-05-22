import React from 'react';
import { StockItem } from '../../types';
import { format } from 'date-fns';

interface StockCardProps {
  item: StockItem;
  onClick?: () => void;
}

const StockCard: React.FC<StockCardProps> = ({ item, onClick }) => {
  return (
    <div 
      className="border border-slate-200 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full"
      onClick={onClick}
    >
      
      
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-medium text-slate-800">{item.name}</h3>
          <span className="text-sm font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
            In Stock
          </span>
        </div>
        
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Quantity:</span>
            <span className="text-slate-800 font-medium">{item.quantity}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Price:</span>
            <span className="text-slate-800 font-medium">${item.price.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Location:</span>
            <span className="text-slate-800">{item.locationCode} - {item.shelfNumber}</span>
          </div>
        </div>
        
        <div className="mt-3 pt-2 border-t border-slate-200 text-xs text-slate-500">
          Last updated: {format(item.lastUpdated, 'MMM d, yyyy')}
        </div>
      </div>
    </div>
  );
};

export default StockCard;