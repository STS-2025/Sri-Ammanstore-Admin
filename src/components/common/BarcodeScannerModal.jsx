import React, { useState } from 'react';
import {
  Barcode,
  Scan,
  Search,
  CheckCircle,
  Plus,
  Minus,
  Edit2,
  Calendar,
  IndianRupee,
  Boxes,
  Clock,
  ArrowRight
} from 'lucide-react';
import { FormModal } from './FormModal';
import { formatCurrency } from '../../utils/formatters';
import { getAllProducts, updateVariantPrice } from '../../firebase/productService';
import { recordStockMovement } from '../../firebase/inventoryService';
import { useNotification } from '../../context/NotificationContext';
import { usePermissions } from '../../hooks/usePermissions';

export const BarcodeScannerModal = ({ isOpen, onClose, onProductFound }) => {
  const [scannedCode, setScannedCode] = useState('');
  const [matchedItem, setMatchedItem] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [quickStockDelta, setQuickStockDelta] = useState(1);
  const [quickPrice, setQuickPrice] = useState('');
  const [isEditingPrice, setIsEditingPrice] = useState(false);

  const notify = useNotification();
  const { currentUser } = usePermissions();

  const handleScanOrSubmit = async (e) => {
    if (e) e.preventDefault();
    const cleanCode = scannedCode.trim();
    if (!cleanCode) return;

    setHasSearched(true);
    const products = await getAllProducts();
    let found = null;

    for (const p of products) {
      for (const v of p.variants || []) {
        if (v.barcode === cleanCode || v.sku.toLowerCase() === cleanCode.toLowerCase()) {
          found = {
            productId: p.id,
            productName: p.name,
            tamilName: p.tamilName,
            categoryName: p.categoryName,
            brandName: p.brandName,
            variantId: v.id,
            variantName: v.name,
            weight: v.weight,
            unit: v.unit,
            sku: v.sku,
            barcode: v.barcode,
            purchasePrice: v.purchasePrice,
            mrp: v.mrp,
            sellingPrice: v.sellingPrice,
            stock: v.stock,
            safetyStock: v.safetyStock,
            batchNumber: v.batchNumber || 'B-BATCH-01',
            expiryDate: v.expiryDate || '2027-12-31'
          };
          break;
        }
      }
      if (found) break;
    }

    setMatchedItem(found);
    if (found) {
      setQuickPrice(found.sellingPrice);
      setIsEditingPrice(false);
    }
  };

  const handleQuickStockAdjustment = async (delta) => {
    if (!matchedItem) return;
    try {
      await recordStockMovement({
        productId: matchedItem.productId,
        productName: matchedItem.productName,
        variantId: matchedItem.variantId,
        variantName: matchedItem.variantName,
        sku: matchedItem.sku,
        previousQuantity: matchedItem.stock,
        changedQuantity: delta,
        movementType: delta > 0 ? 'Purchase' : 'Manual Adjustment',
        reason: `Quick scanner adjustment (${delta > 0 ? '+' : ''}${delta})`,
        user: currentUser
      });

      setMatchedItem((prev) => ({ ...prev, stock: Math.max(0, prev.stock + delta) }));
      notify.success(
        'Stock Updated',
        `${matchedItem.productName} adjusted by ${delta > 0 ? '+' : ''}${delta} units.`
      );
    } catch (err) {
      notify.error('Adjustment Failed', err.message);
    }
  };

  const handleQuickPriceUpdate = async () => {
    if (!matchedItem) return;
    const priceNum = Number(quickPrice);
    if (!priceNum || priceNum <= 0) return;

    try {
      await updateVariantPrice(
        matchedItem.productId,
        matchedItem.variantId,
        {
          newSellingPrice: priceNum,
          newMrp: matchedItem.mrp,
          reason: 'Quick price adjustment via handheld barcode scanner terminal'
        },
        currentUser
      );
      setMatchedItem((prev) => ({ ...prev, sellingPrice: priceNum }));
      setIsEditingPrice(false);
      notify.success('Price Updated', `Selling price changed to ${formatCurrency(priceNum)}`);
    } catch (err) {
      notify.error('Price Update Failed', err.message);
    }
  };

  const fillQuickCode = (code) => {
    setScannedCode(code);
    setTimeout(() => {
      handleScanOrSubmit();
    }, 50);
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title="Barcode & SKU Scanner Terminal"
      subtitle="Point hardware scanner or type barcode to inspect and perform immediate stock & price actions."
      maxWidth="max-w-lg"
      showFooter={false}
    >
      <div className="space-y-4">
        {/* Scanner Simulation Viewport */}
        <div className="relative h-36 rounded-xl bg-slate-900 border border-slate-700 flex flex-col items-center justify-center overflow-hidden">
          <div className="absolute inset-x-8 top-1/2 h-0.5 bg-rose-500 shadow-[0_0_8px_#ef4444] animate-pulse" />
          <div className="w-48 h-20 border-2 border-emerald-400/50 rounded-lg flex items-center justify-center relative">
            <Scan className="w-8 h-8 text-emerald-400 animate-pulse" />
            <div className="absolute top-1 left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-emerald-400" />
            <div className="absolute top-1 right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-emerald-400" />
            <div className="absolute bottom-1 left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-emerald-400" />
            <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-emerald-400" />
          </div>
          <span className="text-[10px] font-mono text-emerald-300 mt-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            Awaiting Barcode Input...
          </span>
        </div>

        {/* Input Bar */}
        <form onSubmit={handleScanOrSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={scannedCode}
              onChange={(e) => setScannedCode(e.target.value)}
              placeholder="Scan or enter barcode / SKU..."
              autoFocus
              className="input-text pl-9 font-mono text-xs"
            />
          </div>
          <button type="submit" className="btn-primary text-xs shrink-0">
            <Search className="w-3.5 h-3.5" />
            Scan
          </button>
        </form>

        {/* Quick Barcode Buttons */}
        <div>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Test Barcodes:
          </span>
          <div className="flex flex-wrap gap-1">
            {[
              { label: 'Turmeric 500g', code: '8901030382345' },
              { label: 'Sesame Oil 1L', code: '8901725181222' },
              { label: 'Ponni Rice 5kg', code: '8904004400123' },
              { label: 'Toor Dal 1kg', code: '8901030889123' }
            ].map((b) => (
              <button
                key={b.code}
                type="button"
                onClick={() => fillQuickCode(b.code)}
                className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 hover:bg-emerald-50 text-slate-700 rounded border border-slate-200"
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Result & Quick Action Terminal */}
        {hasSearched && (
          <div className="pt-3 border-t border-slate-100">
            {matchedItem ? (
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3 animate-in fade-in">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">{matchedItem.productName}</h4>
                    {matchedItem.tamilName && (
                      <p className="text-[11px] text-slate-600 font-sans">{matchedItem.tamilName}</p>
                    )}
                    <span className="text-[10px] font-mono text-emerald-800 font-semibold">
                      {matchedItem.variantName} • SKU: {matchedItem.sku}
                    </span>
                  </div>
                  <span className="text-sm font-bold font-sans text-slate-900">
                    {formatCurrency(matchedItem.sellingPrice)}
                  </span>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-3 gap-2 p-2.5 bg-white rounded-lg border border-emerald-100 text-xs font-mono text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Stock SOH</span>
                    <strong className="text-slate-900 font-bold text-sm">{matchedItem.stock}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">MRP</span>
                    <span className="text-slate-700">{formatCurrency(matchedItem.mrp)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Expiry</span>
                    <span className="text-rose-700 font-semibold">{matchedItem.expiryDate}</span>
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="space-y-2 pt-1 border-t border-emerald-100">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                    Immediate Workstation Actions
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => handleQuickStockAdjustment(5)}
                      className="btn-secondary py-1.5 flex items-center justify-center gap-1.5 text-xs text-emerald-800"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add +5 Stock</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickStockAdjustment(-1)}
                      className="btn-secondary py-1.5 flex items-center justify-center gap-1.5 text-xs text-rose-700"
                    >
                      <Minus className="w-3.5 h-3.5" />
                      <span>Deduct -1 Unit</span>
                    </button>
                  </div>

                  {/* Inline Price Revision */}
                  {isEditingPrice ? (
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        value={quickPrice}
                        onChange={(e) => setQuickPrice(e.target.value)}
                        placeholder="New price (₹)"
                        className="input-text text-xs py-1"
                      />
                      <button
                        type="button"
                        onClick={handleQuickPriceUpdate}
                        className="btn-primary text-xs py-1 px-3"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingPrice(false)}
                        className="btn-secondary text-xs py-1"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditingPrice(true)}
                      className="w-full btn-secondary text-xs py-1.5 flex items-center justify-center gap-1.5"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit Price on Terminal</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center text-xs text-amber-800">
                No matching product found for barcode <strong className="font-mono">{scannedCode}</strong>.
              </div>
            )}
          </div>
        )}
      </div>
    </FormModal>
  );
};
