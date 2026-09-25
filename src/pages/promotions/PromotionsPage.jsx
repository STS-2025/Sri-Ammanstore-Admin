import React, { useState, useEffect, useMemo } from 'react';
import { 
  Tag, Plus, Percent, IndianRupee, TrendingUp, Users, CheckCircle2, 
  Trash2, Edit3, PauseCircle, PlayCircle, RefreshCw, Search, Filter,
  ArrowUpRight, ShoppingBag
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { 
  getAllPromoCodes, 
  createPromoCode, 
  updatePromoCode, 
  deletePromoCode,
  getPromoAnalytics 
} from '../../firebase/promoService';
import { PromoFormModal } from '../../components/promotions/PromoFormModal';

export const PromotionsPage = () => {
  const { currentUser } = useAuth();

  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'analytics'

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPromoForEdit, setSelectedPromoForEdit] = useState(null);

  const loadPromos = async () => {
    setLoading(true);
    try {
      const data = await getAllPromoCodes();
      setPromos(data);
    } catch (err) {
      console.error('Error loading promo codes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPromos();
  }, []);

  const handleSavePromo = async (formData) => {
    try {
      if (selectedPromoForEdit) {
        await updatePromoCode(selectedPromoForEdit.id, formData, currentUser);
      } else {
        await createPromoCode(formData, currentUser);
      }
      setIsModalOpen(false);
      setSelectedPromoForEdit(null);
      await loadPromos();
    } catch (err) {
      alert(`Error saving promo: ${err.message}`);
    }
  };

  const handleDeletePromo = async (promoId) => {
    if (!window.confirm('Are you sure you want to delete this promo code?')) return;
    try {
      await deletePromoCode(promoId, currentUser);
      await loadPromos();
    } catch (err) {
      alert(`Error deleting promo: ${err.message}`);
    }
  };

  const handleToggleStatus = async (promo) => {
    const nextStatus = promo.status === 'active' ? 'paused' : 'active';
    try {
      await updatePromoCode(promo.id, { status: nextStatus }, currentUser);
      await loadPromos();
    } catch (err) {
      alert(`Error updating promo status: ${err.message}`);
    }
  };

  // Filtered List
  const filteredPromos = useMemo(() => {
    return promos.filter(p => {
      const matchesSearch = p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [promos, searchQuery, statusFilter]);

  // Analytics Metrics
  const analytics = useMemo(() => {
    return getPromoAnalytics(promos);
  }, [promos]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Promo Codes & Discounts</h1>
          <p className="text-sm text-slate-500">
            Configure coupons, cart value thresholds, customer acquisition codes and monitor promotional ROI.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedPromoForEdit(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Create Promo Code
          </button>

          <button
            onClick={loadPromos}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-white border border-slate-200 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Analytics KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Active Coupons</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{analytics.activeCodes} <span className="text-xs font-normal text-slate-400">/ {analytics.totalCodes}</span></p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wide">Total Redemptions</span>
          <p className="text-xl font-bold text-blue-600 mt-1">{analytics.totalUsed.toLocaleString('en-IN')}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide">Sales Generated</span>
          <p className="text-xl font-bold text-emerald-700 mt-1">₹{analytics.totalSales.toLocaleString('en-IN')}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wide">Discounts Given</span>
          <p className="text-xl font-bold text-rose-600 mt-1">₹{analytics.totalDiscount.toLocaleString('en-IN')}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-purple-700 uppercase tracking-wide">Avg Promo Order</span>
          <p className="text-xl font-bold text-purple-700 mt-1">₹{analytics.avgOrderValue.toLocaleString('en-IN')}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-cyan-700 uppercase tracking-wide">Discount ROI</span>
          <p className="text-xl font-bold text-cyan-700 mt-1">{analytics.roi}x</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`pb-3 px-4 text-xs font-bold transition-all ${
              activeTab === 'list'
                ? 'text-emerald-700 border-b-2 border-emerald-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Coupon Inventory ({promos.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`pb-3 px-4 text-xs font-bold transition-all ${
              activeTab === 'analytics'
                ? 'text-emerald-700 border-b-2 border-emerald-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Campaign Performance & ROI
          </button>
        </div>

        {activeTab === 'list' && (
          <div className="flex items-center gap-2 mb-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search promo code..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 outline-none w-48 bg-white"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 outline-none bg-white font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        )}
      </div>

      {/* TAB 1: Coupons List */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPromos.map(promo => {
              const usagePct = Math.round(((promo.timesUsed || 0) / (promo.totalUsageLimit || 1)) * 100);

              return (
                <div
                  key={promo.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all"
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono font-bold text-sm tracking-wider">
                            {promo.code}
                          </span>
                          {promo.firstOrderOnly && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">
                              1st Order Only
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-semibold text-slate-800 mt-2 line-clamp-1">{promo.description}</p>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        promo.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : promo.status === 'paused'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {promo.status}
                      </span>
                    </div>

                    <div className="mt-3 bg-slate-50 rounded-xl p-3 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Discount Benefit:</span>
                        <span className="font-bold text-slate-900">
                          {promo.type === 'percentage'
                            ? `${promo.value}% Off (Max ₹${promo.maxDiscount})`
                            : promo.type === 'free_delivery'
                            ? 'Free Delivery Waived Off'
                            : `Flat ₹${promo.value} Off`}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Min Order Cart:</span>
                        <span className="font-semibold text-slate-700">₹{promo.minOrderAmount || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Validity:</span>
                        <span className="text-slate-600">{promo.startDate} to {promo.endDate}</span>
                      </div>
                    </div>

                    {/* Usage Progress */}
                    <div className="mt-3">
                      <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                        <span>Used: <strong className="text-slate-800">{promo.timesUsed}</strong> / {promo.totalUsageLimit}</span>
                        <span className="font-medium text-emerald-700">{usagePct}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-600 h-full" style={{ width: `${Math.min(100, usagePct)}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(promo)}
                      className={`font-semibold ${promo.status === 'active' ? 'text-amber-700 hover:text-amber-800' : 'text-emerald-700 hover:text-emerald-800'}`}
                    >
                      {promo.status === 'active' ? 'Pause Code' : 'Activate Code'}
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPromoForEdit(promo);
                          setIsModalOpen(true);
                        }}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit Promo"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeletePromo(promo.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Promo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: Promo Analytics */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-1">Coupon Performance & Sales Attribution</h3>
            <p className="text-xs text-slate-500 mb-4">Detailed sales and profit attribution for each active and historical coupon code.</p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Promo Code</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Times Used</th>
                    <th className="py-2.5 px-3">Revenue Generated</th>
                    <th className="py-2.5 px-3">Total Discount Cost</th>
                    <th className="py-2.5 px-3">Net Sales Margin</th>
                    <th className="py-2.5 px-3">ROI Multiple</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {promos.map(promo => {
                    const revenue = promo.salesGenerated || 0;
                    const discount = promo.totalDiscountGiven || 0;
                    const net = Math.max(0, revenue - discount);
                    const roi = discount > 0 ? (net / discount).toFixed(1) : '-';

                    return (
                      <tr key={promo.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">{promo.code}</td>
                        <td className="py-3 px-3 capitalize font-medium text-slate-600">{promo.type.replace('_', ' ')}</td>
                        <td className="py-3 px-3 font-semibold text-slate-800">{promo.timesUsed || 0}</td>
                        <td className="py-3 px-3 font-bold text-emerald-700">₹{revenue.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3 font-bold text-rose-600">₹{discount.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3 font-bold text-slate-900">₹{net.toLocaleString('en-IN')}</td>
                        <td className="py-3 px-3 font-bold text-cyan-700">{roi}x</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      <PromoFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedPromoForEdit(null);
        }}
        onSave={handleSavePromo}
        promo={selectedPromoForEdit}
      />
    </div>
  );
};
