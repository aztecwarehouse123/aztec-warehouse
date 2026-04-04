import React from 'react';
import Modal from '../../../components/modals/Modal';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import type { Job } from '../types';
import type { JobItem } from '../../../types';

export type AddBackToStockModalProps = {
  isOpen: boolean;
  isDarkMode: boolean;
  item: { job: Job; itemIndex: number; item: JobItem } | null;
  quantity: number;
  onQuantityChange: (q: number) => void;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

const AddBackToStockModal: React.FC<AddBackToStockModalProps> = ({
  isOpen,
  isDarkMode,
  item,
  quantity,
  onQuantityChange,
  loading,
  onClose,
  onConfirm,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        if (loading) return;
        onClose();
      }}
      title="Add item back to stock"
      size="sm"
    >
      {item && (
        <div className="space-y-4">
          <div className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
            <p className="font-medium mb-2">{item.item.name || item.item.barcode}</p>
            <p>Barcode: {item.item.barcode}</p>
            <p>Available in job: {item.item.quantity}</p>
            {item.item.locationCode && item.item.shelfNumber && (
              <p>
                Location: {item.item.locationCode}-{item.item.shelfNumber}
              </p>
            )}
            {item.item.reason && <p>Reason: {item.item.reason}</p>}
            {item.item.storeName && <p>Store: {item.item.storeName}</p>}
          </div>
          <div className="space-y-2">
            <p className={`text-xs ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
              Select quantity to add back to stock:
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="h-8 w-8 p-0 flex items-center justify-center"
                onClick={() => onQuantityChange(Math.max(1, (quantity || 1) - 1))}
                disabled={loading}
              >
                -
              </Button>
              <Input
                type="number"
                min={1}
                max={item.item.quantity}
                value={quantity || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  const raw = parseInt(e.target.value || '0', 10);
                  if (isNaN(raw)) {
                    onQuantityChange(0);
                    return;
                  }
                  const clamped = Math.max(1, Math.min(raw, item.item.quantity));
                  onQuantityChange(clamped);
                }}
                className="w-20 text-center"
              />
              <Button
                variant="secondary"
                size="sm"
                className="h-8 w-8 p-0 flex items-center justify-center"
                onClick={() =>
                  onQuantityChange(Math.min(item.item.quantity, (quantity || 0) + 1))
                }
                disabled={loading}
              >
                +
              </Button>
            </div>
            <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              This will add up to {item.item.quantity} unit(s) back to inventory. If you return the full
              quantity, the item will be removed from the job. An activity log will be created.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button size="sm" onClick={onConfirm} isLoading={loading} disabled={loading}>
              Add back to stock
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default AddBackToStockModal;
