import React, { useState } from 'react';
import {
  TrendingUp,
  BarChart3,
  PieChart,
  Users,
  ShoppingBag,
  AlertTriangle,
  ArrowUpRight,
  Flame,
  Calendar,
  Eye,
  Tag,
  PackageX,
  RotateCcw,
  Sparkles,
  Percent
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';
import { StockBadge } from '../common/StockBadge';

export const DashboardCharts = ({ products = [] }) => {
  const [salesTimeframe, setSalesTimeframe] = useState('7D'); // 'Today' | '7D' | '30D' | 'Month' | 'Year'

  // Realistic Sales Trend Datasets by timeframe
  const SALES_DATASETS = {
    'Today': [
      { label: '06:00', sales: 2400 },
      { label: '09:00', sales: 7800 },
      { label: '12:00', sales: 14500 },
      { label: '15:00', sales: 9200 },
      { label: '18:00', sales: 18400 },
      { label: '21:00', sales: 8650 }
    ],
    '7D': [
      { label: 'Mon', sales: 38400 },
      { label: 'Tue', sales: 42100 },
      { label: 'Wed', sales: 39500 },
      { label: 'Thu', sales: 48650 },
      { label: 'Fri', sales: 54200 },
      { label: 'Sat', sales: 68900 },
      { label: 'Sun', sales: 74200 }
    ],
    '30D': [
      { label: 'Week 1', sales: 284000 },
      { label: 'Week 2', sales: 312000 },
      { label: 'Week 3', sales: 345000 },
      { label: 'Week 4', sales: 392000 }
    ],
    'Month': [
      { label: '1-5 Sep', sales: 195000 },
      { label: '6-10 Sep', sales: 220000 },
      { label: '11-15 Sep', sales: 245000 },
      { label: '16-20 Sep', sales: 280000 },
      { label: '21-25 Sep', sales: 298000 }
    ],
    'Year': [
      { label: 'Apr', sales: 940000 },
      { label: 'May', sales: 1050000 },
      { label: 'Jun', sales: 1120000 },
      { label: 'Jul', sales: 1250000 },
      { label: 'Aug', sales: 1380000 },
      { label: 'Sep', sales: 1420000 }
    ]
  };

  const currentSalesData = SALES_DATASETS[salesTimeframe] || SALES_DATASETS['7D'];
  const maxSales = Math.max(...currentSalesData.map((d) => d.sales));

  // Order status distribution
  const ORDER_STATUS_DISTRIBUTION = [
    { status: 'Pending', count: 8, color: 'bg-amber-500', text: 'text-amber-700' },
    { status: 'Confirmed', count: 11, color: 'bg-blue-500', text: 'text-blue-700' },
    { status: 'Picking & Packing', count: 14, color: 'bg-indigo-500', text: 'text-indigo-700' },
    { status: 'Ready to Ship', count: 9, color: 'bg-cyan-500', text: 'text-cyan-700' },
    { status: 'Out for Delivery', count: 12, color: 'bg-purple-500', text: 'text-purple-700' },
    { status: 'Delivered', count: 42, color: 'bg-emerald-500', text: 'text-emerald-700' },
    { status: 'Cancelled', count: 2, color: 'bg-rose-500', text: 'text-rose-700' },
    { status: 'Returned', count: 1, color: 'bg-orange-500', text: 'text-orange-700' }
  ];
  const totalOrdersCount = ORDER_STATUS_DISTRIBUTION.reduce((a, b) => a + b.count, 0);

  // Top selling products
  const TOP_SELLING = [
    {
      name: 'Idhayam Gingelly Sesame Oil',
      variant: '1 Litre Pouch',
      soldQty: 184,
      revenue: 69920,
      image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=100&q=80'
    },
    {
      name: 'Amman Select Ponni Boiled Rice',
      variant: '25kg Family Bag',
      soldQty: 42,
      revenue: 66780,
      image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=100&q=80'
    },
    {
      name: 'Aachi Turmeric Powder',
      variant: '500g Value Pack',
      soldQty: 240,
      revenue: 32400,
      image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=100&q=80'
    },
    {
      name: 'Tata Sampann Unpolished Toor Dal',
      variant: '1kg Pouch',
      soldQty: 165,
      revenue: 28875,
      image: 'https://images.unsplash.com/photo-1596797882948-735959cfd41f?auto=format&fit=crop&w=100&q=80'
    }
  ];

  // Top loyal customers
  const TOP_CUSTOMERS = [
    { name: 'Lakshmi Narayanan', phone: '+91 98401 22334', orders: 18, spend: 34850, locality: 'RS Puram' },
    { name: 'Karpagam Venkat', phone: '+91 97890 55667', orders: 14, spend: 28400, locality: 'Gandhipuram' },
    { name: 'Murugan Selvam', phone: '+91 96290 88990', orders: 12, spend: 24150, locality: 'Peelamedu' },
    { name: 'Sundaramoorthy K.', phone: '+91 95000 11223', orders: 9, spend: 19800, locality: 'Saibaba Colony' }
  ];

  // 1. Most Viewed Products (App Traffic)
  const MOST_VIEWED_PRODUCTS = [
    {
      name: 'Idhayam Gingelly Sesame Oil',
      variant: '1L Pouch',
      views: 2450,
      conversion: '7.5%',
      image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=100&q=80'
    },
    {
      name: 'Amman Select Ponni Boiled Rice',
      variant: '25kg Family Bag',
      views: 1890,
      conversion: '4.2%',
      image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=100&q=80'
    },
    {
      name: 'Aachi Turmeric Powder',
      variant: '500g Value Pack',
      views: 1620,
      conversion: '14.8%',
      image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=100&q=80'
    },
    {
      name: "Narasu's Udhayam Coffee Powder",
      variant: '500g Pack',
      views: 1240,
      conversion: '9.1%',
      image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=100&q=80'
    }
  ];

  // 2. Products on Active Offer
  const PRODUCTS_ON_OFFER = [
    {
      name: 'Aachi Turmeric Powder 500g',
      discount: '13% OFF',
      mrp: 155,
      sellingPrice: 135,
      image: 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&w=100&q=80'
    },
    {
      name: 'Idhayam Sesame Oil 1L Pouch',
      discount: '12% OFF',
      mrp: 430,
      sellingPrice: 380,
      image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=100&q=80'
    },
    {
      name: 'Aashirvaad Whole Wheat Atta 5kg',
      discount: '18% OFF',
      mrp: 300,
      sellingPrice: 245,
      image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=100&q=80'
    },
    {
      name: 'Tata Sampann Unpolished Toor Dal 1kg',
      discount: '10% OFF',
      mrp: 195,
      sellingPrice: 175,
      image: 'https://images.unsplash.com/photo-1596797882948-735959cfd41f?auto=format&fit=crop&w=100&q=80'
    }
  ];

  // 3. High Return / Cancellation Risk Items
  const HIGH_RETURN_CANCEL_PRODUCTS = [
    {
      name: 'Fresh Farm Tomatoes 1kg',
      rate: '6.2%',
      returns: 12,
      cancels: 4,
      primaryReason: 'Perishable Damage in Transit'
    },
    {
      name: 'Amman Select Raw Rice 10kg',
      rate: '4.8%',
      returns: 6,
      cancels: 8,
      primaryReason: 'Wrong Bag Size Ordered'
    },
    {
      name: 'Fortune Refined Sunflower Oil 5L',
      rate: '3.5%',
      returns: 5,
      cancels: 2,
      primaryReason: 'Container Seal Leakage'
    },
    {
      name: 'Aachi Garam Masala Powder 100g',
      rate: '2.1%',
      returns: 2,
      cancels: 4,
      primaryReason: 'Customer Duplicate Order'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Upper Grid: Sales Trend Chart + Order Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart (2 Columns) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-subtle flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-700" />
                  <span>Gross Sales & Revenue Performance</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Consolidated orders across Coimbatore retail delivery zones
                </p>
              </div>

              {/* Timeframe selector */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
                {['Today', '7D', '30D', 'Month', 'Year'].map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setSalesTimeframe(tf)}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      salesTimeframe === tf
                        ? 'bg-emerald-800 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            {/* SVG Visual Bar/Area Chart */}
            <div className="h-56 w-full flex items-end gap-3 pt-6 pb-2 px-2 border-b border-slate-100">
              {currentSalesData.map((d, i) => {
                const heightPct = Math.max(12, Math.round((d.sales / maxSales) * 100));
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                    <span className="text-[10px] font-mono font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      {formatCurrency(d.sales)}
                    </span>
                    <div
                      style={{ height: `${heightPct}%` }}
                      className="w-full bg-gradient-to-t from-emerald-700 to-emerald-500 rounded-t-lg group-hover:from-emerald-800 group-hover:to-emerald-600 transition-all duration-300 relative shadow-sm"
                    />
                    <span className="text-[11px] font-medium text-slate-500 whitespace-nowrap">
                      {d.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-3">
            <span>Average Order Basket: <strong className="text-slate-800 font-semibold font-sans">{formatCurrency(785)}</strong></span>
            <span className="flex items-center gap-1 text-emerald-700 font-semibold">
              <TrendingUp className="w-3.5 h-3.5" />
              +14.8% growth vs prior cycle
            </span>
          </div>
        </div>

        {/* Order Status Distribution (1 Column) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-subtle flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-emerald-700" />
                <span>Order Status Breakdown</span>
              </h3>
              <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                {totalOrdersCount} Total
              </span>
            </div>

            <div className="space-y-2.5">
              {ORDER_STATUS_DISTRIBUTION.map((item) => {
                const pct = Math.round((item.count / totalOrdersCount) * 100);
                return (
                  <div key={item.status} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700">{item.status}</span>
                      <span className="font-mono text-slate-500">{item.count} ({pct}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div style={{ width: `${pct}%` }} className={`h-full ${item.color} rounded-full`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400">
            Fulfillment rate: <strong className="text-emerald-700">96.8%</strong> on-time dispatch
          </div>
        </div>
      </div>

      {/* Middle Grid: Top Selling Products + Top Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-subtle space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Flame className="w-4 h-4 text-rose-500" />
              <span>Top Selling Grocery Products</span>
            </h3>
            <span className="text-xs text-slate-400">This Month</span>
          </div>

          <div className="divide-y divide-slate-100">
            {TOP_SELLING.map((prod, idx) => (
              <div key={idx} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                    <img src={prod.image} alt={prod.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{prod.name}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{prod.variant}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-bold font-sans text-slate-900">
                    {formatCurrency(prod.revenue)}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {prod.soldQty} packs sold
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Customers */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-subtle space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-600" />
              <span>Highest Value Customers</span>
            </h3>
            <span className="text-xs text-slate-400">Lifetime Loyalty</span>
          </div>

          <div className="divide-y divide-slate-100">
            {TOP_CUSTOMERS.map((cust, idx) => (
              <div key={idx} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-800 font-bold text-xs flex items-center justify-center shrink-0">
                    {cust.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{cust.name}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{cust.locality} • {cust.phone}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-bold font-sans text-slate-900">
                    {formatCurrency(cust.spend)}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {cust.orders} Orders placed
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lower Grid: 3 Special Product Intelligence Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 1. Products on Active Offer */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-subtle space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-600" />
              <span>Products on Active Offer</span>
            </h3>
            <span className="text-[10px] uppercase font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Special Deals
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {PRODUCTS_ON_OFFER.map((item, idx) => (
              <div key={idx} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{item.name}</p>
                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className="text-emerald-700 font-bold">{formatCurrency(item.sellingPrice)}</span>
                      <span className="text-slate-400 line-through">{formatCurrency(item.mrp)}</span>
                    </div>
                  </div>
                </div>

                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full shrink-0">
                  {item.discount}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Most Viewed Products */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-subtle space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-600" />
              <span>Most Viewed Products</span>
            </h3>
            <span className="text-[10px] uppercase font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              App Traffic
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {MOST_VIEWED_PRODUCTS.map((item, idx) => (
              <div key={idx} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{item.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{item.variant}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-blue-700 font-mono block">
                    {item.views.toLocaleString()} views
                  </span>
                  <span className="text-[10px] text-emerald-700 font-medium">
                    {item.conversion} conv.
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Products with High Return / Cancellation Rate */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-subtle space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <PackageX className="w-4 h-4 text-rose-600" />
              <span>High Return & Cancel Risk</span>
            </h3>
            <span className="text-[10px] uppercase font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
              Risk Alert
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {HIGH_RETURN_CANCEL_PRODUCTS.map((item, idx) => (
              <div key={idx} className="py-2.5 first:pt-0 last:pb-0 space-y-1 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-slate-900 truncate">{item.name}</p>
                  <span className="font-bold font-mono text-rose-600 shrink-0">
                    {item.rate} rate
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 truncate max-w-[170px]">
                    {item.primaryReason}
                  </span>
                  <span className="text-slate-400 font-mono">
                    {item.returns} ret • {item.cancels} canc
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
