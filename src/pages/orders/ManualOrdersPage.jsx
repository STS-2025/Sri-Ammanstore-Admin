import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Eye,
  CircleDollarSign,
  CheckCircle2,
  Pencil,
  Printer,
  RefreshCw,
  Trash2,
  CalendarDays,
  MapPin
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/table/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { OrderDetailModal } from '../../components/orders/OrderDetailModal';
import { PosReceiptModal } from '../../components/pos/PosReceiptModal';
import { PermissionGuard } from '../../components/auth/PermissionGuard';
import { PERMISSIONS } from '../../utils/permissions';
import { getAllOrders, deleteManualOrder, updateManualOrderPaymentStatus } from '../../firebase/orderService';
import { recordCustomerLedgerTransaction } from '../../firebase/customerService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { useNotification } from '../../context/NotificationContext';
import { usePermissions } from '../../hooks/usePermissions';
import { useNavigate } from 'react-router-dom';

export const ManualOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dateFilterEnabled, setDateFilterEnabled] = useState(false);
  const [areaFilter, setAreaFilter] = useState('ALL');
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [updatingPaymentOrderIds, setUpdatingPaymentOrderIds] = useState(new Set());

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printDocType, setPrintDocType] = useState('invoice');
  const [printTargetOrder, setPrintTargetOrder] = useState(null);

  const notify = useNotification();
  const { currentUser, can } = usePermissions();
  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getAllOrders({ manualOnly: true });
      setOrders(data.filter((order) => order.orderSource === 'manual'));
    } catch (err) {
      notify.error('Failed to load manual orders', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getOrderDateKey = (value) => {
    if (!value) return '';
    const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 10);
  };

  const formatLocalDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getOrderArea = (order = {}) => (
    order.area ||
    order.deliveryAddress?.area ||
    order.deliveryAddress?.locality ||
    order.address?.area ||
    order.customer?.address?.area ||
    'Area Not Set'
  );

  const getRevenueRange = (dateKey) => {
    const anchor = new Date(`${dateKey}T00:00:00`);
    const day = anchor.getDay();
    const weekStart = new Date(anchor);
    weekStart.setDate(anchor.getDate() - (day === 0 ? 6 : day - 1));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const monthEnd = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
    return {
      day: dateKey,
      weekStart: formatLocalDateKey(weekStart),
      weekEnd: formatLocalDateKey(weekEnd),
      monthStart: `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, '0')}-01`,
      monthEnd: `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, '0')}-${String(monthEnd.getDate()).padStart(2, '0')}`
    };
  };

  const areas = useMemo(() => (
    [...new Set(orders.map(getOrderArea))].sort((a, b) => a.localeCompare(b))
  ), [orders]);

  const revenueOrders = useMemo(() => (
    orders.filter((order) => areaFilter === 'ALL' || getOrderArea(order) === areaFilter)
  ), [orders, areaFilter]);

  const revenueRange = getRevenueRange(selectedDate);
  const calculateRevenue = (start, end) => revenueOrders.reduce((total, order) => {
    const orderDate = getOrderDateKey(order.createdAt || order.updatedAt);
    if (orderDate < start || orderDate > end) return total;
    return total + Number(order.totalAmount ?? order.total ?? 0);
  }, 0);

  const todayRevenue = calculateRevenue(revenueRange.day, revenueRange.day);
  const weekRevenue = calculateRevenue(revenueRange.weekStart, revenueRange.weekEnd);
  const monthRevenue = calculateRevenue(revenueRange.monthStart, revenueRange.monthEnd);

  const filteredOrders = orders.filter((ord) => {
    const paymentMethod = String(ord.paymentMethod || '').toUpperCase();
    const paymentStatus = String(ord.paymentStatus || '').toLowerCase();
    const orderDate = getOrderDateKey(ord.createdAt || ord.updatedAt);
    const orderArea = getOrderArea(ord);
    if (dateFilterEnabled && orderDate !== selectedDate) return false;
    if (areaFilter !== 'ALL' && orderArea !== areaFilter) return false;
    if (paymentFilter === 'CASH' && !['CASH', 'COD'].includes(paymentMethod)) {
      return false;
    }
    if (
      paymentFilter !== 'ALL' &&
      paymentFilter !== 'CASH' &&
      paymentMethod !== paymentFilter
    ) {
      return false;
    }

    if (paymentStatusFilter === 'PAID' && paymentStatus !== 'paid') {
      return false;
    }
    if (paymentStatusFilter === 'UNPAID' && paymentStatus === 'paid') {
      return false;
    }

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

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to delete this manual order record?')) return;

    try {
      await deleteManualOrder(orderId, currentUser);
      notify.success('Manual Order Deleted', 'Order record has been removed.');
      loadData();
    } catch (err) {
      notify.error('Failed to delete manual order', err.message);
    }
  };

  const normalizeReceiptOrderForModal = (ord = {}) => {
    const items = Array.isArray(ord.items) ? ord.items.map((item) => ({
      ...item,
      productName: item.productName || item.name || 'Grocery Item',
      variantName: item.variantName || item.packSize || '',
      quantity: Number(item.quantity ?? item.qty ?? 1),
      unitPrice: Number(item.unitPrice ?? item.price ?? 0),
      totalPrice: Number(item.totalPrice ?? ((Number(item.unitPrice ?? item.price ?? 0) * Number(item.quantity ?? item.qty ?? 1))))
    })) : [];

    const totalAmount = Number(ord.totalAmount ?? ord.total ?? 0);
    const subtotal = Number(ord.subtotal ?? totalAmount);
    const discount = Number(ord.discount ?? 0);
    const tax = Number(ord.tax ?? 0);
    const paymentMethod = String(ord.paymentMethod || 'CASH').toUpperCase();
    const paymentStatus = String(ord.paymentStatus || '').toLowerCase();
    const amountPaid = Number(ord.amountPaid ?? (paymentStatus === 'paid' ? totalAmount : (paymentStatus === 'partial' ? Math.max(0, totalAmount - Number(ord.balanceDue ?? 0)) : 0)));
    const balanceDue = Number(ord.balanceDue ?? (paymentMethod === 'CREDIT' ? totalAmount : 0));

    return {
      ...ord,
      customerName: ord.customerName || 'Walk-in Customer',
      customerId: ord.customerId || ord.customer?.customerId || '',
      customerPhone: ord.customerPhone || '',
      items,
      subtotal,
      discount,
      tax,
      totalAmount,
      total: totalAmount,
      paymentMethod,
      paymentStatus,
      amountPaid,
      balanceDue
    };
  };

  const handleOpenPrint = (ord, type = 'invoice') => {
    setPrintTargetOrder(normalizeReceiptOrderForModal(ord));
    setPrintDocType(type);
    setPrintModalOpen(true);
  };

  const handleTogglePaymentStatus = async (order) => {
    const orderKey = order.id || order.orderNumber;
    if (updatingPaymentOrderIds.has(orderKey)) return;

    const wasPaid = String(order.paymentStatus || '').toLowerCase() === 'paid';
    const nextStatus = wasPaid ? 'unpaid' : 'paid';
    const customerId = order.customerId || order.customer?.customerId || order.customer?.id;
    const paymentMethod = String(order.paymentMethod || '').toUpperCase();
    const totalAmount = Number(order.totalAmount ?? order.total ?? 0);
    const previousBalanceDue = Number(order.balanceDue ?? (paymentMethod === 'CREDIT' ? totalAmount : 0));
    const isCreditSale = paymentMethod === 'CREDIT' ||
      (paymentMethod === 'MIXED' && previousBalanceDue > 0);
    const ledgerAdjustment = isCreditSale
      ? (wasPaid ? totalAmount : previousBalanceDue || totalAmount)
      : 0;

    let ledgerUpdated = false;
    setUpdatingPaymentOrderIds((previous) => new Set(previous).add(orderKey));
    try {
      if (customerId && ledgerAdjustment > 0) {
        const result = await recordCustomerLedgerTransaction({
          customerId,
          type: wasPaid ? 'CREDIT_SALE' : 'PAYMENT',
          debit: wasPaid ? ledgerAdjustment : 0,
          credit: wasPaid ? 0 : ledgerAdjustment,
          referenceId: order.orderNumber || order.id,
          paymentMethod,
          reason: wasPaid
            ? `Manual order marked unpaid #${order.orderNumber}`
            : `Manual order payment received #${order.orderNumber}`,
          user: currentUser
        });
        if (!result?.customer) {
          throw new Error('Customer ledger was not updated.');
        }
        ledgerUpdated = true;
      }

      const updated = await updateManualOrderPaymentStatus(order.id || order.orderNumber, nextStatus, currentUser);
      setOrders((previous) => previous.map((item) => item.id === updated.id ? updated : item));
      if (selectedOrder?.id === updated.id) setSelectedOrder(updated);
      notify.success(
        'Payment Status Updated',
        `${order.orderNumber} marked ${nextStatus === 'paid' ? 'Paid' : 'Un Paid'}.`
      );
    } catch (err) {
      let errorMessage = err.message;
      if (ledgerUpdated) {
        try {
          await recordCustomerLedgerTransaction({
            customerId,
            type: wasPaid ? 'PAYMENT' : 'CREDIT_SALE',
            debit: wasPaid ? 0 : ledgerAdjustment,
            credit: wasPaid ? ledgerAdjustment : 0,
            referenceId: order.orderNumber || order.id,
            paymentMethod,
            reason: `Reverse failed manual order payment update #${order.orderNumber}`,
            user: currentUser
          });
        } catch (rollbackError) {
          errorMessage = `${errorMessage} Customer ledger rollback also failed: ${rollbackError.message}`;
        }
      }
      notify.error('Payment Status Update Failed', errorMessage);
    } finally {
      setUpdatingPaymentOrderIds((previous) => {
        const next = new Set(previous);
        next.delete(orderKey);
        return next;
      });
    }
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
        <span className="font-mono text-xs text-slate-500">{formatDateTime(row.createdAt)}</span>
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
          <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 line-clamp-1"><MapPin className="w-3 h-3" />{getOrderArea(row)}</span>
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
          <div className="font-sans text-xs font-bold text-slate-900">{formatCurrency(row.totalAmount)}</div>
          <span className="text-[10px] uppercase font-mono font-semibold text-slate-400">
            {row.paymentMethod} * {row.paymentStatus}
          </span>
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (row) => (
        <StatusBadge
          status={String(row.paymentStatus || '').toLowerCase() === 'paid' ? 'paid' : 'draft'}
          label={String(row.paymentStatus || '').toLowerCase() === 'paid' ? 'Paid' : 'Un Paid'}
        />
      )
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

          <PermissionGuard anyPermissions={[PERMISSIONS.ORDERS_EDIT, PERMISSIONS.MANUAL_ACCESS]}>
            <button
              disabled={updatingPaymentOrderIds.has(row.id || row.orderNumber)}
              onClick={() => handleTogglePaymentStatus(row)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-colors disabled:opacity-50 disabled:cursor-wait ${
                String(row.paymentStatus || '').toLowerCase() === 'paid'
                  ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50'
                  : 'text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50'
              }`}
              title={String(row.paymentStatus || '').toLowerCase() === 'paid' ? 'Mark as Un Paid' : 'Mark as Paid'}
              aria-label={String(row.paymentStatus || '').toLowerCase() === 'paid' ? 'Mark as Un Paid' : 'Mark as Paid'}
            >
              {String(row.paymentStatus || '').toLowerCase() === 'paid'
                ? <CircleDollarSign className="w-3.5 h-3.5" />
                : <CheckCircle2 className="w-3.5 h-3.5" />}
            </button>
          </PermissionGuard>
          {/*{String(row.paymentStatus || '').toLowerCase() === 'paid' ? 'Un Paid' : 'Paid'}*/}

          <PermissionGuard anyPermissions={[PERMISSIONS.ORDERS_EDIT, PERMISSIONS.MANUAL_ACCESS]}>
            <button
              onClick={() => navigate('/orders/create-manual-order', { state: { mode: 'edit', order: row } })}
              className="p-1.5 text-slate-600 hover:text-violet-700 hover:bg-violet-50 rounded-lg transition-colors"
              title="Edit Manual Order"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </PermissionGuard>

          <PermissionGuard anyPermissions={[PERMISSIONS.ORDERS_PRINT, PERMISSIONS.MANUAL_ACCESS]}>
            <button
              onClick={() => handleOpenPrint(row, 'invoice')}
              className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
              title="Print Thermal POS Receipt"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
          </PermissionGuard>

          <button
            onClick={() => handleDeleteOrder(row.id)}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            title="Delete Order"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manual Orders"
        subtitle="Counter-created retail sales marked as manual source only."
        actions={
          <button
            onClick={loadData}
            className="p-2 transition-colors border text-slate-400 hover:text-slate-700 rounded-xl hover:bg-white border-slate-200"
            title="Refresh Manual Orders"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {[
          ['Today Sales Revenue', todayRevenue, 'bg-emerald-50 border-emerald-200 text-emerald-800'],
          ['This Week Revenue', weekRevenue, 'bg-blue-50 border-blue-200 text-blue-800'],
          ['This Month Revenue', monthRevenue, 'bg-violet-50 border-violet-200 text-violet-800']
        ].map(([label, value, style]) => (
          <div key={label} className={`p-4 border rounded-xl ${style}`}>
            <div className="text-xs font-bold uppercase tracking-wide opacity-80">{label}</div>
            <div className="mt-1 text-2xl font-black font-mono">{formatCurrency(value)}</div>
            <div className="mt-1 text-[11px] opacity-70">
              Manual orders{areaFilter !== 'ALL' ? ` • ${areaFilter}` : ''}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 space-y-3 bg-white border rounded-xl border-slate-200 shadow-subtle">
        <div className="flex flex-col items-center justify-between gap-3 md:flex-row">
          <div className="relative w-full md:w-96">
            <Search className="absolute w-4 h-4 pointer-events-none text-slate-400 left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search order ID, customer name, or phone"
              className="text-xs input-text pl-9"
            />
          </div>

          <div className="flex items-center w-full gap-2 md:w-auto">
            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
              <CalendarDays className="w-4 h-4 text-emerald-600" />
              <span>Date</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => {
                  setSelectedDate(event.target.value);
                  setDateFilterEnabled(true);
                }}
                className="input-text text-xs py-1.5 w-36"
              />
            </label>
            <button
              type="button"
              onClick={() => setDateFilterEnabled((value) => !value)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg border ${dateFilterEnabled ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-white text-slate-700 border-slate-200'}`}
            >
              {dateFilterEnabled ? 'Date Filter On' : 'All Dates'}
            </button>
            <select value={areaFilter} onChange={(event) => setAreaFilter(event.target.value)} className="input-text text-xs py-1.5 w-40">
              <option value="ALL">All Areas</option>
              {areas.map((area) => <option key={area} value={area}>{area}</option>)}
            </select>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="input-text text-xs py-1.5"
            >
              <option value="ALL">All Payments</option>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Credit / Debit Card</option>
              <option value="CREDIT">Pay Later</option>
            </select>

            <select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              className="input-text text-xs py-1.5"
            >
              <option value="ALL">All Payment Status</option>
              <option value="PAID">Paid</option>
              <option value="UNPAID">Un Paid</option>
            </select>
          </div>
        </div>
        <div className="text-[11px] font-semibold text-slate-500">
          Revenue cards use the selected date as the anchor for day, Monday-Sunday week, and calendar month.
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredOrders}
        loading={loading}
        emptyTitle="No manual orders matching your criteria"
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
      />

      <OrderDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        order={selectedOrder}
        isManualOrder
        onToggleManualPayment={can(PERMISSIONS.ORDERS_EDIT) || can(PERMISSIONS.MANUAL_ACCESS) ? handleTogglePaymentStatus : undefined}
        isManualPaymentUpdating={selectedOrder && updatingPaymentOrderIds.has(selectedOrder.id || selectedOrder.orderNumber)}
        onOrderUpdated={(updated) => {
          setSelectedOrder(updated);
          loadData();
        }}
        onOpenPrint={(ord) => handleOpenPrint(ord, 'invoice')}
      />

      <PosReceiptModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        order={printTargetOrder}
      />
    </div>
  );
};
