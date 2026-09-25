import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Barcode,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Printer,
  X,
  Scan,
  Check,
  Package,
  Layers,
  Sparkles
} from 'lucide-react';
import { FormModal } from '../common/FormModal';
import { formatCurrency } from '../../utils/formatters';
import { updateItemPickStatus, handleUnavailableProduct } from '../../firebase/orderService';
import { getAllProducts } from '../../firebase/productService';
import { useNotification } from '../../context/NotificationContext';
import { usePermissions } from '../../hooks/usePermissions';

export const PackingWorkstationModal = ({
  isOpen,
  onClose,
  order,
  onOrderUpdated,
  onOpenPrint
}) => {
  const [activeOrder, setActiveOrder] = useState(order);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [unavailableModalOpen, setUnavailableModalOpen] = useState(false);
  const [targetItem, setTargetItem] = useState(null);
  const [allProducts, setAllProducts] = useState([]);

  // Unavailable workflow state
  const [unavailableAction, setUnavailableAction] = useState('replace'); // 'replace' | 'cancel_item' | 'partial_fulfill'
  const [selectedReplacement, setSelectedReplacement] = useState(null);
  const [partialQuantity, setPartialQuantity] = useState(1);
  const [workflowReason, setWorkflowReason] = useState('');

  const notify = useNotification();
  const { currentUser } = usePermissions();

  useEffect(() => {
    setActiveOrder(order);
    getAllProducts().then(setAllProducts);
  }, [order, isOpen]);

  if (!isOpen || !activeOrder) return null;

  // Handle Barcode Scan Item Verification
  const handleBarcodeSubmit = async (e) => {
    e.preventDefault();
    const cleanCode = scannedBarcode.trim();
    if (!cleanCode) return;

    const matchedItem = (activeOrder.items || []).find((i) => i.barcode === cleanCode || i.sku.toLowerCase() === cleanCode.toLowerCase());

    if (matchedItem) {
      try {
        const nextStatus = matchedItem.pickStatus === 'pending' ? 'picked' : 'packed';
        const updated = await updateItemPickStatus(activeOrder.id, matchedItem.id, nextStatus, currentUser);
        setActiveOrder(updated);
        notify.success('Item Verified & Packed', `${matchedItem.productName} marked as ${nextStatus}!`);
        setScannedBarcode('');
        if (onOrderUpdated) onOrderUpdated(updated);
      } catch (err) {
        notify.error('Verification Error', err.message);
      }
    } else {
      notify.error('Barcode Mismatch', `No item matching barcode "${cleanCode}" in this order.`);
    }
  };

  const handleMarkItemStatus = async (itemId, status) => {
    try {
      const updated = await updateItemPickStatus(activeOrder.id, itemId, status, currentUser);
      setActiveOrder(updated);
      notify.success('Item Status Updated', `Item marked as ${status}.`);
      if (onOrderUpdated) onOrderUpdated(updated);
    } catch (err) {
      notify.error('Failed to update item', err.message);
    }
  };

  const handleOpenUnavailable = (item) => {
    setTargetItem(item);
    setUnavailableAction('replace');
    setSelectedReplacement(null);
    setPartialQuantity(1);
    setWorkflowReason('Out of stock on picking rack');
    setUnavailableModalOpen(true);
  };

  const handleExecuteUnavailableWorkflow = async (e) => {
    e.preventDefault();
    if (!targetItem) return;

    try {
      const updated = await handleUnavailableProduct({
        orderId: activeOrder.id,
        itemId: targetItem.id,
        action: unavailableAction,
        replacementVariant: selectedReplacement,
        partialQty: partialQuantity,
        reason: workflowReason,
        user: currentUser
      });

      setActiveOrder(updated);
      notify.success('Unavailable Workflow Processed', `Order recalibrated: new total ${formatCurrency(updated.totalAmount)}`);
      setUnavailableModalOpen(false);
      setTargetItem(null);
      if (onOrderUpdated) onOrderUpdated(updated);
    } catch (err) {
      notify.error('Workflow Failed', err.message);
    }
  };

  const allPacked = (activeOrder.items || []).every((i) => i.pickStatus === 'packed' || i.pickStatus === 'replaced');

  // Available alternative variants across products
  const availableReplacements = [];
  allProducts.forEach((p) => {
    (p.variants || []).forEach((v) => {
      if (v.stock > 0) {
        availableReplacements.push({
          productId: p.id,
          productName: p.name,
          variantId: v.id,
          variantName: v.name,
          sku: v.sku,
          barcode: v.barcode,
          sellingPrice: v.sellingPrice,
          stock: v.stock
        });
      }
    });
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col bg-white rounded-2xl shadow-modal border border-slate-200 overflow-hidden">
        {/* Packing Station Top Bar */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-700 flex items-center justify-center">
              <Boxes className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold font-mono">
                  PACKING STATION: #{activeOrder.orderNumber}
                </span>
                <span className="text-[10px] font-bold uppercase bg-emerald-950 text-emerald-300 border border-emerald-700 px-2 py-0.5 rounded-full">
                  {activeOrder.deliverySlot}
                </span>
              </div>
              <span className="text-xs text-slate-400">
                Customer: {activeOrder.customerName} ({activeOrder.deliveryAddress?.locality})
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {allPacked && (
              <button
                onClick={() => onOpenPrint && onOpenPrint(activeOrder)}
                className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Print Packing Slip & Label</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Barcode Fast Verification Input */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <Scan className="w-4 h-4" />
          </div>
          <form onSubmit={handleBarcodeSubmit} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={scannedBarcode}
                onChange={(e) => setScannedBarcode(e.target.value)}
                placeholder="Scan item barcode to instantly verify & pack..."
                autoFocus
                className="input-text pl-9 text-xs font-mono py-1.5"
              />
            </div>
            <button type="submit" className="btn-primary text-xs shrink-0 py-1.5">
              Verify
            </button>
          </form>
        </div>

        {/* Item Checklist Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase tracking-wider pb-2 border-b">
            <span>Items to Pack ({activeOrder.items?.length || 0})</span>
            <span>Item Checklist State</span>
          </div>

          <div className="divide-y divide-slate-100">
            {(activeOrder.items || []).map((item) => (
              <div
                key={item.id}
                className={`py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3 rounded-xl transition-colors ${
                  item.pickStatus === 'packed'
                    ? 'bg-emerald-50/50 border border-emerald-100'
                    : item.pickStatus === 'picked'
                    ? 'bg-indigo-50/50 border border-indigo-100'
                    : item.pickStatus === 'unavailable'
                    ? 'bg-rose-50/50 border border-rose-200 opacity-60'
                    : 'bg-white border border-slate-200'
                }`}
              >
                {/* Left: Item Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-6 h-6 text-slate-400" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <h5 className="font-bold text-xs text-slate-900 truncate">{item.productName}</h5>
                    {item.tamilName && (
                      <p className="text-[11px] text-slate-500 font-sans">{item.tamilName}</p>
                    )}
                    <div className="flex items-center gap-2 text-[10px] font-mono text-slate-500 mt-0.5">
                      <span>{item.variantName}</span>
                      <span>•</span>
                      <span>SKU: {item.sku}</span>
                      <span>•</span>
                      <span>Barcode: {item.barcode}</span>
                    </div>

                    {item.replacementNote && (
                      <span className="text-[10px] text-purple-700 font-semibold block mt-0.5">
                        ↳ {item.replacementNote}
                      </span>
                    )}
                    {item.cancellationReason && (
                      <span className="text-[10px] text-rose-700 font-semibold block mt-0.5">
                        ↳ Cancelled: {item.cancellationReason}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Quantity & Packing State Buttons */}
                <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                  <div className="text-right font-mono text-xs">
                    <span className="text-[10px] text-slate-400 block">Required Qty</span>
                    <strong className="text-sm font-bold text-slate-900">{item.quantity} pkgs</strong>
                  </div>

                  {/* Pick Status Pills & Toggles */}
                  <div className="flex items-center gap-1.5">
                    {item.pickStatus === 'pending' && (
                      <>
                        <button
                          onClick={() => handleMarkItemStatus(item.id, 'picked')}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100"
                        >
                          Pick
                        </button>
                        <button
                          onClick={() => handleOpenUnavailable(item)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                        >
                          Unavailable
                        </button>
                      </>
                    )}

                    {item.pickStatus === 'picked' && (
                      <>
                        <button
                          onClick={() => handleMarkItemStatus(item.id, 'packed')}
                          className="btn-primary text-xs py-1 px-3 flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Pack</span>
                        </button>
                        <button
                          onClick={() => handleOpenUnavailable(item)}
                          className="px-2 py-1 rounded-lg text-xs text-rose-600 hover:bg-rose-50"
                        >
                          Issue?
                        </button>
                      </>
                    )}

                    {item.pickStatus === 'packed' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Packed</span>
                      </span>
                    )}

                    {item.pickStatus === 'unavailable' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
                        <span>Unavailable</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Station Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">Subtotal: {formatCurrency(activeOrder.subtotal)}</span>
            <span className="text-slate-400">•</span>
            <span className="font-bold text-emerald-800">Grand Total: {formatCurrency(activeOrder.totalAmount)}</span>
          </div>

          <div>
            {allPacked ? (
              <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                All Items Successfully Packed & Ready for Label!
              </span>
            ) : (
              <span className="text-slate-500">
                Please scan or pack all items to complete order.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Unavailable Product Workflow Dialog (Section 11) */}
      <FormModal
        isOpen={unavailableModalOpen}
        onClose={() => setUnavailableModalOpen(false)}
        title="Unavailable Product Workflow"
        subtitle={`Handle missing or damaged stock for "${targetItem?.productName}" (${targetItem?.variantName})`}
        maxWidth="max-w-lg"
        onSubmit={handleExecuteUnavailableWorkflow}
        submitLabel="Commit Item Resolution"
      >
        <form onSubmit={handleExecuteUnavailableWorkflow} className="space-y-4 text-xs">
          <div>
            <label className="input-label">Select Operational Resolution</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'replace', label: 'Suggest Replacement' },
                { id: 'partial_fulfill', label: 'Partial Fulfill' },
                { id: 'cancel_item', label: 'Cancel & Refund' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setUnavailableAction(opt.id)}
                  className={`p-2.5 rounded-xl border text-center font-semibold transition-all ${
                    unavailableAction === opt.id
                      ? 'bg-emerald-800 text-white border-emerald-800 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Replacement selector */}
          {unavailableAction === 'replace' && (
            <div>
              <label className="input-label">Available Substitute Variant</label>
              <select
                value={selectedReplacement?.variantId || ''}
                onChange={(e) => {
                  const found = availableReplacements.find((r) => r.variantId === e.target.value);
                  setSelectedReplacement(found);
                }}
                className="input-text text-xs"
              >
                <option value="">-- Choose in-stock grocery item --</option>
                {availableReplacements.map((r) => (
                  <option key={r.variantId} value={r.variantId}>
                    {r.productName} ({r.variantName}) — {formatCurrency(r.sellingPrice)} (Stock: {r.stock})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Partial quantity */}
          {unavailableAction === 'partial_fulfill' && (
            <div>
              <label className="input-label">Available Quantity to Pack</label>
              <input
                type="number"
                min="1"
                max={targetItem?.quantity || 1}
                value={partialQuantity}
                onChange={(e) => setPartialQuantity(Number(e.target.value))}
                className="input-text text-xs font-mono font-bold"
              />
              <span className="text-[10px] text-slate-400">Original order was {targetItem?.quantity} units.</span>
            </div>
          )}

          <div>
            <label className="input-label">Staff Operational Justification</label>
            <textarea
              rows={2}
              required
              value={workflowReason}
              onChange={(e) => setWorkflowReason(e.target.value)}
              placeholder="e.g. Shelf damaged / Out of stock; customer consented via WhatsApp..."
              className="input-text text-xs"
            />
          </div>
        </form>
      </FormModal>
    </div>
  );
};
