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
          <div className="flex flex-col gap-1">
            <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${
              item.status === 'active' 
                ? 'bg-green-100 text-green-700'
                : 'bg-yellow-100 text-yellow-700'
            }`}>
              {item.status === 'active' ? 'Active' : 'Pending'}
            </span>
            {item.storeName && item.storeName !== 'not set' ? (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${
                item.storeName === 'supply & serve' ? 'bg-blue-100 text-blue-700' :
                item.storeName === 'APHY' ? 'bg-green-100 text-green-700' :
                item.storeName === 'AZTEC' ? 'bg-purple-100 text-purple-700' :
                item.storeName === 'ZK' ? 'bg-orange-100 text-orange-700' :
                item.storeName === 'Fahiz' ? 'bg-pink-100 text-pink-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {item.storeName?.toUpperCase()}
              </span>
            ) : (
              <span className="text-xs text-slate-400">-</span>
            )}
          </div>
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