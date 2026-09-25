import { getAllOrders } from './orderService';
import { getAllProducts } from './productService';
import { getAllCustomers } from './customerService';
import { getAllDeliveryAgents, getAllDeliveryBatches } from './deliveryService';
import { getAllPromoCodes } from './promoService';
import { getAllCampaigns, getAllBanners } from './marketingService';
import { getInventoryMetrics } from './inventoryService';

/**
 * Generate full comprehensive analytics report data
 */
export const getComprehensiveReportData = async () => {
  const [orders, products, customers, agents, batches, promos, campaigns, banners, inventory] = await Promise.all([
    getAllOrders(),
    getAllProducts(),
    getAllCustomers(),
    getAllDeliveryAgents(),
    getAllDeliveryBatches(),
    getAllPromoCodes(),
    getAllCampaigns(),
    getAllBanners(),
    getInventoryMetrics()
  ]);

  // 1. Sales & Order Analytics
  const totalSales = orders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? Number(o.totalAmount || 0) : 0), 0);
  const deliveredOrders = orders.filter(o => o.status === 'delivered');
  const cancelledOrders = orders.filter(o => o.status === 'cancelled');
  const pendingOrders = orders.filter(o => o.status === 'placed' || o.status === 'confirmed' || o.status === 'picking');
  const deliveredRevenue = deliveredOrders.reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);
  const aov = orders.length > 0 ? Math.round(totalSales / orders.length) : 0;

  // 2. Product Performance
  const productSalesMap = {};
  orders.forEach(ord => {
    if (ord.items && Array.isArray(ord.items)) {
      ord.items.forEach(item => {
        const key = item.productId || item.productName || 'unknown';
        if (!productSalesMap[key]) {
          productSalesMap[key] = {
            id: key,
            name: item.productName || 'Grocery Item',
            variant: item.variantName || 'Pack',
            unitsSold: 0,
            revenue: 0
          };
        }
        productSalesMap[key].unitsSold += (item.quantity || 1);
        productSalesMap[key].revenue += (item.totalPrice || ((item.unitPrice || 100) * (item.quantity || 1)));
      });
    }
  });

  const topSellingProducts = Object.values(productSalesMap).sort((a, b) => b.unitsSold - a.unitsSold);

  // 3. Customer Spending
  const customerSpending = customers.map(c => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    totalOrders: c.totalOrders || 0,
    totalSpent: c.totalSpent || 0,
    smartCoins: c.smartCoins || 0,
    status: c.status || 'active'
  })).sort((a, b) => b.totalSpent - a.totalSpent);

  // 4. Delivery Agent Performance
  const agentPerformance = agents.map(ag => {
    const totalRuns = (ag.completedToday || 0) + (ag.failedToday || 0);
    const successRate = totalRuns > 0 ? Math.round(((ag.completedToday || 0) / totalRuns) * 100) : 100;
    return {
      id: ag.id,
      name: ag.name,
      vehicle: ag.vehicleNumber,
      completedToday: ag.completedToday || 0,
      failedToday: ag.failedToday || 0,
      codCollected: ag.codCollectedToday || 0,
      codDeposited: ag.codDepositedToday || 0,
      pendingCod: Math.max(0, (ag.codCollectedToday || 0) - (ag.codDepositedToday || 0)),
      successRate,
      rating: ag.rating || 5.0
    };
  });

  return {
    raw: {
      orders,
      products,
      customers,
      agents,
      batches,
      promos,
      campaigns,
      banners,
      inventory
    },
    metrics: {
      totalSales,
      deliveredRevenue,
      totalOrdersCount: orders.length,
      deliveredCount: deliveredOrders.length,
      cancelledCount: cancelledOrders.length,
      pendingCount: pendingOrders.length,
      aov,
      topSellingProducts,
      customerSpending,
      agentPerformance
    }
  };
};

/**
 * Export rows array to CSV and trigger browser download
 */
export const exportDataToCsv = (filename, headers, rows) => {
  const escapeCsv = (str) => {
    if (str === null || str === undefined) return '""';
    const stringified = String(str).replace(/"/g, '""');
    return `"${stringified}"`;
  };

  const csvContent = [
    headers.map(h => escapeCsv(h.label)).join(','),
    ...rows.map(row => headers.map(h => escapeCsv(row[h.key])).join(','))
  ].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
