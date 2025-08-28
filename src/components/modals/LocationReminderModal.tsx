import React from 'react';
import Modal from './Modal';
import Button from '../ui/Button';
import { MapPin } from 'lucide-react';
import { StockItem } from '../../types';

interface LocationReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUseLocation: (locationCode: string, shelfNumber: string) => void;
  onManualLocation: () => void;
  hiddenProduct: StockItem;
  newProductName: string;
}

const LocationReminderModal: React.FC<LocationReminderModalProps> = ({
  isOpen,
  onClose,
  onUseLocation,
  onManualLocation,
  hiddenProduct,
//   newProductName
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Location Reminder"
      size="md"
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <MapPin className="w-6 h-6 text-blue-500 mt-1 flex-shrink-0" />
          <div className="space-y-2">
            <p className="text-gray-700 dark:text-gray-300">
              Your previous product <strong>"{hiddenProduct.name}"</strong> was located at:
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                Location: <strong>{hiddenProduct.locationCode}-{hiddenProduct.shelfNumber}</strong>
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Previous quantity: {hiddenProduct.quantity} units
              </p>
            </div>
            <p className="text-gray-700 dark:text-gray-300">
              Do you want to place this product at the same location?
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            variant="secondary"
            onClick={onManualLocation}
          >
            No, I'll choose manually
          </Button>
          <Button
            onClick={() => onUseLocation(hiddenProduct.locationCode, hiddenProduct.shelfNumber)}
            className="bg-blue-600 hover:bg-blue-700 focus:ring-blue-500"
          >
            Yes, use same location
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default LocationReminderModal;
