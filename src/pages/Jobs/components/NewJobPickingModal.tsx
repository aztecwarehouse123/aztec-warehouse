import React from 'react';
import { Plus, RefreshCw, Search, ArrowLeft, Calculator, Clock, CheckSquare, Square } from 'lucide-react';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import Modal from '../../../components/modals/Modal';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import type { JobItem, StockItem } from '../../../types';
import { formatJobTimer } from '../utils/formatters';
import { MAX_TROLLEY_NUMBER } from '../constants';
import {
  allRequiredNewJobItemsConfirmed,
  getNewJobItemKey,
  newJobItemRequiresConfirmation,
} from '../utils/newJobItemConfirmation';

export type NewJobEditingItemState = {
  index: number;
  barcode: string;
  quantity: number;
  reason?: string;
  storeName?: string;
  name?: string | null;
} | null;

export type NewJobPickingModalProps = {
  isOpen: boolean;
  onRequestClose: () => void;
  isDarkMode: boolean;
  showSearchSection: boolean;
  setShowSearchSection: React.Dispatch<React.SetStateAction<boolean>>;
  setIsCalculatorModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  elapsedTime: number;
  showHurryUpAlert: boolean;
  setShowHurryUpAlert: React.Dispatch<React.SetStateAction<boolean>>;
  searchType: 'name' | 'barcode' | 'asin';
  setSearchType: React.Dispatch<React.SetStateAction<'name' | 'barcode' | 'asin'>>;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  searchResults: StockItem[];
  isSearching: boolean;
  searchInventory: (q: string, t: 'name' | 'barcode' | 'asin') => void;
  manualBarcode: string;
  setManualBarcode: React.Dispatch<React.SetStateAction<string>>;
  handleManualBarcodeSubmit: (e: React.FormEvent) => void;
  newJobItems: JobItem[];
  setNewJobItems: React.Dispatch<React.SetStateAction<JobItem[]>>;
  editingItem: NewJobEditingItemState;
  setEditingItem: React.Dispatch<React.SetStateAction<NewJobEditingItemState>>;
  setPendingStockUpdates: React.Dispatch<
    React.SetStateAction<
      Array<{
        stockItem: StockItem;
        deductedQuantity: number;
        reason: string;
        storeName: string;
        locationCode: string;
        shelfNumber: string;
      }>
    >
  >;
  userName?: string;
  selectedTrolleyNumber: number | null;
  setSelectedTrolleyNumber: React.Dispatch<React.SetStateAction<number | null>>;
  usedTrolleyNumbers: Set<number>;
  confirmedItemKeys: Set<string>;
  onToggleItemConfirmed: (key: string) => void;
  finishNewJobPicking: () => void;
  isJobCreationInProgress: boolean;
};

const NewJobPickingModal: React.FC<NewJobPickingModalProps> = ({
  isOpen,
  onRequestClose,
  isDarkMode,
  showSearchSection,
  setShowSearchSection,
  setIsCalculatorModalOpen,
  elapsedTime,
  showHurryUpAlert,
  setShowHurryUpAlert,
  searchType,
  setSearchType,
  searchQuery,
  setSearchQuery,
  searchResults,
  isSearching,
  searchInventory,
  manualBarcode,
  setManualBarcode,
  handleManualBarcodeSubmit,
  newJobItems,
  setNewJobItems,
  editingItem,
  setEditingItem,
  setPendingStockUpdates,
  userName,
  selectedTrolleyNumber,
  setSelectedTrolleyNumber,
  usedTrolleyNumbers,
  confirmedItemKeys,
  onToggleItemConfirmed,
  finishNewJobPicking,
  isJobCreationInProgress,
}) => {
  const usedTrolleyList = Array.from(usedTrolleyNumbers).sort((a, b) => a - b);
  const trolleyInUse =
    selectedTrolleyNumber != null && usedTrolleyNumbers.has(selectedTrolleyNumber);
  const trolleyOutOfRange =
    selectedTrolleyNumber != null &&
    (selectedTrolleyNumber < 1 || selectedTrolleyNumber > MAX_TROLLEY_NUMBER);
  const allItemsConfirmed = allRequiredNewJobItemsConfirmed(newJobItems, confirmedItemKeys);
  const pendingConfirmationCount = newJobItems.filter(
    (item, index) =>
      newJobItemRequiresConfirmation(item) &&
      !confirmedItemKeys.has(getNewJobItemKey(item, index))
  ).length;

  const handleTrolleyChange = (raw: string) => {
    if (raw.trim() === '') {
      setSelectedTrolleyNumber(null);
      return;
    }

    const num = parseInt(raw, 10);
    if (Number.isNaN(num)) {
      setSelectedTrolleyNumber(null);
      return;
    }

    setSelectedTrolleyNumber(num);
  };

  return (
    <>
      {/* New Job Picking Modal */}
      <Modal
        isOpen={isOpen}
        onClose={onRequestClose} 
  title={showSearchSection ? "Search Product from Inventory" : "Add Barcode to Job"}
        size="md"
        closeOnOutsideClick={false}
      >
        <div className="space-y-4">

    {/* Search Toggle Button, Timer, and Calculator - Only show when search section is closed */}
    {!showSearchSection && (
      <div className="flex justify-between items-center gap-2">
        <div className="flex gap-2">
          <button
            onClick={() => setShowSearchSection(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-md transition-colors bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600"
            title="Show search section"
          >
            <Search size={16} />
            <span className="text-sm font-medium">Search Product</span>
          </button>

          {/* Calculator Button */}
          <Button
            variant="secondary"
            onClick={() => setIsCalculatorModalOpen(true)}
            size="sm"
            className="px-3 py-2"
          >
            <Calculator size={16} />
          </Button>
        </div>

        {/* Timer Display */}
        <div className={`flex items-center gap-2 px-3 py-2 rounded-md ${
          elapsedTime >= 600 
            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
        }`}>
          <Clock size={16} />
          <span className="text-sm font-mono font-medium">
            {formatJobTimer(elapsedTime)}
          </span>
        </div>
      </div>
    )}

    {/* Hurry Up Alert - Show in both search and non-search modes */}
    {showHurryUpAlert && (
      <div className={`p-3 rounded-md border-l-4 ${
        isDarkMode 
          ? 'bg-red-900/20 border-red-500 text-red-200' 
          : 'bg-red-50 border-red-500 text-red-800'
      }`}>
        <div className="flex items-center gap-2">
          <div className="animate-pulse">⚠️</div>
          <span className="font-medium">
            {elapsedTime >= 600 && elapsedTime < 900 
              ? "Hurry up! You've been working on this job for 10+ minutes."
              : `Time Alert: ${Math.floor(elapsedTime / 60)} minutes elapsed. Please complete the job soon.`
            }
          </span>
          <button
            onClick={() => setShowHurryUpAlert(false)}
            className={`ml-auto px-2 py-1 rounded text-xs ${
              isDarkMode 
                ? 'bg-red-800 hover:bg-red-700 text-red-200' 
                : 'bg-red-200 hover:bg-red-300 text-red-800'
            }`}
          >
            Dismiss
          </button>
        </div>
      </div>
    )}

    {/* Search Section - Full screen when active */}
    {showSearchSection && (
      <div className="space-y-4">
                        {/* Search Header with Back Button, Timer, and Calculator */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSearchSection(false)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                  isDarkMode 
                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white' 
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300 hover:text-slate-800'
                }`}
                title="Back to Add Barcode"
              >
                <ArrowLeft size={16} />
                <span className="text-sm font-medium">Back to Add Barcode</span>
              </button>

              {/* Calculator Button */}
              <Button
                variant="secondary"
                onClick={() => setIsCalculatorModalOpen(true)}
                size="sm"
                className="px-3 py-2"
              >
                <Calculator size={16} />
              </Button>
            </div>

            {/* Timer Display */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-md ${
              elapsedTime >= 600 
                ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' 
                : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
            }`}>
              <Clock size={16} />
              <span className="text-sm font-mono font-medium">
                {formatJobTimer(elapsedTime)}
              </span>
            </div>
          </div>

        {/* Search Type Selector */}
        <div className="flex gap-2 mb-3">
          {(['name', 'barcode', 'asin'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setSearchType(type)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                searchType === type
                  ? 'bg-blue-500 text-white'
                  : isDarkMode
                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="flex gap-2 mb-3">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search by ${searchType}...`}
            className="flex-1"
            onKeyPress={(e) => e.key === 'Enter' && searchInventory(searchQuery, searchType)}
          />
          <Button
            onClick={() => searchInventory(searchQuery, searchType)}
            disabled={isSearching || !searchQuery.trim()}
            size="sm"
            className="px-4"
          >
            {isSearching ? <RefreshCw size={14} className="animate-spin" /> : 'Search'}
          </Button>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="space-y-2 max-h-48 overflow-auto">
            <h5 className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Found {searchResults.length} product{searchResults.length !== 1 ? 's' : ''}:
            </h5>
            {searchResults.map((item) => (
              <div
                key={item.id}
                className={`p-2 rounded text-sm ${
                  isDarkMode ? 'bg-slate-700 border border-slate-600' : 'bg-slate-100 border border-slate-200'
                }`}
              >
                <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                  {item.name}
                </div>
                <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {item.barcode && <span className="mr-3">Barcode: {item.barcode}</span>}
                  {item.asin && <span className="mr-3">ASIN: {item.asin}</span>}
                  {item.locationCode && item.shelfNumber && (
                    <span className="mr-3">Location: {item.locationCode}-{item.shelfNumber}</span>
                  )}
                  <span className="mr-3">Qty: {item.quantity}</span>
                  <span>Store: {item.storeName?.toUpperCase()}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {searchQuery && searchResults.length === 0 && !isSearching && (
          <div className={`text-center text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            No products found for "{searchQuery}"
          </div>
        )}
      </div>
    )}

    {/* Barcode Input Field - Only show when search section is closed */}
    {!showSearchSection && (
      <>
    <div className="space-y-2">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
        Barcode
      </label>
      <form onSubmit={handleManualBarcodeSubmit} className="flex gap-2">
        <Input
          name="manualBarcode"
          type="text"
          value={manualBarcode}
          onChange={(e) => setManualBarcode(e.target.value)}
          placeholder="Enter barcode manually"
          fullWidth
        />
        <Button 
          type="submit" 
          className="flex items-center gap-1 whitespace-nowrap"
          size='sm'
        >
          <Plus size={16} /> Add
        </Button>
      </form>
    </div>

    <div className="text-center text-sm text-slate-500 dark:text-slate-400">
      Enter a barcode to update stock quantity for this job
    </div>
      </>
    )}

    {/* Display current job items */}
    {!showSearchSection && newJobItems.length > 0 && (
      <div className="space-y-2">
        <h4 className={`text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
          Current Job Items:
        </h4>
        <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Tick each product after reading its box size and packing material. Items without that info do not need a tick.
        </p>
        <div className="max-h-40 overflow-auto space-y-1">
          {newJobItems.map((item, index) => {
            const itemKey = getNewJobItemKey(item, index);
            const requiresConfirmation = newJobItemRequiresConfirmation(item);
            const isConfirmed = confirmedItemKeys.has(itemKey);

            return (
            <div key={itemKey} className={`flex items-start justify-between gap-2 p-2 rounded text-sm ${isDarkMode ? 'bg-slate-800' : 'bg-slate-100'}`}>
              {editingItem?.index === index ? (
                // Edit mode
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    value={editingItem.barcode}
                    onChange={(e) => setEditingItem({...editingItem, barcode: e.target.value})}
                    className="w-24 text-sm"
                    //size="sm"
                  />
                <Input
                  type="number"
                    value={String(editingItem.quantity)}
                    onChange={(e) => setEditingItem({...editingItem, quantity: Number(e.target.value) || 1})}
                    className="w-16 text-sm"
                    //size="sm"
                  min="1"
                />
                  <div className="flex gap-1">
                <Button 
                  size="sm" 
                      onClick={() => {
                        const oldQuantity = newJobItems[index].quantity;
                        const newQuantity = Number(editingItem.quantity);
                        const quantityDifference = newQuantity - oldQuantity;

                        // Update job items
                        setNewJobItems(prev => {
                          const updated = [...prev];
                          updated[index] = { ...updated[index], barcode: editingItem.barcode, quantity: newQuantity, reason: editingItem.reason || 'Unknown', storeName: editingItem.storeName || 'Unknown', name: editingItem.name || null };
                          return updated;
                        });

                        // Update pending stock updates to reflect the quantity change
                        setPendingStockUpdates(prev => {
                          const updated = [...prev];
                          // Find the corresponding pending update for this item
                          const pendingIndex = updated.findIndex(update => 
                            update.stockItem.barcode === editingItem.barcode &&
                            update.locationCode === newJobItems[index].locationCode &&
                            update.shelfNumber === newJobItems[index].shelfNumber
                          );

                          if (pendingIndex >= 0) {
                            // Adjust the deducted quantity based on the change
                            updated[pendingIndex] = {
                              ...updated[pendingIndex],
                              deductedQuantity: updated[pendingIndex].deductedQuantity + quantityDifference
                            };
                          }

                          return updated;
                        });

                        // Update the active session items in Firebase
                        const sessionQuery = query(
                          collection(db, 'liveJobSessions'),
                          where('createdBy', '==', userName),
                          where('isActive', '==', true)
                        );
                        getDocs(sessionQuery).then(sessionSnapshot => {
                          if (!sessionSnapshot.empty) {
                            const sessionDoc = sessionSnapshot.docs[0];
                            const currentItems = sessionDoc.data().items || [];
                            const updatedItems = currentItems.map((item: JobItem) => 
                              item.barcode === newJobItems[index].barcode &&
                              item.locationCode === newJobItems[index].locationCode &&
                              item.shelfNumber === newJobItems[index].shelfNumber
                                ? { ...item, barcode: editingItem.barcode, quantity: newQuantity, reason: editingItem.reason || 'Unknown', storeName: editingItem.storeName || 'Unknown', name: editingItem.name || null }
                                : item
                            );

                            updateDoc(doc(db, 'liveJobSessions', sessionDoc.id), {
                              items: updatedItems
                            });
                          }
                        }).catch(error => {
                          console.log('error', error);
                        });

                        setEditingItem(null);
                      }}
                      className="h-6 px-2"
                >
                  ✓
                </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setEditingItem(null)}
                      className="h-6 px-2"
                    >
                      ✕
                    </Button>
                  </div>
              </div>
            ) : (
                // Display mode
                <>
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => requiresConfirmation && onToggleItemConfirmed(itemKey)}
                      disabled={!requiresConfirmation}
                      className={`flex-shrink-0 mt-0.5 p-1 rounded transition-colors ${
                        !requiresConfirmation
                          ? isDarkMode
                            ? 'text-slate-600 cursor-not-allowed'
                            : 'text-slate-300 cursor-not-allowed'
                          : isConfirmed
                            ? isDarkMode
                              ? 'text-emerald-400 hover:text-emerald-300'
                              : 'text-emerald-600 hover:text-emerald-700'
                            : isDarkMode
                              ? 'text-slate-400 hover:text-slate-200'
                              : 'text-slate-500 hover:text-slate-700'
                      }`}
                      title={
                        !requiresConfirmation
                          ? 'No box/packing info — tick not required'
                          : isConfirmed
                            ? 'Confirmed — click to unconfirm'
                            : 'Tick to confirm you have read this product info'
                      }
                    >
                      {isConfirmed ? <CheckSquare size={18} /> : <Square size={18} />}
                    </button>
                  <div className="flex-1 min-w-0">
                    <span className="truncate block font-medium">{item.name || item.barcode}</span>
                    {item.name && (
                      <span className="text-xs text-slate-500 block">
                        Barcode: {item.barcode}
                      </span>
                    )}
                    {item.locationCode && item.shelfNumber && (
                      <span className="text-xs text-slate-500 block">
                        Location: {item.locationCode} - Shelf {item.shelfNumber}
                      </span>
                    )}
                    {item.reason && (
                      <span className="text-xs text-slate-500 block">
                        Reason: {item.reason}
                      </span>
                    )}
                    {item.storeName && (
                      <span className="text-xs text-slate-500 block">
                        Store: {item.storeName?.toUpperCase()}
                      </span>
                    )}
                    <span className={`text-xs font-semibold block ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                      Box Size: {item.boxSize || '-'}
                    </span>
                    <span className={`text-xs font-semibold block ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
                      Packing Material: {item.packingMaterial || '-'}
                    </span>
                    {!requiresConfirmation && (
                      <span className={`text-xs block ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                        No box/packing info — tick not required
                      </span>
                    )}
                  </div>
                  </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-slate-500">Qty: {item.quantity}</span>
                <Button 
                  variant="secondary" 
                  size="sm" 
                      onClick={() => setEditingItem({index, barcode: item.barcode, quantity: item.quantity, reason: item.reason, storeName: item.storeName, name: item.name})}
                      className="h-6 px-2"
                >
                  Edit
                </Button>
                    <button
                      type="button"
                      onClick={() => {
                        // Remove from job items
                        setNewJobItems(prev => prev.filter((_, i) => i !== index));

                        const itemToRemove = newJobItems[index];

                        // Remove corresponding pending stock update
                        setPendingStockUpdates(prev => {
                          return prev.filter(update => 
                            !(update.stockItem.barcode === itemToRemove.barcode &&
                              update.locationCode === itemToRemove.locationCode &&
                              update.shelfNumber === itemToRemove.shelfNumber)
                          );
                        });

                        // Update the active session items in Firebase
                        const sessionQuery = query(
                          collection(db, 'liveJobSessions'),
                          where('createdBy', '==', userName),
                          where('isActive', '==', true)
                        );
                        getDocs(sessionQuery).then(sessionSnapshot => {
                          if (!sessionSnapshot.empty) {
                            const sessionDoc = sessionSnapshot.docs[0];
                            const currentItems = sessionDoc.data().items || [];
                            const updatedItems = currentItems.filter((item: JobItem) => 
                              !(item.barcode === itemToRemove.barcode &&
                                item.locationCode === itemToRemove.locationCode &&
                                item.shelfNumber === itemToRemove.shelfNumber)
                            );

                            updateDoc(doc(db, 'liveJobSessions', sessionDoc.id), {
                              items: updatedItems
                            });
                          }
                        }).catch(error => {
                          console.log('error', error);
                        });
                      }}
                      className={`h-6 w-6 rounded flex items-center justify-center text-white bg-red-500 hover:bg-red-600 transition-colors ${isDarkMode ? 'hover:bg-red-600' : 'hover:bg-red-600'}`}
                      title="Remove item"
                    >
                      ×
                    </button>
              </div>
                </>
            )}
            </div>
            );
          })}
        </div>
        {pendingConfirmationCount > 0 && (
          <p className={`text-xs ${isDarkMode ? 'text-amber-400' : 'text-amber-700'}`}>
            {pendingConfirmationCount} product{pendingConfirmationCount !== 1 ? 's' : ''} still need confirming before finish picking.
          </p>
        )}
      </div>
    )}

    {/* Trolley Number Input - Always visible when not in search section */}
    {!showSearchSection && (
      <>
        <div className="pt-2 space-y-2">
          <label className={`block text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
            Trolley Number <span className="text-red-500">*</span>
          </label>
          <Input
            type="number"
            min={1}
            max={MAX_TROLLEY_NUMBER}
            value={selectedTrolleyNumber ?? ''}
            onChange={(e) => handleTrolleyChange(e.target.value)}
            placeholder={`Enter trolley number (1–${MAX_TROLLEY_NUMBER})`}
            fullWidth
          />
          <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            Enter one trolley number. Trolleys already in use on active jobs cannot be selected.
          </p>
          {usedTrolleyList.length > 0 && (
            <p className={`text-xs ${isDarkMode ? 'text-amber-400' : 'text-amber-700'}`}>
              In use: {usedTrolleyList.join(', ')}
            </p>
          )}
          {trolleyInUse && (
            <p className={`text-xs ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
              Trolley {selectedTrolleyNumber} is already in use. Choose a different number.
            </p>
          )}
          {trolleyOutOfRange && (
            <p className={`text-xs ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
              Trolley number must be between 1 and {MAX_TROLLEY_NUMBER}.
            </p>
          )}
          {selectedTrolleyNumber == null && (
            <p className={`text-xs ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
              Please enter a trolley number before finishing picking
            </p>
          )}
        </div>

        {/* Finish Picking Button */}
        <div className="pt-2">
            <Button 
            onClick={finishNewJobPicking}
            disabled={
              newJobItems.length === 0 ||
              isJobCreationInProgress ||
              selectedTrolleyNumber == null ||
              trolleyInUse ||
              trolleyOutOfRange ||
              !allItemsConfirmed
            }
            isLoading={isJobCreationInProgress}
            className="w-full flex items-center justify-center gap-2"
              size="sm" 
            >
            <CheckSquare size={16} /> 
            {isJobCreationInProgress ? 'Creating Job...' : 'Finish Picking'}
            </Button>
          </div>
      </>
    )}

        </div>
      </Modal>
    </>
  );
};

export default NewJobPickingModal;
