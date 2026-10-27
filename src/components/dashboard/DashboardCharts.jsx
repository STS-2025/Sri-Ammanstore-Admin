import React, { useState } from 'react';
import {
  TrendingUp,
  BarChart3,
  PieChart,
  Users,
  Flame,
  Eye,
  Tag,
  PackageX
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

const getStatus = (order) => String(order.status || '').trim().toLowerCase().replace(/[\s-]+/g, '_');

const getOrderDate = (order) => {
  const value = order.createdAt;
  const date = typeof value?.toDate === 'function'
    ? value.toDate()
    : value instanceof Date
      ? value
      : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getProductName = (product) => product.name || product.productName || product.title || 'Grocery Item';

const getItemName = (item) => item.productName || item.name || item.title || 'Grocery Item';

const getItemAmount = (item) => {
  const total = Number(item.totalPrice);
  if (Number.isFinite(total)) return total;
  const unitPrice = Number(item.unitPrice ?? item.price ?? 0);
  const quantity = Number(item.quantity ?? item.qty ?? 1);
  return Number.isFinite(unitPrice * quantity) ? unitPrice * quantity : 0;
};

const getItemQuantity = (item) => {
  const quantity = Number(item.quantity ?? item.qty ?? 1);
  return Number.isFinite(quantity) && quantity > 0 ? quantity : 0;
};

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const getSalesRange = (timeframe, now) => {
  if (timeframe === 'Today') {
    const start = startOfDay(now);
    const previousStart = new Date(start.getTime() - 86400000);
    return {
      start,
      end: now,
      previousStart,
      previousEnd: new Date(previousStart.getTime() + (now.getTime() - start.getTime()))
    };
  }

  if (timeframe === '7D' || timeframe === '30D') {
    const days = timeframe === '7D' ? 7 : 30;
    const start = new Date(now.getTime() - days * 86400000);
    const previousStart = new Date(start.getTime() - days * 86400000);
    return { start, end: now, previousStart, previousEnd: start };
  }

  if (timeframe === 'Month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousEnd = new Date(previousStart.getTime() + (now.getTime() - start.getTime()));
    return { start, end: now, previousStart, previousEnd };
  }

  const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const previousStart = new Date(now.getFullYear(), now.getMonth() - 23, 1);
  const previousEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate(), now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
  return { start, end: now, previousStart, previousEnd };
};

const createSalesBuckets = (timeframe, range, orders) => {
  let buckets;
  if (timeframe === 'Today') {
    buckets = Array.from({ length: 6 }, (_, index) => {
      const start = new Date(range.start);
      start.setHours(index * 4, 0, 0, 0);
      const end = new Date(start);
      end.setHours(end.getHours() + 4);
      return { start, end, label: `${String(index * 4).padStart(2, '0')}:00` };
    });
  } else if (timeframe === '7D') {
    buckets = Array.from({ length: 7 }, (_, index) => {
      const start = new Date(range.start.getTime() + index * 86400000);
      const end = new Date(start.getTime() + 86400000);
      return { start, end, label: start.toLocaleDateString(undefined, { weekday: 'short' }) };
    });
  } else if (timeframe === '30D') {
    buckets = Array.from({ length: 5 }, (_, index) => {
      const start = new Date(range.start.getTime() + index * 6 * 86400000);
      const end = new Date(Math.min(start.getTime() + 6 * 86400000, range.end.getTime() + 1));
      return { start, end, label: `Days ${index * 6 + 1}-${Math.min(index * 6 + 6, 30)}` };
    });
  } else if (timeframe === 'Month') {
    buckets = [];
    for (let day = 1; day <= range.end.getDate(); day += 7) {
      const start = new Date(range.start.getFullYear(), range.start.getMonth(), day);
      const end = new Date(range.start.getFullYear(), range.start.getMonth(), Math.min(day + 7, range.end.getDate() + 1));
      buckets.push({ start, end, label: `Days ${day}-${Math.min(day + 6, range.end.getDate())}` });
    }
  } else {
    buckets = Array.from({ length: 12 }, (_, index) => {
      const start = new Date(range.start.getFullYear(), range.start.getMonth() + index, 1);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      return { start, end, label: start.toLocaleDateString(undefined, { month: 'short' }) };
    });
  }

  return buckets.map((bucket) => ({
    ...bucket,
    sales: orders.reduce((sum, order) => {
      const date = getOrderDate(order);
      if (!date || date < bucket.start || date >= bucket.end || ['cancelled', 'returned'].includes(getStatus(order))) return sum;
      const amount = Number(order.totalAmount ?? order.total ?? 0);
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0)
  }));
};

export const DashboardCharts = ({ products = [], orders = [] }) => {
  const [salesTimeframe, setSalesTimeframe] = useState('7D');
  const now = new Date();

  const pendingCount = orders.filter((o) => ['pending', 'confirmed'].includes(getStatus(o))).length;
  const pickingCount = orders.filter((o) => getStatus(o) === 'picking').length;
  const packedCount = orders.filter((o) => getStatus(o) === 'packed').length;
  const readyCount = orders.filter((o) => ['ready', 'ready_to_ship'].includes(getStatus(o))).length;
  const outForDeliveryCount = orders.filter((o) => getStatus(o) === 'out_for_delivery').length;
  const deliveredCount = orders.filter((o) => getStatus(o) === 'delivered').length;
  const cancelledCount = orders.filter((o) => getStatus(o) === 'cancelled').length;
  const returnedCount = orders.filter((o) => getStatus(o) === 'returned').length;
  const ORDER_STATUS_DISTRIBUTION = [
    { status: 'Pending / Confirmed', count: pendingCount, color: 'bg-amber-500' },
    { status: 'Picking & Packing', count: pickingCount + packedCount, color: 'bg-indigo-500' },
    { status: 'Ready to Ship', count: readyCount, color: 'bg-cyan-500' },
    { status: 'Out for Delivery', count: outForDeliveryCount, color: 'bg-purple-500' },
    { status: 'Delivered', count: deliveredCount, color: 'bg-emerald-500' },
    { status: 'Cancelled', count: cancelledCount, color: 'bg-rose-500' },
    { status: 'Returned', count: returnedCount, color: 'bg-orange-500' }
  ];
  const totalOrdersCount = orders.length;

  const salesRange = getSalesRange(salesTimeframe, now);
  const currentSalesData = createSalesBuckets(salesTimeframe, salesRange, orders);
  const maxSales = Math.max(...currentSalesData.map((bucket) => bucket.sales), 1);
  const salesInRange = (start, end) => orders.reduce((sum, order) => {
    const date = getOrderDate(order);
    if (!date || date < start || date >= end || ['cancelled', 'returned'].includes(getStatus(order))) return sum;
    const amount = Number(order.totalAmount ?? order.total ?? 0);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);
  const currentSales = salesInRange(salesRange.start, salesRange.end);
  const previousSales = salesInRange(salesRange.previousStart, salesRange.previousEnd);
  const currentOrderCount = orders.filter((order) => {
    const date = getOrderDate(order);
    return date && date >= salesRange.start && date < salesRange.end && !['cancelled', 'returned'].includes(getStatus(order));
  }).length;
  const salesGrowth = previousSales > 0 ? ((currentSales - previousSales) / previousSales) * 100 : null;

  const productById = new Map(products.map((product) => [String(product.id), product]));
  const productByName = new Map(products.map((product) => [getProductName(product).trim().toLowerCase(), product]));
  const resolveProduct = (item) => productById.get(String(item.productId || item.productID || '')) ||
    productByName.get(getItemName(item).trim().toLowerCase());

  const productStats = new Map();
  orders.forEach((order) => {
    const status = getStatus(order);
    (Array.isArray(order.items) ? order.items : []).forEach((item) => {
      const product = resolveProduct(item);
      const name = product ? getProductName(product) : getItemName(item);
      const variant = String(item.variantName || item.packSize || product?.unit || '');
      const key = `${String(product?.id || name).toLowerCase()}::${variant.toLowerCase()}`;
      if (!productStats.has(key)) {
        productStats.set(key, {
          id: key,
          name,
          variant,
          image: product?.imageUrl || product?.frontImageUrl || product?.image || '',
          soldQty: 0,
          revenue: 0,
          orderIds: new Set(),
          totalOrders: 0,
          returns: 0,
          cancels: 0
        });
      }
      const stats = productStats.get(key);
      if (status === 'cancelled') {
        stats.cancels += 1;
      } else if (status === 'returned') {
        stats.returns += 1;
      }
      stats.totalOrders += 1;
      if (!['cancelled', 'returned'].includes(status) && item.pickStatus !== 'unavailable') {
        stats.soldQty += getItemQuantity(item);
        stats.revenue += getItemAmount(item);
        stats.orderIds.add(order.id || order.orderNumber);
      }
    });
  });
  const productActivity = Array.from(productStats.values()).map((product) => ({
    ...product,
    orderCount: product.orderIds.size,
    riskRate: product.totalOrders > 0 ? ((product.returns + product.cancels) / product.totalOrders) * 100 : 0
  }));
  const topSellingProducts = productActivity
    .filter((product) => product.soldQty > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 4);
  const mostOrderedProducts = [...productActivity]
    .filter((product) => product.soldQty > 0)
    .sort((a, b) => b.orderCount - a.orderCount || b.soldQty - a.soldQty)
    .slice(0, 4);
  const riskProducts = productActivity
    .filter((product) => product.returns + product.cancels > 0)
    .sort((a, b) => b.riskRate - a.riskRate)
    .slice(0, 4);

  const customerStats = new Map();
  orders.forEach((order) => {
    if (['cancelled', 'returned'].includes(getStatus(order))) return;
    const phone = order.customerPhone || order.phone || '';
    const name = order.customerName || order.userProfile?.name || order.userProfile?.fullName || '';
    const identity = order.customerId || phone.trim() || name.trim().toLowerCase();
    if (!identity || /^(customer|guest)$/i.test(name.trim())) return;
    const key = String(identity).toLowerCase();
    if (!customerStats.has(key)) {
      customerStats.set(key, {
        id: key,
        name: name || 'Store Customer',
        phone,
        locality: order.deliveryAddress?.locality || order.deliveryAddress?.city || order.address?.locality || '',
        orders: 0,
        spend: 0
      });
    }
    const customer = customerStats.get(key);
    customer.orders += 1;
    const amount = Number(order.totalAmount ?? order.total ?? 0);
    customer.spend += Number.isFinite(amount) ? amount : 0;
  });
  const topCustomers = Array.from(customerStats.values()).sort((a, b) => b.spend - a.spend).slice(0, 4);

  const discountedProducts = products.flatMap((product) => {
    const variants = Array.isArray(product.variants) && product.variants.length > 0
      ? product.variants
      : [product];
    return variants.flatMap((variant) => {
      const mrp = Number(variant.mrp ?? product.mrp ?? 0);
      const sellingPrice = Number(variant.sellingPrice ?? variant.price ?? product.sellingPrice ?? product.price ?? 0);
      if (!(mrp > sellingPrice && sellingPrice > 0)) return [];
      return [{
        id: `${product.id}-${variant.id || variant.name || 'default'}`,
        name: getProductName(product),
        variant: variant.name || variant.unit || product.unit || '',
        mrp,
        sellingPrice,
        discount: `${Math.round(((mrp - sellingPrice) / mrp) * 100)}% OFF`,
        image: product.imageUrl || product.frontImageUrl || product.image || ''
      }];
    });
  }).slice(0, 4);

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
                  <span>Sales & Revenue Performance</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Sales from recorded orders, excluding cancelled and returned orders
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
            <div className="h-56 w-full flex items-end gap-3 pt-6 pb-2 px-2 border-b border-slate-100 relative">
              {currentOrderCount === 0 && (
                <p className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">
                  No sales recorded for this period
                </p>
              )}
              {currentSalesData.map((d, i) => {
                const heightPct = d.sales > 0 ? Math.max(8, Math.round((d.sales / maxSales) * 100)) : 0;
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
            <span>Average Order Basket: <strong className="text-slate-800 font-semibold font-sans">{formatCurrency(currentOrderCount ? currentSales / currentOrderCount : 0)}</strong></span>
            <span className={`flex items-center gap-1 font-semibold ${salesGrowth !== null && salesGrowth < 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
              {salesGrowth !== null && <TrendingUp className="w-3.5 h-3.5" />}
              {salesGrowth === null
                ? 'No prior-period sales'
                : `${salesGrowth > 0 ? '+' : ''}${salesGrowth.toFixed(1)}% vs prior period`}
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
                const pct = totalOrdersCount > 0 ? Math.round((item.count / totalOrdersCount) * 100) : 0;
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
            Delivery completion rate:{' '}
            <strong className="text-emerald-700">
              {deliveredCount + cancelledCount + returnedCount > 0
                ? `${Math.round((deliveredCount / (deliveredCount + cancelledCount + returnedCount)) * 100)}%`
                : '—'}
            </strong>
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
            <span className="text-xs text-slate-400">Completed orders</span>
          </div>

          <div className="divide-y divide-slate-100">
            {topSellingProducts.length === 0 && (
              <p className="py-8 text-center text-xs text-slate-400">No product sales recorded yet</p>
            )}
            {topSellingProducts.map((prod) => (
              <div key={prod.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                    {prod.image && <img src={prod.image} alt={prod.name} className="w-full h-full object-cover" />}
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
            {topCustomers.length === 0 && (
              <p className="py-8 text-center text-xs text-slate-400">No customer order history yet</p>
            )}
            {topCustomers.map((cust) => (
              <div key={cust.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-800 font-bold text-xs flex items-center justify-center shrink-0">
                    {cust.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{cust.name}</p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {[cust.locality, cust.phone].filter(Boolean).join(' • ') || 'Customer order history'}
                    </p>
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
        {/* 1. Products currently priced below MRP */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-subtle space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-600" />
              <span>Products Priced Below MRP</span>
            </h3>
            <span className="text-[10px] uppercase font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Current Prices
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {discountedProducts.length === 0 && (
              <p className="py-8 text-center text-xs text-slate-400">No products are currently priced below MRP</p>
            )}
            {discountedProducts.map((item) => (
              <div key={item.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                    {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{item.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{item.variant}</p>
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

        {/* 2. Most frequently ordered products */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-subtle space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-600" />
              <span>Most Ordered Products</span>
            </h3>
            <span className="text-[10px] uppercase font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              Order Activity
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {mostOrderedProducts.length === 0 && (
              <p className="py-8 text-center text-xs text-slate-400">No product order activity yet</p>
            )}
            {mostOrderedProducts.map((item) => (
              <div key={item.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                    {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover" />}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{item.name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{item.variant}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-blue-700 font-mono block">
                    {item.orderCount} orders
                  </span>
                  <span className="text-[10px] text-emerald-700 font-medium">
                    {item.soldQty} units sold
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
              <span>Returns & Cancellation</span>
            </h3>
            <span className="text-[10px] uppercase font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
              Risk Alert
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {riskProducts.length === 0 && (
              <p className="py-8 text-center text-xs text-slate-400">No cancelled or returned product orders</p>
            )}
            {riskProducts.map((item) => (
              <div key={item.id} className="py-2.5 first:pt-0 last:pb-0 space-y-1 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-slate-900 truncate">{item.name}</p>
                  <span className="font-bold font-mono text-rose-600 shrink-0">
                    {item.riskRate.toFixed(1)}% items
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 truncate max-w-[170px]">
                    Cancelled or returned orders
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
