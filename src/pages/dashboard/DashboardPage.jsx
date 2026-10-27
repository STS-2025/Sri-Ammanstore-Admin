import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  ShoppingCart,
  Boxes,
  Truck,
  IndianRupee,
  AlertTriangle,
  Clock,
  PackageCheck,
  PackageX,
  RotateCcw,
  CheckCircle2,
  AlertOctagon,
  CreditCard,
  Plus,
  QrCode,
  UserCheck,
  Zap,
  Sparkles
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { DashboardQuickActions } from '../../components/dashboard/DashboardQuickActions';
import { DashboardCharts } from '../../components/dashboard/DashboardCharts';
import { DashboardRecentWidgets } from '../../components/dashboard/DashboardRecentWidgets';
import { BarcodeScannerModal } from '../../components/common/BarcodeScannerModal';
import { ProductFormModal } from '../../components/products/ProductFormModal';
import { ModalErrorBoundary } from '../../components/common/ModalErrorBoundary';
import { getAllProducts, createProduct } from '../../firebase/productService';
import { getInventoryMetrics } from '../../firebase/inventoryService';
import { getAllOrders } from '../../firebase/orderService';
import { getAllProductRequests } from '../../firebase/productRequestService';
import { getAllDeliveryAgents } from '../../firebase/deliveryService';
import { formatCurrency } from '../../utils/formatters';
import { useNotification } from '../../context/NotificationContext';
import { usePermissions } from '../../hooks/usePermissions';

const normalizeOrderStatus = (status) => String(status || '').trim().toLowerCase().replace(/[\s-]+/g, '_');

export const DashboardPage = () => {
  const [metrics, setMetrics] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [productRequests, setProductRequests] = useState([]);
  const [deliveryAgents, setDeliveryAgents] = useState([]);
  const [stockAuditLogs, setStockAuditLogs] = useState([]);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const notify = useNotification();
  const { currentUser } = usePermissions();

  const loadData = async () => {
    try {
      const p = await getAllProducts();
      const m = await getInventoryMetrics();
      const ords = await getAllOrders();
      const reqs = await getAllProductRequests();
      const agents = await getAllDeliveryAgents();

      setProducts(p);
      setMetrics(m);
      setOrders(ords || []);
      setProductRequests(reqs || []);
      setDeliveryAgents(agents || []);

      // Load local stock audit logs
      try {
        const storedLogs = JSON.parse(localStorage.getItem('grocery_admin_audit_logs') || '[]');
        setStockAuditLogs(storedLogs);
      } catch (e) {
        setStockAuditLogs([]);
      }
    } catch (e) {
      console.warn('Dashboard data fetch note:', e);
    }
  };


  useEffect(() => {
    loadData();
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todaysOrders = orders.filter(o => {
    const orderDate = new Date(o.createdAt);
    orderDate.setHours(0, 0, 0, 0);
    return orderDate.getTime() === today.getTime();
  });

  const todaysOrdersCount = todaysOrders.length;

  const todaysSalesAmount = todaysOrders.reduce((sum, order) => (
    ['cancelled', 'returned'].includes(normalizeOrderStatus(order.status))
      ? sum
      : sum + (Number(order.totalAmount) || 0)
  ), 0);

  const handleCreateProductSubmit = async (formData) => {
    setIsSubmitting(true);
    try {
      await createProduct(formData, currentUser);
      notify.success('Product Added', `${formData.name} added to catalog.`);
      setAddProductOpen(false);
      await loadData();
    } catch (e) {
      notify.error('Creation Failed', e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dynamic calculations from live store data
  const totalSalesAmount = orders.reduce((sum, order) => (
    ['cancelled', 'returned'].includes(normalizeOrderStatus(order.status))
      ? sum
      : sum + (Number(order.totalAmount) || 0)
  ), 0);
  const onlinePrepaidTotal = orders.reduce((sum, order) => (
    order.paymentMethod !== 'COD' &&
    normalizeOrderStatus(order.paymentStatus) === 'paid' &&
    !['cancelled', 'returned'].includes(normalizeOrderStatus(order.status))
      ? sum + (Number(order.totalAmount) || 0)
      : sum
  ), 0);
  const pendingCodTotal = orders.reduce((sum, order) => (
    order.paymentMethod === 'COD' &&
    !['delivered', 'cancelled', 'returned'].includes(normalizeOrderStatus(order.status))
      ? sum + (Number(order.totalAmount) || 0)
      : sum
  ), 0);

  const pendingCount = orders.filter(o => ['confirmed', 'pending'].includes(normalizeOrderStatus(o.status))).length;
  const waitingPackingCount = orders.filter(o => normalizeOrderStatus(o.status) === 'picking').length;
  const packedCount = orders.filter(o => normalizeOrderStatus(o.status) === 'packed').length;
  const readyToShipCount = orders.filter(o => ['ready', 'ready_to_ship'].includes(normalizeOrderStatus(o.status))).length;
  const outForDeliveryCount = orders.filter(o => normalizeOrderStatus(o.status) === 'out_for_delivery').length;
  const deliveredCount = orders.filter(o => normalizeOrderStatus(o.status) === 'delivered').length;
  const cancelledCount = orders.filter(o => normalizeOrderStatus(o.status) === 'cancelled').length;
  const returnedCount = orders.filter(o => normalizeOrderStatus(o.status) === 'returned').length;

  const activeAgentsCount = deliveryAgents.filter(a => a.status === 'active' || a.status === 'on_delivery' || a.status === 'available').length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Grocery Retail Operations"
        subtitle="Store operations overview based on recorded orders, products, and inventory."
        actions={
          <button
            onClick={() => setAddProductOpen(true)}
            className="btn-primary text-xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Grocery Product</span>
          </button>
        }
      />

      {/* Fast Operational Shortcuts */}
      <DashboardQuickActions
        onOpenBarcodeScanner={() => setScannerOpen(true)}
        onAddProduct={() => setAddProductOpen(true)}
      />

      {/* 15 Operational Metric Cards (Organized in 3 Rows of 5 Cards Each) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Fulfillment & Financial Operations (15 Operational Metrics)
          </span>
          <span className="text-[11px] text-slate-400">Click any card to open relevant module</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* ROW 1: Sales, Orders & Payment Totals */}
          {/* 1. Today's Orders */}
          {/*<StatCard
            title="Today's Total Orders"
            value={`${orders.length}`}
            change={orders.length > 0 ? "Live count" : "0 orders"}
            changeType={orders.length > 0 ? "positive" : "neutral"}
            icon={ShoppingCart}
            variant="primary"
            onClick={() => navigate('/orders')}
          />*/}
          <StatCard
            title="Today's Total Orders"
            value={`${todaysOrdersCount}`}
            change={todaysOrdersCount > 0 ? "Today's orders" : "0 orders"}
            changeType={todaysOrdersCount > 0 ? "positive" : "neutral"}
            icon={ShoppingCart}
            variant="primary"
            onClick={() => navigate('/orders')}
          />

          {/* 2. Today's Sales */}
          {/*<StatCard
            title="Today's Sales Revenue"
            value={formatCurrency(totalSalesAmount)}
            change={totalSalesAmount > 0 ? "Gross total" : "₹0 revenue"}
            changeType={totalSalesAmount > 0 ? "positive" : "neutral"}
            icon={IndianRupee}
            variant="primary"
            onClick={() => navigate('/orders')}
          />*/}
          <StatCard
            title="Today's Sales Revenue"
            value={formatCurrency(todaysSalesAmount)}
            change={todaysSalesAmount > 0 ? "Today's sales, excluding cancelled/returned" : "₹0 revenue"}
            changeType={todaysSalesAmount > 0 ? "positive" : "neutral"}
            icon={IndianRupee}
            variant="primary"
            onClick={() => navigate('/orders')}
          />

          {/* 3. Online / Prepaid Payment Total */}
          <StatCard
            title="Online / Prepaid Total"
            value={formatCurrency(onlinePrepaidTotal)}
            change="Paid prepaid orders"
            changeType="positive"
            icon={Zap}
            variant="primary"
            onClick={() => navigate('/orders')}
          />

          {/* 4. Pending COD Total */}
          <StatCard
            title="Pending COD Total"
            value={formatCurrency(pendingCodTotal)}
            subtext="In rider wallets"
            icon={CreditCard}
            variant="warning"
            onClick={() => navigate('/delivery')}
          />

          {/* 5. Delivery Agents Active */}
          <StatCard
            title="Active Delivery Agents"
            value={`${activeAgentsCount} Riders`}
            subtext="Fleet riders active"
            icon={UserCheck}
            variant="info"
            onClick={() => navigate('/delivery')}
          />

          {/* ROW 2: Fulfillment & Processing Pipeline */}
          {/* 6. Pending Orders */}
          <StatCard
            title="Pending Orders"
            value={`${pendingCount}`}
            subtext="Awaiting review"
            icon={Clock}
            variant="warning"
            onClick={() => navigate('/orders')}
          />

          {/* 7. Waiting for Packing */}
          <StatCard
            title="Waiting Packing"
            value={`${waitingPackingCount}`}
            subtext="Ready for picking"
            icon={Boxes}
            variant="default"
            onClick={() => navigate('/orders')}
          />

          {/* 8. Packed Orders */}
          <StatCard
            title="Packed Orders"
            value={`${packedCount}`}
            subtext="Invoices printed"
            icon={PackageCheck}
            variant="default"
            onClick={() => navigate('/orders')}
          />

          {/* 9. Ready to Ship */}
          <StatCard
            title="Ready to Ship"
            value={`${readyToShipCount}`}
            subtext="In dispatch hub"
            icon={Truck}
            variant="info"
            onClick={() => navigate('/orders')}
          />

          {/* 10. Out for Delivery */}
          <StatCard
            title="Out for Delivery"
            value={`${outForDeliveryCount}`}
            subtext="Dispatched runs"
            icon={Truck}
            variant="info"
            onClick={() => navigate('/delivery')}
          />

          {/* ROW 3: Delivery Status, Returns & Inventory Health */}
          {/* 11. Delivered */}
          <StatCard
            title="Delivered"
            value={`${deliveredCount}`}
            change={deliveredCount > 0 ? "Handed over" : "0 delivered"}
            changeType="positive"
            icon={CheckCircle2}
            variant="primary"
            onClick={() => navigate('/orders')}
          />

          {/* 12. Cancelled */}
          <StatCard
            title="Cancelled"
            value={`${cancelledCount}`}
            change="Cancelled orders"
            changeType="neutral"
            icon={PackageX}
            variant="danger"
            onClick={() => navigate('/orders')}
          />

          {/* 13. Returned */}
          <StatCard
            title="Returned"
            value={`${returnedCount}`}
            subtext="Return claims"
            icon={RotateCcw}
            variant="warning"
            onClick={() => navigate('/orders')}
          />

          {/* 14. Low Stock */}
          <StatCard
            title="Low Stock"
            value={`${metrics?.lowStockCount || 0} Items`}
            change="Below safety"
            changeType="negative"
            icon={AlertTriangle}
            variant="warning"
            onClick={() => navigate('/inventory')}
          />

          {/* 15. Out of Stock */}
          <StatCard
            title="Out of Stock"
            value={`${metrics?.outOfStockCount || 0} Items`}
            change="Immediate reorder"
            changeType="negative"
            icon={AlertOctagon}
            variant="danger"
            onClick={() => navigate('/inventory')}
          />
        </div>
      </div>

      {/* Analytics Charts & Revenue Performance */}
      <DashboardCharts products={products} orders={orders} />

      {/* Live Recent Widgets: Orders Feed, Customer Requests & Stock Updates */}
      <DashboardRecentWidgets
        orders={orders}
        requests={productRequests}
        stockAuditLogs={stockAuditLogs}
      />

      {/* Modals */}
      <BarcodeScannerModal
        isOpen={scannerOpen}
        onClose={() => {
          setScannerOpen(false);
          loadData();
        }}
      />

      <ModalErrorBoundary
        resetKey={addProductOpen ? 'open' : 'closed'}
        onReset={() => setAddProductOpen(false)}
      >
        <ProductFormModal
          isOpen={addProductOpen}
          onClose={() => setAddProductOpen(false)}
          onSubmit={handleCreateProductSubmit}
          isSubmitting={isSubmitting}
        />
      </ModalErrorBoundary>
    </div>
  );
};
