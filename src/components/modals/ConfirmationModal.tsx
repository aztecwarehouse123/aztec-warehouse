import React from 'react';
import Modal from './Modal';
import Button from '../ui/Button';
import { AlertTriangle } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  isLoading?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  isLoading = false,
  confirmLabel = 'Yes',
  cancelLabel = 'No',
}) => {
  const { isDarkMode } = useTheme();
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="md"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 text-amber-600">
          <AlertTriangle size={24} />
          <p className={isDarkMode ? 'text-slate-200' : 'text-slate-700'}>{message}</p>
        </div>
        <div className="flex justify-end gap-3 pt-4">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
            className={!isDarkMode ? 'text-slate-700' : 'text-slate-100'}
          >
            {cancelLabel}
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmationModal; 