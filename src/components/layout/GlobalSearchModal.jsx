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
  X
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
            subtitle: `${p.categoryName || 'Grocery'} • Stock: ${p.totalStock || 0}`,
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
          items.push({
            type: 'customer',
            id: c.id,
            title: `${c.name} (${c.phone})`,
            subtitle: `${c.totalOrders || 0} Orders • Spent ₹${c.totalSpent || 0} • Smart Coins: ${c.smartCoins || 0}`,
            path: '/customers'
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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-modal border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-150">
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
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
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
        <div className="max-h-96 overflow-y-auto p-2 divide-y divide-slate-50">
          {filteredResults.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No matching grocery records found for "{query}".
            </div>
          ) : (
            filteredResults.map((item) => (
              <div
                key={item.id}
                onClick={() => handleSelect(item)}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-slate-100 group-hover:bg-white transition-colors shrink-0 border border-slate-200/60">
                    {getIcon(item.type)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-900 truncate group-hover:text-emerald-700 transition-colors">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 text-slate-400 group-hover:text-emerald-700">
                  <span className="text-[10px] font-mono uppercase bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                    {item.type}
                  </span>
                  <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
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
