import React, { useState, useEffect } from 'react';
import { Plus, Loader2, RefreshCw, Edit2, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/modals/Modal';
import BarcodeScanModal from '../../components/modals/BarcodeScanModal';
import { db } from '../../config/firebase';
import { collection, addDoc, getDocs, Timestamp, orderBy, query, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { format } from 'date-fns';
import Select from '../../components/ui/Select';

interface ScannedProduct {
  id: string;
  name: string;
  dimensions: { length: string; width: string; height: string };
  weight: string;
  barcode: string;
  createdAt: Date;
}

const Add: React.FC = () => {
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [products, setProducts] = useState<ScannedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({ name: '', length: '', width: '', height: '', weight: '', barcode: '' });
  const [error, setError] = useState<string | null>(null);
  const [editProduct, setEditProduct] = useState<ScannedProduct | null>(null);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isFetchingProductInfo, setIsFetchingProductInfo] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [selectedProduct, setSelectedProduct] = useState<ScannedProduct | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'scannedProducts'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          dimensions: data.dimensions,
          weight: data.weight,
          barcode: data.barcode,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt)
        };
      });
      setProducts(items);
    } catch {
      setError('Failed to fetch products');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (product?: ScannedProduct) => {
    if (product) {
      setForm({
        name: product.name || '',
        length: product.dimensions?.length || '',
        width: product.dimensions?.width || '',
        height: product.dimensions?.height || '',
        weight: product.weight || '',
        barcode: product.barcode || ''
      });
      setEditProduct(product);
    } else {
      setForm({ name: '', length: '', width: '', height: '', weight: '', barcode: '' });
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
        let weightGrams = '';
        if (item.weight && typeof item.weight === 'string') {
          // Try to extract number and unit
          const match = item.weight.match(/([\d.]+)\s*(lbs?|g|grams?)/i);
          if (match) {
            const value = parseFloat(match[1]);
            const unit = match[2].toLowerCase();
            if (unit.startsWith('lb')) {
              weightGrams = (value * 453.592).toFixed(0); // lbs to grams
            } else if (unit.startsWith('g')) {
              weightGrams = value.toString();
            }
          }
        }
        setForm(prev => ({
          ...prev,
          name: item.title || prev.name,
          weight: weightGrams || prev.weight
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
    if (!form.name.trim() || !form.length.trim() || !form.width.trim() || !form.height.trim() || !form.barcode.trim()) {
      setError('All fields except weight are required');
      return;
    }
    setIsLoading(true);
    try {
      if (editProduct) {
        // Edit mode
        const ref = doc(db, 'scannedProducts', editProduct.id);
        await updateDoc(ref, {
          name: form.name,
          dimensions: { length: form.length, width: form.width, height: form.height },
          weight: form.weight,
          barcode: form.barcode
        });
      } else {
        // Add mode
        await addDoc(collection(db, 'scannedProducts'), {
          name: form.name,
          dimensions: { length: form.length, width: form.width, height: form.height },
          weight: form.weight,
          barcode: form.barcode,
          createdAt: Timestamp.fromDate(new Date())
        });
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

  // Filtering and sorting logic
  const filteredProducts = products.filter(product => {
    const searchLower = searchQuery.toLowerCase();
    const matchesName = product.name?.toLowerCase().includes(searchLower);
    const matchesBarcode = product.barcode?.toLowerCase().includes(searchLower);
    return matchesName || matchesBarcode;
  }).sort((a, b) => {
    if (sortBy === 'date') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (sortBy === 'size') {
      // Sort by volume (length * width * height), fallback to 0 if missing
      const getVolume = (p: ScannedProduct) => {
        const d = p.dimensions || {};
        const l = parseFloat(d.length) || 0;
        const w = parseFloat(d.width) || 0;
        const h = parseFloat(d.height) || 0;
        return l * w * h;
      };
      return getVolume(b) - getVolume(a);
    }
    return 0;
  });

  if (!user || (user.role !== 'admin' && user.role !== 'inbound')) {
    return <div className="p-8 text-center text-red-500 font-semibold">You are not authorized to access this page.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Add Products</h1>
          <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mt-1`}>Scan and add new products to your warehouse inventory</p>
        </div>
        <div className="flex items-center gap-2">
        <Button
            variant="secondary"
            onClick={fetchProducts}
            className={`flex items-center gap-2 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isLoading}
            icon={<RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />}
          >
           
          </Button>
          <Button icon={<Plus size={18} />} onClick={() => handleOpenModal()}>
            Add Product
          </Button>
          
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="flex-1 relative">
          <Input
            type="text"
            placeholder="Search by name or barcode"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
            fullWidth
          />
          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-search"><circle cx="7" cy="7" r="6"/><path d="m15 15-3.5-3.5"/></svg>
          </span>
        </div>
        <div className="w-full sm:w-48">
          <Select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            options={[
              { value: 'date', label: 'Date Added' },
              { value: 'size', label: 'Size (Volume)' }
            ]}
            fullWidth
          />
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input
              label="Length (cm)"
              name="length"
              value={form.length}
              onChange={handleChange}
              placeholder="Length"
              required
              fullWidth
            />
            <Input
              label="Width (cm)"
              name="width"
              value={form.width}
              onChange={handleChange}
              placeholder="Width"
              required
              fullWidth
            />
            <Input
              label="Height (cm)"
              name="height"
              value={form.height}
              onChange={handleChange}
              placeholder="Height"
              required
              fullWidth
            />
          </div>
          <Input
            label="Weight (grams)"
            name="weight"
            value={form.weight}
            onChange={handleChange}
            placeholder="Enter weight in grams (optional)"
            fullWidth
          />
          <Input
            label="Barcode"
            name="barcode"
            value={form.barcode}
            onChange={handleChange}
            placeholder="Enter barcode"
            required
            fullWidth
          />
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
      <div className={`overflow-x-auto overflow-y-hidden ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} rounded-lg border`}>
        <table className={`min-w-full divide-y ${isDarkMode ? 'divide-slate-700' : 'divide-slate-200'} ${isDarkMode ? 'bg-slate-800' : 'bg-white'} rounded-lg`}>
          <thead className={isDarkMode ? 'bg-slate-700/50' : 'bg-slate-100'}>
            <tr>
              <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Name</th>
              <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Dimensions (cm)</th>
              <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-500'} uppercase tracking-wider`}>Weight (g)</th>
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
            ) : filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={5} className={`text-center py-8 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>No products found.</td>
              </tr>
            ) : (
              filteredProducts.map((product, index) => (
                <motion.tr
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05, ease: 'easeOut' }}
                  className={`hover:${isDarkMode ? 'bg-slate-700/50' : 'bg-slate-50'} cursor-pointer`}
                  onClick={() => setSelectedProduct(product)}
                >
                  <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-blue-400' : 'text-blue-700'} font-medium`}>{product.name}</td>
                  <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{
                    product.dimensions && typeof product.dimensions === 'object' && product.dimensions.length && product.dimensions.width && product.dimensions.height
                      ? `${product.dimensions.length} x ${product.dimensions.width} x ${product.dimensions.height}`
                      : '-'
                  }</td>
                  <td className={`px-4 py-3 text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{product.weight}</td>
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
            )}
          </tbody>
        </table>
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
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Dimensions</p>
                <p className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{selectedProduct.dimensions && selectedProduct.dimensions.length && selectedProduct.dimensions.width && selectedProduct.dimensions.height ? `${selectedProduct.dimensions.length} x ${selectedProduct.dimensions.width} x ${selectedProduct.dimensions.height} cm` : '-'}</p>
              </div>
              <div>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Weight</p>
                <p className={`font-medium ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{selectedProduct.weight ? `${selectedProduct.weight} g` : '-'}</p>
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
    </div>
  );
};

export default Add; 