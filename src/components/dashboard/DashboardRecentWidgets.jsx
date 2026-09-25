import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Sparkles,
  History,
  ArrowRight,
  Clock,
  CheckCircle2,
  Truck,
  PackageCheck,
  CreditCard,
  User,
  Boxes,
  Eye,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

export const DashboardRecentWidgets = ({
  orders = [],
  requests = [],
  stockAuditLogs = []
}) => {
  const navigate = useNavigate();

  // Top 5 recent orders
  const recentOrders = orders.slice(0, 5);

  // Top 5 recent product requests
  const recentRequests = requests.slice(0, 5);

  // Top 5 recent stock/inventory activity logs
  const recentStockLogs = stockAuditLogs.slice(0, 5);

  const getOrderStatusBadge = (status) => {
    switch (status) {
      case 'delivered':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Delivered</span>;
      case 'out_for_delivery':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">Out for Delivery</span>;
      case 'packed':
      case 'ready_to_ship':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">Packed & Ready</span>;
      case 'picking':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">Picking</span>;
      case 'pending':
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">Pending Review</span>;
    }
  };

  const getRequestStatusBadge = (status) => {
    switch (status) {
      case 'added':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Added to Catalog</span>;
      case 'under_review':
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">Under Review</span>;
      case 'new':
      default:
        return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">New Request</span>;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 1. Recent Orders Feed Widget */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-subtle flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-emerald-600" />
              <span>Recent Live Orders</span>
            </h3>
            <button
              onClick={() => navigate('/orders')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 group"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {recentOrders.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">No recent orders found</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentOrders.map((ord) => (
                <div key={ord.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-extrabold text-slate-900">{ord.orderNumber || ord.id}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${ord.paymentMethod === 'COD' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>
                        {ord.paymentMethod === 'COD' ? 'COD' : 'Prepaid UPI'}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-slate-700 truncate mt-0.5">
                      {ord.customerName} <span className="text-slate-400 font-normal">({ord.deliveryAddress?.locality || 'Coimbatore'})</span>
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-extrabold text-slate-900 font-sans">
                      {formatCurrency(ord.totalAmount || ord.subtotal || 0)}
                    </div>
                    <div className="mt-0.5">{getOrderStatusBadge(ord.status)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-3 mt-3 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-500">
          <span>Real-time store checkout feed</span>
          <button onClick={() => navigate('/orders')} className="font-bold text-slate-700 hover:text-emerald-700">Open Fulfillment Workstation &rarr;</button>
        </div>
      </div>

      {/* 2. Recent Customer Product Requests Widget */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-subtle flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <span>Recent Requested Products</span>
            </h3>
            <button
              onClick={() => navigate('/requested-products')}
              className="text-xs font-bold text-purple-700 hover:text-purple-800 flex items-center gap-1 group"
            >
              <span>Manage</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {recentRequests.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">No customer requests logged</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentRequests.map((req) => (
                <div key={req.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">{req.name || req.productName}</p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span>Category: <strong className="text-slate-600">{req.category || 'General'}</strong></span>
                      <span>•</span>
                      <span className="text-purple-700 font-bold">{req.requestCount || req.upvotes || 1} Customer Demand</span>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    {getRequestStatusBadge(req.status)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-3 mt-3 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-500">
          <span>Customer wishlist & search demand</span>
          <button onClick={() => navigate('/requested-products')} className="font-bold text-slate-700 hover:text-purple-700">Procure Products &rarr;</button>
        </div>
      </div>

      {/* 3. Recent Stock Updates & Inventory Activity */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-subtle flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Boxes className="w-4 h-4 text-blue-600" />
              <span>Recent Stock Updates</span>
            </h3>
            <button
              onClick={() => navigate('/inventory')}
              className="text-xs font-bold text-blue-700 hover:text-blue-800 flex items-center gap-1 group"
            >
              <span>View Stock</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {recentStockLogs.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">No recent stock adjustments</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentStockLogs.map((log) => (
                <div key={log.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">{log.recordName || log.targetId}</p>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span className="font-mono text-slate-600">{log.userName || log.userEmail}</span>
                      <span>•</span>
                      <span className="truncate italic text-slate-500">"{log.reason || log.action}"</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 block font-mono">
                      {log.newValue || log.action}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-3 mt-3 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-500">
          <span>Inventory warehouse logs & audit trail</span>
          <button onClick={() => navigate('/inventory')} className="font-bold text-slate-700 hover:text-blue-700">Audit Warehouses &rarr;</button>
        </div>
      </div>
    </div>
  );
};
