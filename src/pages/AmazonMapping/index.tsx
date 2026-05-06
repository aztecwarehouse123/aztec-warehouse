import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import Modal from '../../components/modals/Modal';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';

type MappingRow = {
  asin: string;
  sellerSku: string;
  wmsProduct: string;
  wmsCode: string;
};

const initialRows: MappingRow[] = [
  { asin: 'B0ABC12345', sellerSku: 'EARBUDS-01', wmsProduct: 'Wireless Earbuds', wmsCode: 'STK-1001' },
  { asin: 'B0XYZ67890', sellerSku: 'PROBAR-10', wmsProduct: 'Protein Bars', wmsCode: 'STK-2034' },
  { asin: 'B0QWE56789', sellerSku: 'CASE-02', wmsProduct: 'Smartphone Case', wmsCode: 'STK-1408' },
];

const AmazonMapping: React.FC = () => {
  const { isDarkMode } = useTheme();
  const { showToast } = useToast();
  const [rows, setRows] = useState<MappingRow[]>(initialRows);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [form, setForm] = useState({ asin: '', sellerSku: '', wmsProduct: '', wmsCode: '' });

  const openAddModal = () => {
    setForm({ asin: '', sellerSku: '', wmsProduct: '', wmsCode: '' });
    setIsAddModalOpen(true);
  };

  const handleAddMapping = (e: React.FormEvent) => {
    e.preventDefault();
    const asin = form.asin.trim();
    const sellerSku = form.sellerSku.trim();
    const wmsProduct = form.wmsProduct.trim();
    const wmsCode = form.wmsCode.trim();
    if (!asin || !sellerSku || !wmsProduct || !wmsCode) {
      showToast('Fill in ASIN, Seller SKU, WMS product, and WMS code.', 'error');
      return;
    }
    const duplicate = rows.some((r) => r.asin === asin && r.sellerSku === sellerSku);
    if (duplicate) {
      showToast('A mapping with this ASIN and Seller SKU already exists.', 'error');
      return;
    }
    setRows((prev) => [...prev, { asin, sellerSku, wmsProduct, wmsCode }]);
    setIsAddModalOpen(false);
    showToast('Mapping added (local preview until backend is connected).', 'success');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>ASIN / SKU Mapping</h1>
        <p className={`${isDarkMode ? 'text-slate-400' : 'text-slate-500'} mt-1`}>
          Map Amazon identifiers to WMS product records for pick, inventory, and reconciliation flows.
        </p>
      </div>

      <div className={`rounded-lg border p-4 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
          >
            Add mapping
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              isDarkMode ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-700'
            }`}
          >
            Import CSV
          </button>
        </div>
      </div>

      <div className={`rounded-lg border overflow-hidden ${isDarkMode ? 'border-slate-700' : 'border-slate-200'}`}>
        <table className="w-full text-sm">
          <thead className={isDarkMode ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'}>
            <tr>
              <th className="text-left px-4 py-3 text-xs uppercase font-medium">ASIN</th>
              <th className="text-left px-4 py-3 text-xs uppercase font-medium">Seller SKU</th>
              <th className="text-left px-4 py-3 text-xs uppercase font-medium">WMS Product</th>
              <th className="text-left px-4 py-3 text-xs uppercase font-medium">WMS Code</th>
              <th className="text-left px-4 py-3 text-xs uppercase font-medium">Status</th>
            </tr>
          </thead>
          <tbody className={isDarkMode ? 'bg-slate-900' : 'bg-white'}>
            {rows.map((row) => (
              <tr key={`${row.asin}-${row.sellerSku}`} className={`border-t ${isDarkMode ? 'border-slate-800' : 'border-slate-100'}`}>
                <td className={`px-4 py-3 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{row.asin}</td>
                <td className={`px-4 py-3 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{row.sellerSku}</td>
                <td className={`px-4 py-3 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{row.wmsProduct}</td>
                <td className={`px-4 py-3 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>{row.wmsCode}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-md ${
                      isDarkMode ? 'bg-green-500/20 text-green-400' : 'bg-green-500/10 text-green-700'
                    }`}
                  >
                    Mapped
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add ASIN / SKU mapping" size="md">
        <form onSubmit={handleAddMapping} className="space-y-4">
          <Input
            label="ASIN"
            value={form.asin}
            onChange={(e) => setForm((f) => ({ ...f, asin: e.target.value }))}
            placeholder="e.g. B0ABC12345"
            fullWidth
            darkMode={isDarkMode}
          />
          <Input
            label="Seller SKU"
            value={form.sellerSku}
            onChange={(e) => setForm((f) => ({ ...f, sellerSku: e.target.value }))}
            placeholder="Amazon seller SKU"
            fullWidth
            darkMode={isDarkMode}
          />
          <Input
            label="WMS product name"
            value={form.wmsProduct}
            onChange={(e) => setForm((f) => ({ ...f, wmsProduct: e.target.value }))}
            placeholder="Name in your inventory"
            fullWidth
            darkMode={isDarkMode}
          />
          <Input
            label="WMS code"
            value={form.wmsCode}
            onChange={(e) => setForm((f) => ({ ...f, wmsCode: e.target.value }))}
            placeholder="Internal stock / product code"
            fullWidth
            darkMode={isDarkMode}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save mapping</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AmazonMapping;
