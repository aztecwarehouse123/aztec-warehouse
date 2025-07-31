import React, { useState, useEffect } from 'react';
import { Plus, Loader2, RefreshCw, Edit2, Trash2, Barcode, Upload } from 'lucide-react';
import { motion } from 'framer-motion';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/modals/Modal';
import BarcodeScanModal from '../../components/modals/BarcodeScanModal';
import { db } from '../../config/firebase';
import { collection, addDoc, getDocs, Timestamp, orderBy, query, doc, updateDoc, deleteDoc, limit, where, getCountFromServer } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import Toast from '../../components/ui/Toast';

interface ScannedProduct {
  id: string;
  name: string;
  unit: string;
  barcode: string;
  createdAt: Date;
}

const Add: React.FC = () => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [products, setProducts] = useState<ScannedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({ name: '', unit: '', barcode: '' });
  const [error, setError] = useState<string | null>(null);
  const [editProduct, setEditProduct] = useState<ScannedProduct | null>(null);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isFetchingProductInfo, setIsFetchingProductInfo] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [displaySearchQuery, setDisplaySearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ScannedProduct | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  useEffect(() => {
    fetchProducts();
    fetchTotalCount();
  }, []);

  const fetchProducts = async (search?: string) => {
    setIsLoading(true);
    try {
      let q;
      if (search && search.trim() !== '') {
        // Search by name or barcode (case-insensitive)
        // Firestore does not support OR queries directly, so do two queries and merge results
        const nameQ = query(collection(db, 'scannedProducts'), where('name', '>=', search), where('name', '<=', search + '\uf8ff'), orderBy('name'), limit(100));
        const barcodeQ = query(collection(db, 'scannedProducts'), where('barcode', '>=', search), where('barcode', '<=', search + '\uf8ff'), orderBy('barcode'), limit(100));
        const [nameSnap, barcodeSnap] = await Promise.all([getDocs(nameQ), getDocs(barcodeQ)]);
        const items = [...nameSnap.docs, ...barcodeSnap.docs].reduce((acc, doc) => {
          if (!acc.some(d => d.id === doc.id)) acc.push(doc);
          return acc;
        }, [] as typeof nameSnap.docs);
        setProducts(items.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            unit: data.unit,
            barcode: data.barcode,
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt)
          };
        }));
      } else {
        // Fetch recent 100
        q = query(collection(db, 'scannedProducts'), orderBy('createdAt', 'desc'), limit(100));
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          unit: data.unit,
          barcode: data.barcode,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt)
        };
      });
      setProducts(items);
      }
    } catch {
      setError('Failed to fetch products');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTotalCount = async () => {
    try {
      const coll = collection(db, 'scannedProducts');
      const snapshot = await getCountFromServer(coll);
      setTotalCount(snapshot.data().count);
    } catch {
      setTotalCount(null);
    }
  };

  const handleOpenModal = (product?: ScannedProduct) => {
    if (product) {
      setForm({
        name: product.name || '',
        unit: product.unit || '',
        barcode: product.barcode || ''
      });
      setEditProduct(product);
    } else {
      setForm({ name: '', unit: '', barcode: '' });
      setEditProduct(null);
    }
    setIsModalOpen(true);
    setError(null);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setError(null);
  };

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

  const handleAddOrEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.unit.trim() || !form.barcode.trim()) {
      setError('All fields are required');
      return;
    }
    setIsLoading(true);
    try {
      // Convert product name to uppercase before storing
      const uppercaseName = form.name.toUpperCase();
      
      if (editProduct) {
        // Edit mode
        const ref = doc(db, 'scannedProducts', editProduct.id);
        await updateDoc(ref, {
          name: uppercaseName,
          unit: form.unit,
          barcode: form.barcode
        });
        // Add activity log for edit
        if (user && editProduct) {
          const changes = [];
          if (editProduct.name !== uppercaseName) changes.push(`name from "${editProduct.name}" to "${uppercaseName}"`);
          if (editProduct.unit !== form.unit) changes.push(`unit from ${editProduct.unit || 'none'} to ${form.unit || 'none'}`);
          if (editProduct.barcode !== form.barcode) changes.push(`barcode from "${editProduct.barcode || 'none'}" to "${form.barcode || 'none'}"`);
          if (changes.length > 0) {
            await addDoc(collection(db, 'activityLogs'), {
              user: user.name,
              role: user.role,
              detail: `edited product "${uppercaseName}": ${changes.join(', ')}`,
              time: new Date().toISOString()
            });
          }
        }
      } else {
        // Add mode
        await addDoc(collection(db, 'scannedProducts'), {
          name: uppercaseName,
          unit: form.unit,
          barcode: form.barcode,
          createdAt: Timestamp.fromDate(new Date())
        });
        // Add activity log for add
        if (user) {
          await addDoc(collection(db, 'activityLogs'), {
            user: user.name,
            role: user.role,
            detail: `added new product "${uppercaseName}" with barcode ${form.barcode}`,
            time: new Date().toISOString()
          });
        }
      }
      setIsModalOpen(false);
      setEditProduct(null);
      fetchProducts();
    } catch {
      setError('Failed to save product');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!deleteProductId) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'scannedProducts', deleteProductId));
      setDeleteProductId(null);
      fetchProducts();
    } catch {
      // Optionally show a toast or error
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    let products: { name: string; unit: string; barcode: string }[] = [];
    try {
      if (file.name.endsWith('.csv')) {
        // Parse CSV
        const text = await file.text();
        const result = Papa.parse(text, { header: true });
        const allRows = (result.data as Record<string, unknown>[]);
        products = allRows.map(row => ({
          name: row['Description']?.toString().trim() || '',
          unit: row['Unit']?.toString().trim() || '',
          barcode: row['EAN']?.toString().trim() || ''
        })).filter(p => p.name || p.unit || p.barcode);
        const skipped = allRows.length - products.length;
        if (skipped > 0) {
          console.log(`${skipped} rows skipped (all columns empty).`);
          setToast({ type: 'error', message: `${skipped} rows skipped (all columns empty).` });
        }
      } else if (file.name.endsWith('.xlsx')) {
        // Parse XLSX
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const allRows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];
        products = allRows.map(row => ({
          name: row['Description']?.toString().trim() || '',
          unit: row['Unit']?.toString().trim() || '',
          barcode: row['EAN']?.toString().trim() || ''
        })).filter(p => p.name || p.unit || p.barcode);
        const skipped = allRows.length - products.length;
        if (skipped > 0) {
          console.log(`${skipped} rows skipped (all columns empty).`);
          setToast({ type: 'error', message: `${skipped} rows skipped (all columns empty).` });
        }
      } else {
        console.log('Unsupported file type. Please upload a .csv or .xlsx file.');
        setToast({ type: 'error', message: 'Unsupported file type. Please upload a .csv or .xlsx file.' });
        return;
      }
      if (products.length === 0) {
        console.log('No valid products found in file.');
        setToast({ type: 'error', message: 'No valid products found in file.' });
        return;
      }
      // Upload to Firebase
      for (const p of products) {
        await addDoc(collection(db, 'scannedProducts'), {
          name: p.name.toUpperCase(),
          unit: p.unit,
          barcode: p.barcode,
          createdAt: Timestamp.fromDate(new Date())
        });
      }
      setToast({ type: 'success', message: `Uploaded ${products.length} products successfully!` });
      console.log(`Uploaded ${products.length} products successfully!`);
      fetchProducts();
    } catch {
      console.log('Failed to upload products.');
      setToast({ type: 'error', message: 'Failed to upload products.' });
    }
  };

  if (!user || (user.role !== 'admin' && user.role !== 'inbound' && user.role !== 'staff')) {
    return <div className="p-8 text-center text-red-500 font-semibold">You are not authorized to access this page.</div>;
  }

  return (
    <div className={isDarkMode ? 'bg-slate-900 text-white min-h-screen' : 'bg-slate-50 text-slate-800 min-h-screen'}>
      {/* Total Products Indicator */}
      <div className="flex items-center justify-between py-4">
        <h1 className="text-2xl font-bold">Add Products</h1>
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${isDarkMode ? 'bg-slate-800 text-blue-300' : 'bg-blue-100 text-blue-700'}`}>
          Total Scanned Products: {totalCount !== null ? totalCount : <span className="animate-pulse">...</span>}
        </span>
      </div>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
          <div>
            <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mt-1 text-left md:text-left`}>Scan and add new products to your warehouse inventory</p>
          </div>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-2 w-full md:w-auto">
            <Button
              variant="secondary"
              onClick={() => fetchProducts()}
              className={`flex items-center gap-2 w-full md:w-auto ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={isLoading}
              icon={<RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />}
            />
            <Button icon={<Upload size={18} />} onClick={() => fileInputRef.current?.click()} className="w-full md:w-auto">
              Upload CSV/XLSX
            </Button>
            <input
              type="file"
              accept=".csv,.xlsx"
              ref={fileInputRef}
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <Button icon={<Plus size={18} />} onClick={() => handleOpenModal()} className="w-full md:w-auto">
              Add Product
            </Button>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <Input
              type="text"
              placeholder="Search by name or barcode"
              value={displaySearchQuery}
              onChange={e => {
                const inputValue = e.target.value;
                setDisplaySearchQuery(inputValue);
                fetchProducts(inputValue.toUpperCase());
              }}
              className="pl-10"
              fullWidth
            />
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-search"><circle cx="7" cy="7" r="6"/><path d="m15 15-3.5-3.5"/></svg>
            </span>
          </div>
        </div>
        <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editProduct ? 'Edit Product' : 'Add Product'} size="sm">
          <form onSubmit={handleAddOrEditProduct} className="space-y-4">
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
                {editProduct ? 'Save Changes' : 'Add'}
              </Button>
            </div>
          </form>
        </Modal>
        <BarcodeScanModal
          isOpen={isScanModalOpen}
          onClose={() => setIsScanModalOpen(false)}
          onBarcodeScanned={handleBarcodeScanned}
        />
        {/* Responsive Product List: Table on md+, Cards on mobile */}
        {/* Table for md+ screens */}
        <div className="hidden md:block overflow-x-auto overflow-y-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <table className={`min-w-full divide-y ${isDarkMode ? 'divide-slate-700' : 'divide-slate-200'} ${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-lg`}>
            <thead className={isDarkMode ? 'bg-slate-700/50' : 'bg-slate-100'}>
              <tr>
                <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Name</th>
                <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Unit</th>
                <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Barcode</th>
                <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Created At</th>
                <th className={`px-4 py-3 text-right text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isDarkMode ? 'divide-slate-700' : 'divide-slate-200'}`}>
              {isLoading ? (
                <tr>
                  <td colSpan={5} style={{ border: 0, padding: 0 }}>
                    <div className="flex flex-col items-center justify-center min-h-[200px] w-full py-12">
                      <Loader2 className={`w-8 h-8 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} animate-spin`} />
                      <p className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>Loading products...</p>
                    </div>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={5} className={`text-center py-8 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>No products found.</td>
                </tr>
              ) :
                products.map((product, index) => (
                  <motion.tr
                    key={product.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05, ease: 'easeOut' }}
                    className={`hover:${isDarkMode ? 'bg-slate-700/50' : 'bg-slate-50'} cursor-pointer`}
                    onClick={() => setSelectedProduct(product)}
                  >
                    <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-blue-400' : 'text-blue-700'} font-medium`}>{product.name}</td>
                    <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{product.unit}</td>
                    <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{product.barcode}</td>
                    <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{format(product.createdAt, 'MMM d, yyyy, h:mm a')}</td>
                    <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'} text-right`}>
                      <button
                        onClick={e => { e.stopPropagation(); handleOpenModal(product); }}
                        className={`p-1 ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'} transition-colors`}
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setDeleteProductId(product.id); }}
                        className={`p-1 ml-2 ${isDarkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'} transition-colors`}
                        title="Delete"
                        disabled={isDeleting && deleteProductId === product.id}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </motion.tr>
                ))
              }
            </tbody>
          </table>
        </div>
        {/* Cards for mobile screens */}
        <div className="md:hidden flex flex-col gap-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center min-h-[200px] w-full py-12">
              <Loader2 className={`w-8 h-8 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} animate-spin`} />
              <p className={isDarkMode ? 'text-slate-400' : 'text-slate-600'}>Loading products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className={`text-center py-8 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>No products found.</div>
          ) : (
            products.map((product) => (
              <div
                key={product.id}
                className={`rounded-lg shadow p-4 flex flex-col gap-2 ${isDarkMode ? 'bg-slate-800' : 'bg-white'} cursor-pointer`}
                onClick={() => setSelectedProduct(product)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className={`font-semibold ${isDarkMode ? 'text-blue-300' : 'text-blue-700'}`}>{product.name}</div>
                    <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{product.unit}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={e => { e.stopPropagation(); handleOpenModal(product); }}
                      className={`${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}
                    >
                      <Edit2 size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={e => { e.stopPropagation(); setDeleteProductId(product.id); }}
                      className={`${isDarkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'}`}
                      disabled={isDeleting && deleteProductId === product.id}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
                <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Barcode: <span className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{product.barcode}</span></div>
                <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Created: <span className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{format(product.createdAt, 'MMM d, yyyy, h:mm a')}</span></div>
              </div>
            ))
          )}
        </div>
        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={!!deleteProductId}
          onClose={() => setDeleteProductId(null)}
          title="Delete Product"
          size="sm"
        >
          <div className="space-y-4">
            <p>Are you sure you want to delete this product?</p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeleteProductId(null)} disabled={isDeleting}>Cancel</Button>
              <Button variant="danger" onClick={handleDeleteProduct} isLoading={isDeleting} className="flex items-center justify-center">
                {isDeleting && <Loader2 className="w-4 h-4 animate-spin mx-auto" />}
                Delete
              </Button>
            </div>
          </div>
        </Modal>
        {/* Product Details Modal */}
        <Modal
          isOpen={!!selectedProduct}
          onClose={() => setSelectedProduct(null)}
          title={selectedProduct ? selectedProduct.name : 'Product Details'}
          size="xl"
        >
          {selectedProduct && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Unit</p>
                  <p className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{selectedProduct.unit || '-'}</p>
                </div>
                <div>
                  <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Barcode</p>
                  <p className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{selectedProduct.barcode || '-'}</p>
                </div>
                <div>
                  <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Created At</p>
                  <p className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{format(selectedProduct.createdAt, 'MMM d, yyyy, h:mm a')}</p>
                </div>
              </div>
            </div>
          )}
        </Modal>
        {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
      </div>
    </div>
  );
};

export default Add; 