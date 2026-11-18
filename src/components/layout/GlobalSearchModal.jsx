import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Package,
  ShoppingCart,
  Users,
  Barcode,
  ArrowRight,
  Clock,
  X,
  MapPin
} from 'lucide-react';
import { getAllProducts } from '../../firebase/productService';
import { getAllOrders } from '../../firebase/orderService';
import { getAllCustomers } from '../../firebase/customerService';

export const GlobalSearchModal = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'product' | 'order' | 'customer' | 'barcode'
  const [searchIndex, setSearchIndex] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onClose ? onClose() : null;
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Load items from local data
  useEffect(() => {
    if (!isOpen) return;

    const loadIndex = async () => {
      try {
        const [prods, ords, custs] = await Promise.all([
          getAllProducts(),
          getAllOrders(),
          getAllCustomers()
        ]);

        const items = [];

        // Products & Barcodes
        prods.forEach(p => {
          items.push({
            type: 'product',
            id: p.id,
            title: p.name,
            details: {
              pack: p.variants?.[0]?.title || p.variants?.[0]?.packSize || p.variants?.[0]?.name || '',
              localName: p.localName || p.tamilName || p.shortDescription || '',
              sku: p.variants?.[0]?.sku || p.sku || 'N/A',
              barcodeValue: p.variants?.[0]?.barcode || p.barcode || 'N/A',
              rack: p.rack || p.storage?.rack || p.location?.rack || p.variants?.[0]?.rack || 'N/A',
              self: p.self || p.shelf || p.storage?.self || p.storage?.shelf || p.location?.self || p.variants?.[0]?.self || 'N/A',
              bin: p.bin || p.storage?.bin || p.location?.bin || p.variants?.[0]?.bin || 'N/A',
              stock: p.totalStock ?? p.stock ?? (p.variants || []).reduce((total, variant) => total + Number(variant.stock || 0), 0),
              price: p.variants?.[0]?.retailPrice ?? p.variants?.[0]?.sellingPrice ?? p.variants?.[0]?.price ?? p.price ?? 0,
              mrp: p.variants?.[0]?.mrp ?? p.variants?.[0]?.marketPrice ?? ''
            },
            subtitle: `${p.categoryName || 'Grocery'} • Stock: ${p.totalStock || 0}`,
            subtitle: '',
            barcode: p.variants?.[0]?.barcode || '',
            path: '/products'
          });

          if (p.variants) {
            p.variants.forEach(v => {
              if (v.barcode) {
                items.push({
                  type: 'barcode',
                  id: `BAR-${v.barcode}`,
                  title: `Barcode: ${v.barcode}`,
                  subtitle: `${p.name} (${v.title || v.packSize}) • ₹${v.retailPrice || 0}`,
                  barcode: v.barcode,
                  path: '/inventory'
                });
              }
            });
          }
        });

        // Orders
        ords.forEach(o => {
          items.push({
            type: 'order',
            id: o.id,
            title: `Order #${o.id} — ${o.customerName}`,
            subtitle: `₹${o.totalAmount} • Status: ${o.status.toUpperCase()} • ${o.paymentMethod}`,
            path: '/orders'
          });
        });

        // Customers
        custs.forEach(c => {
          const mobile = c.mobile || c.phone || c.mobileNumber || c.phoneNumber || 'N/A';
          const customerId = c.customerId || c.id || 'N/A';
          const area = c.area || c.locality || c.address?.area || c.address?.locality || c.address?.city || 'N/A';
          const outstandingBalance = c.outstandingBalance ?? c.outstandingAmount ?? c.dueAmount ?? c.balance ?? c.creditBalance ?? 0;
          items.push({
            type: 'customer',
            id: c.id,
            title: `${c.name} (${c.phone})`,
            subtitle: `${c.totalOrders || 0} Orders • Spent ₹${c.totalSpent || 0} • Smart Coins: ${c.smartCoins || 0}`,
            details: { customerId, mobile, area, outstandingBalance },
            subtitle: '',
            path: '/manual-customers'
          });
        });

        setSearchIndex(items);
      } catch (e) {
        console.warn('Search index load error:', e);
      }
    };

    loadIndex();
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredResults = searchIndex.filter((item) => {
    if (activeFilter !== 'all' && item.type !== activeFilter) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      (item.title || '').toLowerCase().includes(q) ||
      (item.subtitle || '').toLowerCase().includes(q) ||
      (item.barcode && item.barcode.includes(q)) ||
      (item.id || '').toLowerCase().includes(q)
    );
  });

  const handleSelect = (item) => {
    navigate(item.path);
    onClose();
  };

  const getIcon = (type) => {
    switch (type) {
      case 'product':
        return <Package className="w-4 h-4 text-emerald-600" />;
      case 'order':
        return <ShoppingCart className="w-4 h-4 text-blue-600" />;
      case 'customer':
        return <Users className="w-4 h-4 text-purple-600" />;
      case 'barcode':
        return <Barcode className="w-4 h-4 text-amber-600" />;
      default:
        return <Search className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 duration-150 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-5xl overflow-hidden duration-150 bg-white border rounded-2xl shadow-modal border-slate-200 animate-in zoom-in-95">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Order ID, Customer Phone, Product, SKU, or Barcode..."
            autoFocus
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-slate-400 text-slate-900"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-50 border-b border-slate-100 text-xs">
          {[
            { id: 'all', label: 'All Items' },
            { id: 'product', label: 'Products' },
            { id: 'order', label: 'Orders' },
            { id: 'customer', label: 'Customers' },
            { id: 'barcode', label: 'Barcodes' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                activeFilter === tab.id
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="p-2 overflow-y-auto divide-y max-h-96 divide-slate-50">
          {filteredResults.length === 0 ? (
            <div className="py-12 text-xs text-center text-slate-400">
              No matching grocery records found for "{query}".
            </div>
          ) : (
            
filteredResults.map((item) => (
  <div
    key={`${item.type}-${item.id}`}
    onClick={() => handleSelect(item)}
    className={`p-2 flex items-center gap-4 border-b border-slate-100 transition-colors cursor-pointer ${
      item.type === 'product'
        ? 'hover:bg-emerald-50/50'
        : 'rounded-xl hover:bg-slate-50'
    }`}
  >
    <div className="flex-1 min-w-0 space-y-1">

      {/* Product Name & Pack */}
      <div className="flex items-center gap-2 min-w-0 whitespace-nowrap">
        {item.type !== 'product' && (
          <div className="p-2 border rounded-lg bg-slate-100 border-slate-200/60">
            {getIcon(item.type)}
          </div>
        )}

        <span className="text-xs font-extrabold text-slate-900">
          {item.title}
        </span>

        {item.type === 'product' && item.details?.pack && (
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            {item.details.pack}
          </span>
        )}

        {item.type === 'product' && item.details?.localName && (
          <span className="text-[11px] text-slate-500 font-serif truncate">
            ({item.details.localName})
          </span>
        )}
      </div>

      {/* Product SKU, Barcode & Location */}
      {item.type === 'product' && item.details && (
        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500 whitespace-nowrap">

          <span>
            SKU: {item.details.sku}
          </span>

          <span>
            Barcode: {item.details.barcodeValue}
          </span>

          <span className="text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-amber-600" />
            <span>
              Rack {item.details.rack || '—'} /
              Shelf {item.details.self || '—'} /
              Bin {item.details.bin || '—'}
            </span>
          </span>
        </div>
      )}

      {/* Other Search Results */}
      {item.type !== 'product' && (
        <>
          <p className="text-[11px] text-slate-400 truncate">
            {item.subtitle}
          </p>

          {item.type === 'customer' && item.details && (
            <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10px] text-slate-500">
              <span>
                ID: <strong className="text-slate-700">{item.details.customerId}</strong>
              </span>
              <span>
                Mobile: <strong className="text-slate-700">{item.details.mobile}</strong>
              </span>
              <span>
                Area: <strong className="text-slate-700">{item.details.area}</strong>
              </span>
              <span>
                Outstanding: <strong className="text-rose-700">
                  ₹{Number(item.details.outstandingBalance || 0).toLocaleString('en-IN')}
                </strong>
              </span>
            </div>
          )}
        </>
      )}
    </div>

    {/* Price & Stock */}
    <div className="flex items-center justify-between gap-4 text-right shrink-0">

      {item.type === 'product' && item.details && (
        <>
          <div>
            <div className="font-mono text-xs font-black text-slate-900">
              ₹{Number(item.details.price || 0).toFixed(2)}
            </div>

            {item.details.mrp &&
              Number(item.details.mrp) > Number(item.details.price || 0) && (
                <div className="text-[10px] font-mono text-slate-400 line-through">
                  ₹{Number(item.details.mrp).toFixed(2)}
                </div>
              )}
          </div>

          <span className={`text-[10px] font-extrabold px-2 py-1 rounded ${
            Number(item.details.stock) < 5
              ? 'bg-amber-100 text-amber-800'
              : Number(item.details.stock) <= 0
                ? 'bg-rose-100 text-rose-700'
                : 'bg-emerald-100 text-emerald-800'
          }`}>
            Stock: {item.details.stock}
          </span>
        </>
      )}

      {item.type !== 'product' && (
        <>
          <span className="text-[10px] font-mono uppercase bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
            {item.type}
          </span>

          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-700" />
        </>
      )}
    </div>
  </div>
))

          )}
        </div>

        {/* Modal Footer Keybinds */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-400">
          <span>Press ESC to close</span>
          <span>Tip: Press <strong>Ctrl + K</strong> anytime</span>
        </div>
      </div>
    </div>
  );
};
