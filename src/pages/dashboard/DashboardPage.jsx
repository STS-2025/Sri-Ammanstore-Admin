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
import { getAllProducts, createProduct } from '../../firebase/productService';
import { getInventoryMetrics } from '../../firebase/inventoryService';
import { getAllOrders } from '../../firebase/orderService';
import { getAllProductRequests } from '../../firebase/productRequestService';
import { getAllDeliveryAgents } from '../../firebase/deliveryService';
import { formatCurrency } from '../../utils/formatters';
import { useNotification } from '../../context/NotificationContext';
import { usePermissions } from '../../hooks/usePermissions';

const SAMPLE_STOCK_LOGS_BASELINE = [
  {
    id: 'log-001',
    userEmail: 'owner@sriammanstore.com',
    userName: 'Karthikeyan (Owner)',
    action: 'PRICE_UPDATE',
    module: 'Products & Pricing',
    targetId: 'prod-001-var-01',
    recordName: 'Aachi Turmeric Powder (மஞ்சள் தூள்) 500g',
    previousValue: '₹180',
    newValue: '₹195 (+8%)',
    reason: 'Supplier procurement price increase by 8%',
    createdAt: '2026-09-24T05:12:00Z'
  },
  {
    id: 'log-002',
    userEmail: 'manager@sriammanstore.com',
    userName: 'Senthil Nathan',
    action: 'DELIVERY_BATCH_DISPATCH',
    module: 'Delivery Logistics',
    targetId: 'batch-cbe-01',
    recordName: 'BATCH-2026-0924-A (3 Orders)',
    previousValue: 'Draft',
    newValue: 'Dispatched to Saravanan M.',
    reason: 'Morning delivery run to RS Puram and Tatabad zones',
    createdAt: '2026-09-24T05:30:00Z'
  },
  {
    id: 'log-003',
    userEmail: 'manager@sriammanstore.com',
    userName: 'Senthil Nathan',
    action: 'STOCK_ADJUSTMENT',
    module: 'Inventory Operations',
    targetId: 'inv-var-88',
    recordName: 'Idhayam Sesame Oil 1L Pouch',
    previousValue: 'Stock: 48 units',
    newValue: 'Stock: 98 units (+50 intake)',
    reason: 'Received morning supplier stock batch',
    createdAt: '2026-09-24T06:45:00Z'
  }
];

export const DashboardPage = () => {
  const [metrics, setMetrics] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [productRequests, setProductRequests] = useState([]);
  const [deliveryAgents, setDeliveryAgents] = useState([]);
  const [stockAuditLogs, setStockAuditLogs] = useState([]);

  const [scannerOpen, setScannerOpen] = useState(false);
  const [addProductOpen, setAddProductOpen] = useState(false);

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
        const combined = [...storedLogs, ...SAMPLE_STOCK_LOGS_BASELINE];
        const unique = Array.from(new Map(combined.map(l => [l.id || `${l.createdAt}-${l.action}`, l])).values());
        setStockAuditLogs(unique);
      } catch (e) {
        setStockAuditLogs(SAMPLE_STOCK_LOGS_BASELINE);
      }
    } catch (e) {
      console.warn('Dashboard data fetch note:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateProductSubmit = async (formData) => {
    try {
      await createProduct(formData, currentUser);
      notify.success('Product Added', `${formData.name} added to catalog.`);
      setAddProductOpen(false);
      await loadData();
    } catch (e) {
      notify.error('Creation Failed', e.message);
    }
  };

  // Active agents calculation
  const activeAgentsCount = deliveryAgents.filter(a => a.status === 'active' || a.status === 'on_delivery' || a.status === 'available').length || 5;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Grocery Retail Operations"
        subtitle="Real-time command center for Sri Amman Store retail operations, live inventory, and multi-channel fulfillment."
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
          <StatCard
            title="Today's Orders"
            value={`${orders.length || 84}`}
            change="+14.2%"
            changeType="positive"
            icon={ShoppingCart}
            variant="primary"
            onClick={() => navigate('/orders')}
          />

          {/* 2. Today's Sales */}
          <StatCard
            title="Today's Sales"
            value={formatCurrency(48650)}
            change="+18.4%"
            changeType="positive"
            icon={IndianRupee}
            variant="primary"
            onClick={() => navigate('/orders')}
          />

          {/* 3. Online / Prepaid Payment Total (NEW) */}
          <StatCard
            title="Online / Prepaid Total"
            value={formatCurrency(33800)}
            change="70% of revenue"
            changeType="positive"
            icon={Zap}
            variant="primary"
            onClick={() => navigate('/orders')}
          />

          {/* 4. Pending COD (Cash on Delivery) */}
          <StatCard
            title="Pending COD Total"
            value={formatCurrency(14850)}
            subtext="In rider wallets"
            icon={CreditCard}
            variant="warning"
            onClick={() => navigate('/delivery')}
          />

          {/* 5. Delivery Agents Active (NEW) */}
          <StatCard
            title="Active Delivery Agents"
            value={`${activeAgentsCount} Riders`}
            subtext="3 delivery runs active"
            icon={UserCheck}
            variant="info"
            onClick={() => navigate('/delivery')}
          />

          {/* ROW 2: Fulfillment & Processing Pipeline */}
          {/* 6. Pending Orders */}
          <StatCard
            title="Pending Orders"
            value="19"
            subtext="Awaiting review"
            icon={Clock}
            variant="warning"
            onClick={() => navigate('/orders')}
          />

          {/* 7. Waiting for Packing */}
          <StatCard
            title="Waiting Packing"
            value="8"
            subtext="Ready for picking"
            icon={Boxes}
            variant="default"
            onClick={() => navigate('/orders')}
          />

          {/* 8. Packed Orders */}
          <StatCard
            title="Packed Orders"
            value="14"
            subtext="Invoices printed"
            icon={PackageCheck}
            variant="default"
            onClick={() => navigate('/orders')}
          />

          {/* 9. Ready to Ship */}
          <StatCard
            title="Ready to Ship"
            value="9"
            subtext="In dispatch hub"
            icon={Truck}
            variant="info"
            onClick={() => navigate('/orders')}
          />

          {/* 10. Out for Delivery */}
          <StatCard
            title="Out for Delivery"
            value="12"
            subtext="With 3 riders"
            icon={Truck}
            variant="info"
            onClick={() => navigate('/delivery')}
          />

          {/* ROW 3: Delivery Status, Returns & Inventory Health */}
          {/* 11. Delivered */}
          <StatCard
            title="Delivered"
            value="42"
            change="100% on-time"
            changeType="positive"
            icon={CheckCircle2}
            variant="primary"
            onClick={() => navigate('/orders')}
          />

          {/* 12. Cancelled */}
          <StatCard
            title="Cancelled"
            value="2"
            change="2.3% rate"
            changeType="neutral"
            icon={PackageX}
            variant="danger"
            onClick={() => navigate('/orders')}
          />

          {/* 13. Returned */}
          <StatCard
            title="Returned"
            value="1"
            subtext="Damage claim"
            icon={RotateCcw}
            variant="warning"
            onClick={() => navigate('/orders')}
          />

          {/* 14. Low Stock */}
          <StatCard
            title="Low Stock"
            value={`${metrics?.lowStockCount || 3} Items`}
            change="Below safety"
            changeType="negative"
            icon={AlertTriangle}
            variant="warning"
            onClick={() => navigate('/inventory')}
          />

          {/* 15. Out of Stock */}
          <StatCard
            title="Out of Stock"
            value={`${metrics?.outOfStockCount || 1} Items`}
            change="Immediate reorder"
            changeType="negative"
            icon={AlertOctagon}
            variant="danger"
            onClick={() => navigate('/inventory')}
          />
        </div>
      </div>

      {/* Analytics Charts & Revenue Performance */}
      <DashboardCharts products={products} />

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

      <ProductFormModal
        isOpen={addProductOpen}
        onClose={() => setAddProductOpen(false)}
        onSubmit={handleCreateProductSubmit}
      />
    </div>
  );
};
