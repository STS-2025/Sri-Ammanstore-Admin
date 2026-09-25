import React, { useState, useEffect } from 'react';
import {
  ShoppingCart,
  Search,
  Filter,
  PackageCheck,
  Printer,
  Eye,
  Truck,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  Calendar,
  IndianRupee,
  Layers
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/table/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { OrderDetailModal } from '../../components/orders/OrderDetailModal';
import { PackingWorkstationModal } from '../../components/orders/PackingWorkstationModal';
import { PrintableDocumentsModal } from '../../components/orders/PrintableDocumentsModal';
import { PermissionGuard } from '../../components/auth/PermissionGuard';
import { PERMISSIONS } from '../../utils/permissions';
import { getAllOrders, updateOrderStatus } from '../../firebase/orderService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { useNotification } from '../../context/NotificationContext';
import { usePermissions } from '../../hooks/usePermissions';

export const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);

  // Modals
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [packingModalOpen, setPackingModalOpen] = useState(false);
  const [packingTargetOrder, setPackingTargetOrder] = useState(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printDocType, setPrintDocType] = useState('invoice');
  const [printTargetOrder, setPrintTargetOrder] = useState(null);

  const notify = useNotification();
  const { currentUser } = usePermissions();

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getAllOrders();
      setOrders(data);
    } catch (err) {
      notify.error('Failed to load orders', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredOrders = orders.filter((ord) => {
    if (statusFilter !== 'ALL' && ord.status !== statusFilter) return false;
    if (paymentFilter !== 'ALL' && ord.paymentMethod !== paymentFilter) return false;
    if (priorityFilter !== 'ALL' && ord.priority !== priorityFilter) return false;

    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      ord.orderNumber.toLowerCase().includes(q) ||
      ord.customerName.toLowerCase().includes(q) ||
      ord.customerPhone.includes(q) ||
      ord.deliveryAddress?.locality?.toLowerCase().includes(q) ||
      ord.assignedAgentName?.toLowerCase().includes(q)
    );
  });

  const handleOpenPrint = (ord, type = 'invoice') => {
    setPrintTargetOrder(ord);
    setPrintDocType(type);
    setPrintModalOpen(true);
  };

  const handleOpenPacking = (ord) => {
    setPackingTargetOrder(ord);
    setPackingModalOpen(true);
  };

  const columns = [
    {
      key: 'orderNumber',
      header: 'Order ID',
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-mono font-bold text-slate-900">{row.orderNumber}</span>
          {row.priority === 'Express' && (
            <span className="block text-[9px] uppercase font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200 w-max mt-0.5">
              Express
            </span>
          )}
        </div>
      )
    },
    {
      key: 'createdAt',
      header: 'Placed Date',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs text-slate-500">
          {formatDateTime(row.createdAt)}
        </span>
      )
    },
    {
      key: 'customerName',
      header: 'Customer & Contact',
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-bold text-slate-900">{row.customerName}</div>
          <div className="text-[11px] text-slate-400 font-mono">{row.customerPhone}</div>
          <span className="text-[10px] text-slate-500 line-clamp-1">{row.deliveryAddress?.locality}</span>
        </div>
      )
    },
    {
      key: 'deliverySlot',
      header: 'Slot & Distance',
      render: (row) => (
        <div className="text-xs">
          <span className="text-slate-800 font-medium">{row.deliverySlot}</span>
          <span className="block text-[11px] text-slate-400 font-mono">~{row.distanceKm} km</span>
        </div>
      )
    },
    {
      key: 'itemsCount',
      header: 'Items',
      align: 'center',
      render: (row) => (
        <span className="font-mono font-bold text-slate-700">{row.itemsCount} pkgs</span>
      )
    },
    {
      key: 'totalAmount',
      header: 'Amount / Pay',
      align: 'right',
      sortable: true,
      render: (row) => (
        <div className="text-right">
          <div className="font-bold font-sans text-slate-900 text-xs">
            {formatCurrency(row.totalAmount)}
          </div>
          <span className="text-[10px] uppercase font-mono font-semibold text-slate-400">
            {row.paymentMethod} • {row.paymentStatus}
          </span>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (row) => <StatusBadge status={row.status} />
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => {
              setSelectedOrder(row);
              setDetailModalOpen(true);
            }}
            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="View Order Details"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          <PermissionGuard permission={PERMISSIONS.ORDERS_PACK}>
            <button
              onClick={() => handleOpenPacking(row)}
              className="p-1.5 text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors"
              title="Open Packing Station"
            >
              <PackageCheck className="w-3.5 h-3.5" />
            </button>
          </PermissionGuard>

          <PermissionGuard permission={PERMISSIONS.ORDERS_PRINT}>
            <button
              onClick={() => handleOpenPrint(row, 'invoice')}
              className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
              title="Print Customer Invoice & Shipping Label"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
          </PermissionGuard>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Grocery Order Fulfillment Operations"
        subtitle="Manage end-to-end order processing, picking workstation checklists, parcel printing, and customer deliveries."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenPrint(null, 'manifest')}
              className="btn-secondary text-xs"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Print Batch Manifest</span>
            </button>
            <button
              onClick={() => handleOpenPrint(null, 'cod_sheet')}
              className="btn-secondary text-xs"
            >
              <IndianRupee className="w-3.5 h-3.5" />
              <span>Print COD Cash Sheet</span>
            </button>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-subtle space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search Order ID, customer name, phone, locality..."
              className="input-text pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="input-text text-xs py-1.5"
            >
              <option value="ALL">All Payments</option>
              <option value="COD">Cash On Delivery (COD)</option>
              <option value="UPI">UPI</option>
              <option value="Card">Credit/Debit Card</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="input-text text-xs py-1.5"
            >
              <option value="ALL">All Priorities</option>
              <option value="Normal">Normal</option>
              <option value="Express">Express</option>
            </select>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 overflow-x-auto text-xs">
          {[
            { id: 'ALL', label: 'All Orders' },
            { id: 'confirmed', label: 'Confirmed' },
            { id: 'picking', label: 'Picking' },
            { id: 'packed', label: 'Packed' },
            { id: 'out_for_delivery', label: 'Out for Delivery' },
            { id: 'delivered', label: 'Delivered' },
            { id: 'cancelled', label: 'Cancelled' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                statusFilter === tab.id
                  ? 'bg-emerald-800 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <DataTable
        columns={columns}
        data={filteredOrders}
        loading={loading}
        emptyTitle="No orders matching your criteria"
        selectable
        selectedRows={selectedOrderIds}
        onSelectRow={(id, checked) => {
          setSelectedOrderIds((prev) =>
            checked ? [...prev, id] : prev.filter((item) => item !== id)
          );
        }}
        onSelectAll={(checked) => {
          setSelectedOrderIds(checked ? filteredOrders.map((o) => o.id) : []);
        }}
        bulkActions={
          <button
            onClick={() => {
              const selectedObjects = orders.filter((o) => selectedOrderIds.includes(o.id));
              setPrintTargetOrder(selectedObjects[0]);
              setPrintDocType('invoice');
              setPrintModalOpen(true);
            }}
            className="btn-primary text-xs py-1"
          >
            Batch Print Invoices ({selectedOrderIds.length})
          </button>
        }
      />

      {/* Order Detail Modal */}
      <OrderDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        order={selectedOrder}
        onOrderUpdated={(updated) => {
          setSelectedOrder(updated);
          loadData();
        }}
        onOpenPrint={(ord) => handleOpenPrint(ord, 'invoice')}
      />

      {/* Packing Station Workstation Modal */}
      <PackingWorkstationModal
        isOpen={packingModalOpen}
        onClose={() => setPackingModalOpen(false)}
        order={packingTargetOrder}
        onOrderUpdated={(updated) => {
          setPackingTargetOrder(updated);
          loadData();
        }}
        onOpenPrint={(ord) => handleOpenPrint(ord, 'parcel_label')}
      />

      {/* Printable Documents Modal */}
      <PrintableDocumentsModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        order={printTargetOrder}
        orders={orders}
        initialDocType={printDocType}
      />
    </div>
  );
};
