import React, { ReactNode } from 'react';

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ title, children, className = '' }) => {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden ${className}`}>
      {title && (
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="font-medium text-slate-700">{title}</h3>
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
};

export default Card;