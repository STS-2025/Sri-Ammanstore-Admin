import React, { useState, useEffect, useMemo } from 'react';
import { 
  HeartHandshake, Plus, Search, Filter, RefreshCw, CheckCircle2, 
  AlertCircle, PackagePlus, Bell, Eye, ArrowUpRight, Flame, Users
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { 
  getAllProductRequests, 
  updateProductRequestStatus, 
  createProductRequest 
} from '../../firebase/productRequestService';
import { ProductRequestModal } from '../../components/productRequests/ProductRequestModal';

export const ProductRequestsPage = () => {
  const { currentUser } = useAuth();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Manual Add Form Modal
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    productName: '',
    brand: '',
    category: 'Atta, Flours & Sooji',
    customerName: '',
    customerPhone: '',
    notes: ''
  });

  const loadRequests = async () => {
    setLoading(true);
    try {
      const data = await getAllProductRequests();
      setRequests(data);
    } catch (err) {
      console.error('Error loading product requests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleUpdateStatus = async (requestId, payload) => {
    try {
      await updateProductRequestStatus(requestId, payload, currentUser);
      await loadRequests();
    } catch (err) {
      alert(`Error updating request: ${err.message}`);
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!addForm.productName.trim()) {
      alert('Product name is required');
      return;
    }
    try {
      await createProductRequest(addForm, currentUser);
      setIsAddOpen(false);
      setAddForm({
        productName: '',
        brand: '',
        category: 'Atta, Flours & Sooji',
        customerName: '',
        customerPhone: '',
        notes: ''
      });
      await loadRequests();
    } catch (err) {
      alert(`Error creating request: ${err.message}`);
    }
  };

  // KPIs
  const kpis = useMemo(() => {
    const totalRequests = requests.reduce((sum, r) => sum + (r.requestedByCount || 1), 0);
    const uniqueProducts = requests.length;
    const underReview = requests.filter(r => r.status === 'under_review').length;
    const addedCount = requests.filter(r => r.status === 'added').length;

    return {
      totalRequests,
      uniqueProducts,
      underReview,
      addedCount
    };
  }, [requests]);

  // Filtered List
  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      const matchesSearch = r.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.brand && r.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.category && r.category.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [requests, searchQuery, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Customer Requested Products</h1>
          <p className="text-sm text-slate-500">
            Unfulfilled search queries, aggregated wishlist demand, and supplier procurement workflow.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Log Customer Request
          </button>

          <button
            onClick={loadRequests}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-white border border-slate-200 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Customer Inquiries</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{kpis.totalRequests} <span className="text-xs font-normal text-slate-400">searches</span></p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wide">Unique Products Wanted</span>
          <p className="text-2xl font-bold text-blue-600 mt-1">{kpis.uniqueProducts} <span className="text-xs font-normal text-slate-400">items</span></p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide">Under Review</span>
          <p className="text-2xl font-bold text-amber-600 mt-1">{kpis.underReview} <span className="text-xs font-normal text-slate-400">items</span></p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide">Sourced & Added</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{kpis.addedCount} <span className="text-xs font-normal text-slate-400">cataloged</span></p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search requested product name, brand or category..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 outline-none bg-white font-medium"
        >
          <option value="all">All Request Statuses</option>
          <option value="new">New Requests</option>
          <option value="under_review">Under Review</option>
          <option value="added">Added to Catalog</option>
          <option value="not_available">Unavailable from Supplier</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Requests Data Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Brand</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Demand Inquiries</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Last Requested</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    No matching customer product requests found.
                  </td>
                </tr>
              ) : (
                filteredRequests.map(req => {
                  const isHighDemand = req.requestedByCount >= 5;

                  return (
                    <tr key={req.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {isHighDemand && (
                            <span className="p-1 rounded bg-amber-100 text-amber-700" title="High Customer Demand">
                              <Flame className="w-3.5 h-3.5" />
                            </span>
                          )}
                          <div>
                            <span className="font-bold text-slate-900">{req.productName}</span>
                            {req.notes && <p className="text-[11px] text-slate-400 italic line-clamp-1">{req.notes}</p>}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-medium text-slate-700">{req.brand || 'Local Brand'}</td>
                      <td className="py-3 px-4 text-slate-600">{req.category || 'Grocery'}</td>

                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded ${
                          isHighDemand ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-800'
                        }`}>
                          <Users className="w-3 h-3" />
                          {req.requestedByCount} {req.requestedByCount === 1 ? 'customer' : 'customers'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          req.status === 'added'
                            ? 'bg-emerald-100 text-emerald-800'
                            : req.status === 'under_review'
                            ? 'bg-blue-100 text-blue-800'
                            : req.status === 'new'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {req.status.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-500">
                        {new Date(req.lastRequestedAt).toLocaleDateString()}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRequest(req);
                            setIsModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg text-xs transition-colors"
                        >
                          Review & Action
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      <ProductRequestModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRequest(null);
        }}
        onUpdateStatus={handleUpdateStatus}
        request={selectedRequest}
      />

      {/* Manual Add Request Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Log In-Store Customer Product Request</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 p-1">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={addForm.productName}
                  onChange={(e) => setAddForm({ ...addForm, productName: e.target.value })}
                  placeholder="e.g. MTR Rava Idli Mix"
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Brand</label>
                  <input
                    type="text"
                    value={addForm.brand}
                    onChange={(e) => setAddForm({ ...addForm, brand: e.target.value })}
                    placeholder="e.g. MTR"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Category</label>
                  <select
                    value={addForm.category}
                    onChange={(e) => setAddForm({ ...addForm, category: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 outline-none bg-white"
                  >
                    <option value="Atta, Flours & Sooji">Atta, Flours & Sooji</option>
                    <option value="Cooking Powders & Masalas">Cooking Powders & Masalas</option>
                    <option value="Edible Oils & Pure Ghee">Edible Oils & Pure Ghee</option>
                    <option value="Rice & Millets">Rice & Millets</option>
                    <option value="Dals & Pulses">Dals & Pulses</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Customer Name</label>
                  <input
                    type="text"
                    value={addForm.customerName}
                    onChange={(e) => setAddForm({ ...addForm, customerName: e.target.value })}
                    placeholder="e.g. Saradha R."
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Phone</label>
                  <input
                    type="tel"
                    value={addForm.customerPhone}
                    onChange={(e) => setAddForm({ ...addForm, customerPhone: e.target.value })}
                    placeholder="+91 98401 00000"
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={addForm.notes}
                  onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                  placeholder="Requested pack size or details..."
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg"
                >
                  Save Customer Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
