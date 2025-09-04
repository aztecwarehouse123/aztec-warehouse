import React, { useEffect, useState, useRef } from 'react';
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
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let barcodeBuffer = '';
    let lastKeyTime = Date.now();

    const handleKeyPress = (e: KeyboardEvent) => {
      // Only process keypresses when modal is open and scanning
      if (!isOpen || !isScanning) return;
      
      const currentTime = Date.now();
      
      // If more than 2 seconds has passed since the last keypress, reset the buffer
      if (currentTime - lastKeyTime > 2000) {
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
      // Focus the modal to ensure it can receive keyboard input
      setTimeout(() => {
        if (modalRef.current) {
          modalRef.current.focus();
        }
      }, 100);
    } else {
      setIsScanning(false);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [isOpen, isScanning, onBarcodeScanned, onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Scan Barcode"
      size="sm"
    >
      <div 
        ref={modalRef}
        className="flex flex-col items-center justify-center p-6 space-y-4"
        tabIndex={-1}
        onKeyDown={(e) => {
          // Prevent default behavior for all keys to avoid conflicts
          e.preventDefault();
        }}
      >
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
          <Barcode size={32} className="text-blue-500" />
        </div>
        <p className="text-center text-slate-600">
          {isScanning 
            ? "Please scan the barcode now..."
            : "Ready to scan..."}
        </p>
        <div className="text-center text-sm text-slate-500">
          <p>Point your barcode scanner at the product</p>
          <p>and scan the barcode</p>
        </div>
      </div>
    </Modal>
  );
};

export default BarcodeScanModal; 