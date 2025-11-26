import React, { useState } from 'react';
import { Loader2, Barcode } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from './Modal';
import BarcodeScanModal from './BarcodeScanModal';
import { db } from '../../config/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const AddProductModal: React.FC<AddProductModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: '', unit: '', barcode: '' });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isFetchingProductInfo, setIsFetchingProductInfo] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleBarcodeScanned = async (barcode: string) => {
    setForm(prev => ({ ...prev, barcode }));
    setIsScanModalOpen(false);
    setFetchError(null);
    setIsFetchingProductInfo(true);
    try {
      const proxy = 'https://corsproxy.io/?';
      const url = `${proxy}https://api.upcitemdb.com/prod/trial/lookup?upc=${barcode}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data && data.items && data.items.length > 0) {
        const item = data.items[0];
        setForm(prev => ({
          ...prev,
          name: item.title || prev.name
        }));
      } else {
        setFetchError('No product info found for this barcode.');
      }
    } catch {
      setFetchError('Failed to fetch product info.');
    } finally {
      setIsFetchingProductInfo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.unit.trim() || !form.barcode.trim()) {
      setError('All fields are required');
      return;
    }
    setIsLoading(true);
    try {
      // Convert product name to uppercase before storing
      const uppercaseName = form.name.toUpperCase();
      
      // Add to scannedProducts collection
      await addDoc(collection(db, 'scannedProducts'), {
        name: uppercaseName,
        unit: form.unit,
        barcode: form.barcode,
        createdAt: Timestamp.fromDate(new Date())
      });

      // Add activity log
      if (user) {
        await addDoc(collection(db, 'activityLogs'), {
          user: user.name,
          role: user.role,
          detail: `added new product "${uppercaseName}" with barcode ${form.barcode}`,
          time: new Date().toISOString()
        });
      }

      // Reset form and close modal
      setForm({ name: '', unit: '', barcode: '' });
      setError(null);
      setFetchError(null);
      onClose();
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch {
      setError('Failed to save product');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setForm({ name: '', unit: '', barcode: '' });
    setError(null);
    setFetchError(null);
    onClose();
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleClose} title="Add Product" size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Product Name"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Enter product name"
            required
            fullWidth
          />
          <Input
            label="Unit"
            name="unit"
            value={form.unit}
            onChange={handleChange}
            placeholder="e.g. 350ML, 75GM, 1PC"
            required
            fullWidth
          />
          <div className="relative w-full">
            <Input
              label="Barcode"
              name="barcode"
              value={form.barcode}
              onChange={handleChange}
              placeholder="Enter barcode"
              required
              fullWidth
              style={{ paddingRight: 44 }}
            />
            <button
              type="button"
              onClick={async () => {
                if (form.barcode.trim() && !isFetchingProductInfo) {
                  setFetchError(null);
                  setIsFetchingProductInfo(true);
                  try {
                    await handleBarcodeScanned(form.barcode);
                  } finally {
                    setIsFetchingProductInfo(false);
                  }
                }
              }}
              className="absolute right-2 top-1/2 -translate-y-1 flex items-center justify-center w-8 h-8 rounded-md transition bg-transparent hover:bg-blue-50 focus:bg-blue-100 outline-none border-none p-0"
              style={{ zIndex: 2 }}
              title="Fetch product info by barcode"
              tabIndex={0}
              aria-label="Fetch product info by barcode"
              disabled={isFetchingProductInfo}
            >
              {isFetchingProductInfo ? <Loader2 size={18} className="animate-spin text-blue-500" /> : <Barcode size={18} className="text-blue-500" />}
            </button>
          </div>
          {error && <div className="text-red-500 text-sm">{error}</div>}
          {fetchError && <div className="text-red-500 text-sm">{fetchError} Please enter details manually.</div>}
          {isFetchingProductInfo && (
            <div className="flex items-center gap-2 text-blue-500 text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              Fetching product info...
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setIsScanModalOpen(true)}>
              Scan
            </Button>
            <Button type="submit" isLoading={isLoading}>
              Add
            </Button>
          </div>
        </form>
      </Modal>
      <BarcodeScanModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        onBarcodeScanned={handleBarcodeScanned}
      />
    </>
  );
};

export default AddProductModal;
