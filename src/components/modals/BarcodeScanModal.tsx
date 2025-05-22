import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import { Barcode } from 'lucide-react';

interface BarcodeScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBarcodeScanned: (barcode: string) => void;
}

const BarcodeScanModal: React.FC<BarcodeScanModalProps> = ({
  isOpen,
  onClose,
  onBarcodeScanned
}) => {
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    let barcodeBuffer = '';
    let lastKeyTime = Date.now();

    const handleKeyPress = (e: KeyboardEvent) => {
      const currentTime = Date.now();
      
      // If more than 100ms has passed since the last keypress, reset the buffer
      if (currentTime - lastKeyTime > 100) {
        barcodeBuffer = '';
      }
      
      lastKeyTime = currentTime;

      // If Enter key is pressed, process the barcode
      if (e.key === 'Enter' && barcodeBuffer.length > 0) {
        e.preventDefault();
        onBarcodeScanned(barcodeBuffer);
        barcodeBuffer = '';
        onClose();
      } else if (e.key.length === 1) {
        // Add character to buffer
        barcodeBuffer += e.key;
      }
    };

    if (isOpen) {
      setIsScanning(true);
      document.addEventListener('keydown', handleKeyPress);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      setIsScanning(false);
    };
  }, [isOpen, onBarcodeScanned, onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Scan Barcode"
      size="sm"
    >
      <div className="flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
          <Barcode size={32} className="text-blue-500" />
        </div>
        <p className="text-center text-slate-600">
          {isScanning 
            ? "Please scan the barcode now..."
            : "Click 'Start Scanning' to begin"}
        </p>
        {!isScanning && (
          <button
            onClick={() => setIsScanning(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Start Scanning
          </button>
        )}
      </div>
    </Modal>
  );
};

export default BarcodeScanModal; 