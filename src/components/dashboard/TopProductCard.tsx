import React from 'react';
import { TopProduct } from '../../types';

interface TopProductCardProps {
  product: TopProduct;
  rank: number;
}

const TopProductCard: React.FC<TopProductCardProps> = ({ product, rank }) => {
  return (
    <div className="flex items-center p-3 rounded-lg border border-slate-200 bg-white hover:shadow-md transition-shadow">
      <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 font-bold">
        #{rank}
      </div>
      
      {product.image && (
        <div className="ml-3 mr-4 w-12 h-12 rounded-md overflow-hidden border border-slate-200 flex-shrink-0">
          <img 
            src={product.image} 
            alt={product.name} 
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      <div className="flex-grow min-w-0">
        <h4 className="font-medium text-slate-800 truncate">{product.name}</h4>
        <div className="flex items-center justify-between mt-1">
          <span className="text-sm text-slate-500">{product.quantity} units</span>
          <span className="text-sm font-medium text-slate-700">${product.revenue.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

export default TopProductCard;