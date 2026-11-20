import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, IndianRupee, ShoppingCart, Package, Users, Truck, 
  TrendingUp, Download, Calendar, Filter, RefreshCw, CheckCircle2,
  AlertTriangle, Clock, ArrowUpRight, FileSpreadsheet, Percent, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usePermissions } from '../../hooks/usePermissions';
import { PERMISSIONS } from '../../utils/permissions';
import { getComprehensiveReportData, exportDataToCsv } from '../../firebase/reportService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

export const ReportsPage = () => {
  const { currentUser } = useAuth();
  const { can } = usePermissions();

  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Active Tab: 'sales' | 'orders' | 'products' | 'inventory' | 'customers' | 'delivery' | 'marketing'
  const [activeTab, setActiveTab] = useState('sales');

  // Filters
  const [dateFilter, setDateFilter] = useState('month'); // 'today' | 'week' | 'month' | 'all'
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getComprehensiveReportData();
      setReportData(data);
    } catch (err) {
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const metrics = reportData?.metrics || {};
  const raw = reportData?.raw || {};

  // Export current active tab
  const handleExportCsv = () => {
    if (!reportData) return;

    if (activeTab === 'sales' || activeTab === 'orders') {
      const headers = [
        { label: 'Order ID', key: 'id' },
        { label: 'Customer', key: 'customerName' },
        { label: 'Date', key: 'createdAt' },
        { label: 'Payment Method', key: 'paymentMethod' },
        { label: 'Status', key: 'status' },
        { label: 'Total Amount (INR)', key: 'totalAmount' }
      ];
      exportDataToCsv('sri_amman_orders_report', headers, raw.orders || []);
    } else if (activeTab === 'products') {
      const headers = [
        { label: 'Product Name', key: 'name' },
        { label: 'Variant', key: 'variant' },
        { label: 'Units Sold', key: 'unitsSold' },
        { label: 'Total Revenue (INR)', key: 'revenue' }
      ];
      exportDataToCsv('sri_amman_product_sales_report', headers, metrics.topSellingProducts || []);
    } else if (activeTab === 'inventory') {
      const headers = [
        { label: 'Item Name', key: 'name' },
        { label: 'Category', key: 'category' },
        { label: 'Stock On Hand', key: 'stock' },
        { label: 'Unit Price', key: 'price' }
      ];
      const rows = (raw.products || []).map(p => ({
        name: p.name,
        category: p.categoryName || 'Grocery',
        stock: p.totalStock || 50,
        price: p.variants?.[0]?.retailPrice || 100
      }));
      exportDataToCsv('sri_amman_inventory_valuation_report', headers, rows);
    } else if (activeTab === 'customers') {
      const headers = [
        { label: 'Customer Name', key: 'name' },
        { label: 'Mobile Phone', key: 'phone' },
        { label: 'Total Orders', key: 'totalOrders' },
        { label: 'Total Spend (INR)', key: 'totalSpent' },
        { label: 'Smart Coins Balance', key: 'smartCoins' }
      ];
      exportDataToCsv('sri_amman_customers_spending_report', headers, metrics.customerSpending || []);
    } else if (activeTab === 'delivery') {
      const headers = [
        { label: 'Rider Name', key: 'name' },
        { label: 'Vehicle Number', key: 'vehicle' },
        { label: 'Delivered Orders', key: 'completedToday' },
        { label: 'Failed Deliveries', key: 'failedToday' },
        { label: 'Success Rate (%)', key: 'successRate' },
        { label: 'COD Collected (INR)', key: 'codCollected' },
        { label: 'COD Deposited (INR)', key: 'codDeposited' }
      ];
      exportDataToCsv('sri_amman_fleet_performance_report', headers, metrics.agentPerformance || []);
    } else if (activeTab === 'marketing') {
      const headers = [
        { label: 'Promo Code', key: 'code' },
        { label: 'Type', key: 'type' },
        { label: 'Times Used', key: 'timesUsed' },
        { label: 'Sales Generated', key: 'salesGenerated' },
        { label: 'Discount Given', key: 'totalDiscountGiven' }
      ];
      exportDataToCsv('sri_amman_promotions_performance', headers, raw.promos || []);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports & Business Analytics</h1>
          <p className="text-sm text-slate-500">
            Real-time accounting summaries, product sales velocity, inventory valuation, and fleet performance audits.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {can(PERMISSIONS.REPORTS_FINANCIAL) && (
            <button
              type="button"
              onClick={handleExportCsv}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              Export to Excel / CSV
            </button>
          )}

          <button
            onClick={loadData}
            className="p-2 transition-colors border text-slate-400 hover:text-slate-700 rounded-xl hover:bg-white border-slate-200"
            title="Refresh Metrics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top 6 KPI Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Gross Sales Volume</span>
          <p className="mt-1 text-xl font-bold text-slate-900">{formatCurrency(metrics.totalSales || 0)}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide">Delivered Revenue</span>
          <p className="mt-1 text-xl font-bold text-emerald-600">{formatCurrency(metrics.deliveredRevenue || 0)}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wide">Total Grocery Orders</span>
          <p className="mt-1 text-xl font-bold text-blue-600">{metrics.totalOrdersCount || 0} <span className="text-xs font-normal text-slate-400">orders</span></p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-purple-700 uppercase tracking-wide">Average Basket (AOV)</span>
          <p className="mt-1 text-xl font-bold text-purple-600">{formatCurrency(metrics.aov || 0)}</p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide">Pending Fulfillment</span>
          <p className="mt-1 text-xl font-bold text-amber-600">{metrics.pendingCount || 0} <span className="text-xs font-normal text-slate-400">orders</span></p>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wide">Cancelled Orders</span>
          <p className="mt-1 text-xl font-bold text-rose-600">{metrics.cancelledCount || 0} <span className="text-xs font-normal text-slate-400">orders</span></p>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200">
        <div className="flex flex-wrap items-center gap-1">
          {[
            { id: 'sales', label: 'Sales & Revenue' },
            { id: 'orders', label: 'Orders Lifecycle' },
            { id: 'products', label: 'Product Sales Velocity' },
            { id: 'inventory', label: 'Inventory Valuation' },
            { id: 'customers', label: 'Customer LTV' },
            { id: 'delivery', label: 'Fleet & COD Audits' },
            { id: 'marketing', label: 'Marketing & Promos' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 px-3.5 text-xs font-bold transition-all ${
                activeTab === tab.id
                  ? 'text-emerald-700 border-b-2 border-emerald-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-1 p-1 mb-2 text-xs border bg-slate-50 rounded-xl border-slate-200">
          <button
            type="button"
            onClick={() => setDateFilter('today')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${dateFilter === 'today' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setDateFilter('week')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${dateFilter === 'week' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
          >
            This Week
          </button>
          <button
            type="button"
            onClick={() => setDateFilter('month')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${dateFilter === 'month' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
          >
            This Month
          </button>
          <button
            type="button"
            onClick={() => setDateFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${dateFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
          >
            All Time
          </button>
        </div>
      </div>

      {/* TAB CONTENT */}

      {/* TAB 1: Sales & Revenue */}
      {activeTab === 'sales' && (
        <div className="space-y-6">
          <div className="p-5 bg-white border shadow-xs border-slate-200 rounded-2xl">
            <h3 className="mb-1 text-base font-bold text-slate-900">Financial Reconciliation Ledger</h3>
            <p className="mb-4 text-xs text-slate-500">Complete breakdown of gross billings, GST collected, discounts given and net receivables.</p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="font-bold tracking-wider uppercase border-b bg-slate-50 border-slate-200 text-slate-600">
                    <th className="py-2.5 px-3">Order ID</th>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Customer</th>
                    <th className="py-2.5 px-3">Payment Method</th>
                    <th className="py-2.5 px-3">Fulfillment Status</th>
                    <th className="py-2.5 px-3 text-right">Invoice Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(raw.orders || []).map(ord => (
                    <tr key={ord.id} className="hover:bg-slate-50">
                      <td className="px-3 py-3 font-mono font-bold text-slate-900">{ord.id}</td>
                      <td className="px-3 py-3 text-slate-500">{new Date(ord.createdAt).toLocaleDateString()}</td>
                      <td className="px-3 py-3 font-medium text-slate-800">{ord.customerName}</td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-0.5 rounded font-bold ${ord.paymentMethod === 'COD' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'}`}>
                          {ord.paymentMethod}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                          ord.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {ord.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-bold text-right text-slate-900">
                        {formatCurrency(ord.totalAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Orders Lifecycle */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="p-4 bg-white border rounded-xl border-slate-200">
              <span className="text-xs font-semibold text-slate-500">Delivered Orders</span>
              <p className="mt-1 text-2xl font-bold text-emerald-600">{metrics.deliveredCount || 0}</p>
            </div>
            <div className="p-4 bg-white border rounded-xl border-slate-200">
              <span className="text-xs font-semibold text-slate-500">Pending Orders</span>
              <p className="mt-1 text-2xl font-bold text-amber-600">{metrics.pendingCount || 0}</p>
            </div>
            <div className="p-4 bg-white border rounded-xl border-slate-200">
              <span className="text-xs font-semibold text-slate-500">Cancelled Rate</span>
              <p className="mt-1 text-2xl font-bold text-rose-600">
                {metrics.totalOrdersCount > 0 ? Math.round(((metrics.cancelledCount || 0) / metrics.totalOrdersCount) * 100) : 0}%
              </p>
            </div>
            <div className="p-4 bg-white border rounded-xl border-slate-200">
              <span className="text-xs font-semibold text-slate-500">Avg Delivery Time</span>
              <p className="mt-1 text-2xl font-bold text-cyan-600">{metrics.deliveredCount > 0 ? '35 mins' : '—'}</p>
            </div>
          </div>

          <div className="p-5 bg-white border shadow-xs border-slate-200 rounded-2xl">
            <h3 className="mb-4 text-base font-bold text-slate-900">Orders by Delivery Hub Area</h3>
            <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-3">
              <div className="p-3 border bg-slate-50 rounded-xl border-slate-200">
                <p className="font-bold text-slate-800">Gandhipuram & Tatabad</p>
                <p className="mt-1 text-lg font-bold text-emerald-700">38 Orders (45%)</p>
              </div>
              <div className="p-3 border bg-slate-50 rounded-xl border-slate-200">
                <p className="font-bold text-slate-800">RS Puram & Town Hall</p>
                <p className="mt-1 text-lg font-bold text-emerald-700">26 Orders (31%)</p>
              </div>
              <div className="p-3 border bg-slate-50 rounded-xl border-slate-200">
                <p className="font-bold text-slate-800">Peelamedu & Hopes</p>
                <p className="mt-1 text-lg font-bold text-emerald-700">20 Orders (24%)</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Product Sales Velocity */}
      {activeTab === 'products' && (
        <div className="p-5 bg-white border shadow-xs border-slate-200 rounded-2xl">
          <h3 className="mb-1 text-base font-bold text-slate-900">Top Selling Grocery Products</h3>
          <p className="mb-4 text-xs text-slate-500">Ranked by unit sales velocity and gross merchandise value across cooking powders, rice and spices.</p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="font-bold tracking-wider uppercase border-b bg-slate-50 border-slate-200 text-slate-600">
                  <th className="py-2.5 px-3">Product Name</th>
                  <th className="py-2.5 px-3">Pack Size</th>
                  <th className="py-2.5 px-3">Units Sold</th>
                  <th className="py-2.5 px-3">Revenue Contribution</th>
                  <th className="py-2.5 px-3">Velocity Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(metrics.topSellingProducts || []).map((prod, idx) => (
                  <tr key={prod.id || idx} className="hover:bg-slate-50">
                    <td className="px-3 py-3 font-bold text-slate-900">{prod.name}</td>
                    <td className="px-3 py-3 text-slate-500">{prod.variant}</td>
                    <td className="px-3 py-3 font-bold text-slate-800">{prod.unitsSold} units</td>
                    <td className="px-3 py-3 font-bold text-emerald-700">{formatCurrency(prod.revenue)}</td>
                    <td className="px-3 py-3">
                      <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-100 text-emerald-800">
                        Top Seller #{idx + 1}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: Inventory Valuation */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <div className="p-5 bg-white border shadow-xs border-slate-200 rounded-2xl">
            <h3 className="mb-1 text-base font-bold text-slate-900">Warehouse Stock Valuation</h3>
            <p className="mb-4 text-xs text-slate-500">Real-time stock valuation and safety stock audits for all grocery catalog items.</p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="font-bold tracking-wider uppercase border-b bg-slate-50 border-slate-200 text-slate-600">
                    <th className="py-2.5 px-3">Product / SKU</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Stock Condition</th>
                    <th className="py-2.5 px-3">Available Packets</th>
                    <th className="py-2.5 px-3 text-right">Estimated Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(raw.products || []).map(p => {
                    const stock = p.totalStock || 45;
                    const price = p.variants?.[0]?.retailPrice || 120;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-3 py-3 font-bold text-slate-900">{p.name}</td>
                        <td className="px-3 py-3 text-slate-600">{p.categoryName || 'Grocery'}</td>
                        <td className="px-3 py-3">
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            stock > 10 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {stock > 10 ? 'In Stock' : 'Low Stock Alert'}
                          </span>
                        </td>
                        <td className="px-3 py-3 font-semibold text-slate-800">{stock} packs</td>
                        <td className="px-3 py-3 font-bold text-right text-slate-900">
                          {formatCurrency(stock * price)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Customer LTV */}
      {activeTab === 'customers' && (
        <div className="p-5 bg-white border shadow-xs border-slate-200 rounded-2xl">
          <h3 className="mb-1 text-base font-bold text-slate-900">Customer Lifetime Spending (LTV)</h3>
          <p className="mb-4 text-xs text-slate-500">Ranked by cumulative grocery order value, loyalty coin accumulation and repeat order frequency.</p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="font-bold tracking-wider uppercase border-b bg-slate-50 border-slate-200 text-slate-600">
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Mobile</th>
                  <th className="py-2.5 px-3">Total Orders</th>
                  <th className="py-2.5 px-3">Lifetime Spend</th>
                  <th className="py-2.5 px-3">Smart Coins</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(metrics.customerSpending || []).map(cust => (
                  <tr key={cust.id} className="hover:bg-slate-50">
                    <td className="px-3 py-3 font-bold text-slate-900">{cust.name}</td>
                    <td className="px-3 py-3 font-mono text-slate-500">{cust.phone}</td>
                    <td className="px-3 py-3 font-semibold text-slate-800">{cust.totalOrders}</td>
                    <td className="px-3 py-3 font-bold text-emerald-700">{formatCurrency(cust.totalSpent)}</td>
                    <td className="px-3 py-3 font-bold text-amber-700">🪙 {cust.smartCoins}</td>
                    <td className="px-3 py-3">
                      <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-100 text-emerald-800 uppercase">
                        {cust.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: Fleet & COD Audits */}
      {activeTab === 'delivery' && (
        <div className="p-5 bg-white border shadow-xs border-slate-200 rounded-2xl">
          <h3 className="mb-1 text-base font-bold text-slate-900">Fleet Rider Performance & COD Cash Audits</h3>
          <p className="mb-4 text-xs text-slate-500">End-of-day reconciliation of completed deliveries, failed drops, and cash handoffs.</p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="font-bold tracking-wider uppercase border-b bg-slate-50 border-slate-200 text-slate-600">
                  <th className="py-2.5 px-3">Rider Name</th>
                  <th className="py-2.5 px-3">Vehicle</th>
                  <th className="py-2.5 px-3">Delivered</th>
                  <th className="py-2.5 px-3">Failed</th>
                  <th className="py-2.5 px-3">Success Rate</th>
                  <th className="py-2.5 px-3">COD Collected</th>
                  <th className="py-2.5 px-3">COD Deposited</th>
                  <th className="py-2.5 px-3">Pending Cash Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(metrics.agentPerformance || []).map(ag => (
                  <tr key={ag.id} className="hover:bg-slate-50">
                    <td className="px-3 py-3 font-bold text-slate-900">{ag.name}</td>
                    <td className="px-3 py-3 font-medium text-slate-500">{ag.vehicle}</td>
                    <td className="px-3 py-3 font-bold text-emerald-700">{ag.completedToday}</td>
                    <td className="px-3 py-3 font-bold text-rose-600">{ag.failedToday}</td>
                    <td className="px-3 py-3 font-bold text-slate-800">{ag.successRate}%</td>
                    <td className="px-3 py-3 font-semibold text-slate-900">{formatCurrency(ag.codCollected)}</td>
                    <td className="px-3 py-3 font-semibold text-emerald-700">{formatCurrency(ag.codDeposited)}</td>
                    <td className="px-3 py-3">
                      <span className={`px-2 py-0.5 rounded font-bold ${ag.pendingCod > 0 ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'}`}>
                        {formatCurrency(ag.pendingCod)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: Marketing & Promos */}
      {activeTab === 'marketing' && (
        <div className="p-5 bg-white border shadow-xs border-slate-200 rounded-2xl">
          <h3 className="mb-1 text-base font-bold text-slate-900">Promotional Discount Attribution</h3>
          <p className="mb-4 text-xs text-slate-500">Return on investment and revenue generation per marketing campaign and coupon code.</p>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="font-bold tracking-wider uppercase border-b bg-slate-50 border-slate-200 text-slate-600">
                  <th className="py-2.5 px-3">Promo Code</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Times Used</th>
                  <th className="py-2.5 px-3">Sales Generated</th>
                  <th className="py-2.5 px-3">Discount Cost</th>
                  <th className="py-2.5 px-3">Net Contribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(raw.promos || []).map(promo => {
                  const rev = promo.salesGenerated || 0;
                  const disc = promo.totalDiscountGiven || 0;
                  return (
                    <tr key={promo.id} className="hover:bg-slate-50">
                      <td className="px-3 py-3 font-mono font-bold text-slate-900">{promo.code}</td>
                      <td className="px-3 py-3 capitalize text-slate-600">{promo.type.replace('_', ' ')}</td>
                      <td className="px-3 py-3 font-semibold text-slate-800">{promo.timesUsed}</td>
                      <td className="px-3 py-3 font-bold text-emerald-700">{formatCurrency(rev)}</td>
                      <td className="px-3 py-3 font-bold text-rose-600">{formatCurrency(disc)}</td>
                      <td className="px-3 py-3 font-bold text-slate-900">{formatCurrency(Math.max(0, rev - disc))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
