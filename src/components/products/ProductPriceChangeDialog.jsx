import React, { useState, useEffect } from 'react';
import { IndianRupee, ShieldAlert, ArrowRight } from 'lucide-react';
import { FormModal } from '../common/FormModal';
import { formatCurrency } from '../../utils/formatters';

export const ProductPriceChangeDialog = ({
  isOpen,
  onClose,
  product,
  variant,
  onConfirmPriceChange,
  isLoading = false
}) => {
  const [newSellingPrice, setNewSellingPrice] = useState('');
  const [newMrp, setNewMrp] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (variant) {
      setNewSellingPrice(variant.sellingPrice || '');
      setNewMrp(variant.mrp || '');
      setReason('');
      setError('');
    }
  }, [variant, isOpen]);

  if (!isOpen || !variant || !product) return null;

  const currentSelling = Number(variant.sellingPrice || 0);
  const currentMrp = Number(variant.mrp || 0);
  const purchase = Number(variant.purchasePrice || currentSelling * 0.75);

  const parsedSelling = Number(newSellingPrice) || 0;
  const parsedMrp = Number(newMrp) || 0;

  const newDiscount = Math.max(0, parsedMrp - parsedSelling);
  const newDiscountPct = parsedMrp > 0 ? Math.round((newDiscount / parsedMrp) * 100) : 0;
  const newMargin = Math.max(0, parsedSelling - purchase);
  const newMarginPct = parsedSelling > 0 ? Math.round((newMargin / parsedSelling) * 100) : 0;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!parsedSelling || parsedSelling <= 0) {
      setError('Selling price must be greater than zero.');
      return;
    }
    if (parsedMrp > 0 && parsedSelling > parsedMrp) {
      setError('Selling price cannot exceed MRP.');
      return;
    }
    if (!reason.trim()) {
      setError('Mandatory business reason is required for financial price revisions.');
      return;
    }

    onConfirmPriceChange({
      productId: product.id,
      variantId: variant.id,
      newSellingPrice: parsedSelling,
      newMrp: parsedMrp,
      reason: reason.trim()
    });
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title="High-Risk Price Revision"
      subtitle={`Revise selling price or MRP for ${product.name} (${variant.name})`}
      maxWidth="max-w-lg"
      onSubmit={handleSubmit}
      submitLabel="Authorize Price Revision"
      isSubmitting={isLoading}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-800">
          <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
          <span>
            Price modifications affect customer checkout and are logged to the immutable audit trail.
          </span>
        </div>

        {/* Existing vs Proposed comparison */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Current Rate</span>
            <div className="text-slate-800 font-bold font-sans text-sm">
              {formatCurrency(currentSelling)}
            </div>
            <span className="text-[10px] text-slate-400 font-mono">MRP: {formatCurrency(currentMrp)}</span>
          </div>

          <div>
            <span className="text-[10px] text-emerald-700 uppercase font-semibold block mb-0.5">Proposed Rate</span>
            <div className="text-emerald-800 font-bold font-sans text-sm">
              {formatCurrency(parsedSelling)}
            </div>
            <span className="text-[10px] text-emerald-600 font-mono">
              Margin: {newMarginPct}% ({formatCurrency(newMargin)})
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="input-label">Revised MRP (₹)</label>
            <input
              type="number"
              step="0.5"
              required
              value={newMrp}
              onChange={(e) => {
                setNewMrp(e.target.value);
                if (error) setError('');
              }}
              className="input-text text-xs font-mono"
            />
          </div>

          <div>
            <label className="input-label">
              New Selling Price (₹) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="0.5"
              required
              value={newSellingPrice}
              onChange={(e) => {
                setNewSellingPrice(e.target.value);
                if (error) setError('');
              }}
              className="input-text text-xs font-mono font-bold text-emerald-800"
            />
          </div>
        </div>

        <div>
          <label className="input-label">
            Mandatory Financial Justification <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={2}
            required
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError('');
            }}
            placeholder="e.g. Supplier procurement cost increased by ₹15 / Festival special markdown..."
            className="input-text text-xs"
          />
        </div>

        {error && (
          <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 font-semibold border border-rose-200">
            {error}
          </div>
        )}
      </form>
    </FormModal>
  );
};
