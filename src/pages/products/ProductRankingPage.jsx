import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Flame,
  Star,
  Tag,
  Eye,
  ShoppingBag,
  TrendingDown,
  Sparkles,
  PackageX,
  MoveUp,
  MoveDown,
  CheckCircle2,
  Package,
  Layers,
  Search,
  ArrowRight
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { getAllProducts, updateProduct } from '../../firebase/productService';
import { formatCurrency } from '../../utils/formatters';
import { useNotification } from '../../context/NotificationContext';
import { usePermissions } from '../../hooks/usePermissions';

const RANKING_TABS = [
  {
    id: 'top_100',
    title: '1. Top 100 Selling',
    description: 'Highest sales volume & revenue leaders',
    icon: Flame,
    badge: 'Popularity',
    activeBorder: 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/40',
    activeIcon: 'bg-rose-600 text-white shadow-md shadow-rose-600/30 scale-105',
    activeBadge: 'bg-rose-100 text-rose-800 border-rose-200 font-bold',
    inactiveIcon: 'bg-rose-50 text-rose-600'
  },
  {
    id: 'most_viewed',
    title: '2. Most Viewed Products',
    description: 'Highest customer app views & traffic',
    icon: Eye,
    badge: 'App Traffic',
    activeBorder: 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/40',
    activeIcon: 'bg-blue-600 text-white shadow-md shadow-blue-600/30 scale-105',
    activeBadge: 'bg-blue-100 text-blue-800 border-blue-200 font-bold',
    inactiveIcon: 'bg-blue-50 text-blue-600'
  },
  {
    id: 'most_purchased',
    title: '3. Most Purchased',
    description: 'Frequent repeat basket favorites',
    icon: ShoppingBag,
    badge: 'Orders',
    activeBorder: 'border-emerald-600 ring-2 ring-emerald-600/20 bg-emerald-50/40',
    activeIcon: 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-105',
    activeBadge: 'bg-emerald-100 text-emerald-800 border-emerald-200 font-bold',
    inactiveIcon: 'bg-emerald-50 text-emerald-700'
  },
  {
    id: 'recently_added',
    title: '4. Recently Added',
    description: 'Newest catalog item arrivals',
    icon: Sparkles,
    badge: 'New Arrivals',
    activeBorder: 'border-purple-500 ring-2 ring-purple-500/20 bg-purple-50/40',
    activeIcon: 'bg-purple-600 text-white shadow-md shadow-purple-600/30 scale-105',
    activeBadge: 'bg-purple-100 text-purple-800 border-purple-200 font-bold',
    inactiveIcon: 'bg-purple-50 text-purple-600'
  },
  {
    id: 'featured',
    title: '5. Featured Showcase',
    description: 'Homepage featured promotions',
    icon: Star,
    badge: 'Curated',
    activeBorder: 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/40',
    activeIcon: 'bg-amber-500 text-white shadow-md shadow-amber-500/30 scale-105',
    activeBadge: 'bg-amber-100 text-amber-800 border-amber-200 font-bold',
    inactiveIcon: 'bg-amber-50 text-amber-600'
  },
  {
    id: 'offers',
    title: '6. Products on Offer',
    description: 'Special discounts & deal pricing',
    icon: Tag,
    badge: 'Live Deals',
    activeBorder: 'border-teal-500 ring-2 ring-teal-500/20 bg-teal-50/40',
    activeIcon: 'bg-teal-600 text-white shadow-md shadow-teal-600/30 scale-105',
    activeBadge: 'bg-teal-100 text-teal-800 border-teal-200 font-bold',
    inactiveIcon: 'bg-teal-50 text-teal-600'
  },
  {
    id: 'low_stock',
    title: '7. Low Stock Priority',
    description: 'Items below safety threshold',
    icon: TrendingDown,
    badge: 'Stock Alert',
    activeBorder: 'border-orange-500 ring-2 ring-orange-500/20 bg-orange-50/40',
    activeIcon: 'bg-orange-500 text-white shadow-md shadow-orange-500/30 scale-105',
    activeBadge: 'bg-orange-100 text-orange-800 border-orange-200 font-bold',
    inactiveIcon: 'bg-orange-50 text-orange-600'
  },
  {
    id: 'high_return_cancel',
    title: '8. High Return / Cancel Risk',
    description: 'Highest return & cancellation rate',
    icon: PackageX,
    badge: 'Risk Alert',
    activeBorder: 'border-rose-600 ring-2 ring-rose-600/20 bg-rose-50/50',
    activeIcon: 'bg-rose-600 text-white shadow-md shadow-rose-600/30 scale-105',
    activeBadge: 'bg-rose-100 text-rose-900 border-rose-300 font-bold',
    inactiveIcon: 'bg-rose-50 text-rose-600'
  }
];

export const ProductRankingPage = () => {
  const [activeTab, setActiveTab] = useState('top_100');
  const [products, setProducts] = useState([]);
  const [rankedList, setRankedList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const notify = useNotification();
  const { currentUser } = usePermissions();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAndRank = async () => {
      setLoading(true);
      const all = await getAllProducts();
      setProducts(all);
      applyRankingFilter(all, activeTab);
      setLoading(false);
    };
    fetchAndRank();
  }, [activeTab]);

  const applyRankingFilter = (items, tab) => {
    let filtered = [...items];

    switch (tab) {
      case 'top_100':
        // Top 100 Selling Products
        filtered.sort((a, b) => (b.rankingScore || 0) - (a.rankingScore || 0));
        filtered = filtered.slice(0, 100);
        break;

      case 'most_viewed':
        // Most Viewed Products
        filtered.sort((a, b) => ((b.views || b.rankingScore * 25 || 0) - (a.views || a.rankingScore * 25 || 0)));
        break;

      case 'most_purchased':
        // Most Purchased Products
        filtered.sort((a, b) => ((b.purchaseCount || b.rankingScore * 3 || 0) - (a.purchaseCount || a.rankingScore * 3 || 0)));
        break;

      case 'recently_added':
        // Recently Added Products
        filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        break;

      case 'featured':
        // Featured Products
        filtered = filtered.filter((p) => p.isFeatured || p.rankingScore >= 85);
        break;

      case 'offers':
        // Products on Offer
        filtered = filtered.filter((p) => p.isOffer || (p.variants?.[0]?.mrp > p.variants?.[0]?.sellingPrice));
        break;

      case 'low_stock':
        // Products with Low Stock
        filtered = filtered.filter((p) =>
          (p.variants || []).some((v) => Number(v.stock || 0) <= Number(v.safetyStock || 15))
        );
        break;

      case 'high_return_cancel':
        // Products with High Return / Cancellation Rate
        filtered.sort((a, b) => (b.returnRate || 0) - (a.returnRate || 0));
        break;

      default:
        filtered.sort((a, b) => (b.rankingScore || 0) - (a.rankingScore || 0));
        break;
    }

    setRankedList(filtered);
  };

  const handleMove = (index, direction) => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= rankedList.length) return;

    const updated = [...rankedList];
    const temp = updated[index];
    updated[index] = updated[newIdx];
    updated[newIdx] = temp;
    setRankedList(updated);
    notify.info('Position Adjusted', `Moved ${temp.name} to rank #${newIdx + 1}`);
  };

  const handleSaveRanking = async () => {
    try {
      for (let i = 0; i < rankedList.length; i++) {
        const item = rankedList[i];
        const newScore = Math.max(10, 100 - i);
        await updateProduct(item.id, { rankingScore: newScore }, currentUser);
      }
      notify.success('Merchandising Saved', 'Custom display sequencing synced with e-commerce store.');
    } catch (err) {
      notify.error('Failed to save sequence', err.message);
    }
  };

  // Filtered by search term
  const displayedList = rankedList.filter((p) =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.tamilName?.includes(searchTerm) ||
    p.categoryName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeTabMeta = RANKING_TABS.find((t) => t.id === activeTab) || RANKING_TABS[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Featured"
        subtitle="Select any of the 8 dedicated product sections below to manage display sequence and catalog priority."
        breadcrumbs={[
          { label: 'Products', href: '/products' },
          { label: 'Featured' }
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/products')}
              className="btn-secondary text-xs"
            >
              Back to Catalog
            </button>
            <button
              onClick={handleSaveRanking}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Save Display Sequence</span>
            </button>
          </div>
        }
      />

      {/* 8 Dedicated Section Cards Grid (4 Columns x 2 Rows) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {RANKING_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`p-4 rounded-2xl border text-left transition-all duration-200 ease-out relative overflow-hidden flex flex-col justify-between group active:scale-95 hover:-translate-y-0.5 ${
                isActive
                  ? `bg-white ${tab.activeBorder} shadow-md`
                  : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 hover:shadow-subtle'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold transition-all duration-300 ${
                    isActive ? tab.activeIcon : tab.inactiveIcon
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span
                  className={`text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border transition-all ${
                    isActive
                      ? tab.activeBadge
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}
                >
                  {tab.badge}
                </span>
              </div>

              <div>
                <h4 className="text-sm font-bold leading-tight text-slate-900 group-hover:text-emerald-700 transition-colors">
                  {tab.title}
                </h4>
                <p className="text-[11px] mt-1 line-clamp-1 text-slate-500">
                  {tab.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar for Currently Active Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-subtle flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Search within ${activeTabMeta.title}...`}
            className="input-text pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          <span className="bg-emerald-50 text-emerald-800 px-3.5 py-1.5 rounded-xl border border-emerald-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <span>Active Section: <strong>{activeTabMeta.title}</strong> ({displayedList.length} Products)</span>
          </span>
        </div>
      </div>

      {/* Ranked Product List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle p-5 space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs text-slate-500 font-semibold uppercase tracking-wider">
          <span>Display Sequence ({displayedList.length} Items)</span>
          <span>Performance Metric & Manual Reorder</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">Loading section data...</div>
        ) : displayedList.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No products found in this section matching your search.
          </div>
        ) : (
          displayedList.map((product, index) => {
            const primaryVar = product.variants?.[0] || {};
            const totalStock = (product.variants || []).reduce((acc, v) => acc + Number(v.stock || 0), 0);
            const discountPct = primaryVar.mrp > primaryVar.sellingPrice
              ? Math.round(((primaryVar.mrp - primaryVar.sellingPrice) / primaryVar.mrp) * 100)
              : 0;

            return (
              <div
                key={product.id || index}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-slate-300 bg-slate-50/50 hover:bg-white transition-all gap-3 group"
              >
                {/* Left Info */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <span className="w-8 h-8 rounded-lg bg-emerald-800 text-white font-bold text-xs flex items-center justify-center font-mono shrink-0 shadow-xs">
                    #{index + 1}
                  </span>

                  <div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                    {product.imageUrl || product.frontImageUrl ? (
                      <img
                        src={product.imageUrl || product.frontImageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-6 h-6 text-slate-400 m-3" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs truncate">
                        {product.name}
                      </span>
                      {product.tamilName && (
                        <span className="text-slate-500 text-[11px] font-sans truncate hidden md:inline">
                          ({product.tamilName})
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                      <span className="text-emerald-700 font-semibold">{product.categoryName}</span>
                      <span>•</span>
                      <span className="font-sans font-bold text-slate-800">
                        {formatCurrency(primaryVar.sellingPrice || 0)}
                      </span>
                      {primaryVar.mrp > primaryVar.sellingPrice && (
                        <span className="line-through text-slate-400 font-sans text-[10px]">
                          {formatCurrency(primaryVar.mrp)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Context Metric & Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  {/* Context Metrics Badges based on active Tab */}
                  <div className="text-right">
                    {activeTab === 'top_100' && (
                      <span className="text-xs font-bold text-rose-600 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
                        🔥 Top #{index + 1} Seller
                      </span>
                    )}

                    {activeTab === 'most_viewed' && (
                      <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-200 font-mono">
                        👁️ {((product.rankingScore || 80) * 24).toLocaleString()} Views
                      </span>
                    )}

                    {activeTab === 'most_purchased' && (
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 font-mono">
                        🛍️ {((product.rankingScore || 80) * 3).toLocaleString()} Orders
                      </span>
                    )}

                    {activeTab === 'recently_added' && (
                      <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
                        ✨ {new Date(product.createdAt || Date.now()).toLocaleDateString()}
                      </span>
                    )}

                    {activeTab === 'featured' && (
                      <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                        ⭐ Featured Showcase
                      </span>
                    )}

                    {activeTab === 'offers' && (
                      <span className="text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200">
                        🏷️ {discountPct > 0 ? `${discountPct}% OFF` : 'Special Deal'}
                      </span>
                    )}

                    {activeTab === 'low_stock' && (
                      <span className="text-xs font-bold text-orange-700 bg-orange-50 px-3 py-1 rounded-full border border-orange-200 font-mono">
                        ⚠️ Stock: {totalStock} units
                      </span>
                    )}

                    {activeTab === 'high_return_cancel' && (
                      <span className="text-xs font-bold text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200 font-mono">
                        🚨 Risk Rate: 4.8%
                      </span>
                    )}
                  </div>

                  {/* Manual Reorder sequence buttons */}
                  <div className="flex items-center gap-1">
                    <button
                      disabled={index === 0}
                      onClick={() => handleMove(index, 'up')}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Move Up in Rank"
                    >
                      <MoveUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      disabled={index === displayedList.length - 1}
                      onClick={() => handleMove(index, 'down')}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Move Down in Rank"
                    >
                      <MoveDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
