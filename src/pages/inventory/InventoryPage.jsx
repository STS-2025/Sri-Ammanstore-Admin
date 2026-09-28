import React, { useState, useEffect } from 'react';
import {
  Boxes,
  TrendingUp,
  AlertTriangle,
  AlertOctagon,
  Clock,
  Plus,
  Minus,
  RefreshCw,
  Search,
  Filter,
  History,
  Barcode,
  Calendar,
  IndianRupee,
  PackageCheck,
  Download,
  FileSpreadsheet,
  Truck,
  PackageX
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { StatCard } from '../../components/common/StatCard';
import { DataTable } from '../../components/table/DataTable';
import { StockBadge } from '../../components/common/StockBadge';
import { StatusBadge } from '../../components/common/StatusBadge';
import { FormModal } from '../../components/common/FormModal';
import { PermissionGuard } from '../../components/auth/PermissionGuard';
import { PERMISSIONS } from '../../utils/permissions';
import {
  getInventoryMetrics,
  getStockMovements,
  recordStockMovement
} from '../../firebase/inventoryService';
import { exportDataToCsv } from '../../firebase/reportService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { useNotification } from '../../context/NotificationContext';
import { usePermissions } from '../../hooks/usePermissions';

export const InventoryPage = () => {
  const [activeTab, setActiveTab] = useState('stock'); // 'stock' | 'batches' | 'movements' | 'suppliers'
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'low_stock' | 'out_of_stock' | 'expiring' | 'expired'
  const [supplierFilter, setSupplierFilter] = useState('ALL');
  const [metrics, setMetrics] = useState(null);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Stock Adjustment Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [targetVariant, setTargetVariant] = useState(null);
  const [adjustmentType, setAdjustmentType] = useState('Manual Adjustment');
  const [adjustmentQty, setAdjustmentQty] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [supplierInput, setSupplierInput] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);

  const notify = useNotification();
  const { currentUser } = usePermissions();

  const loadData = async () => {
    setLoading(true);
    try {
      const metricData = await getInventoryMetrics();
      const movData = await getStockMovements();
      setMetrics(metricData);
      setMovements(movData);
    } catch (err) {
      notify.error('Failed to load inventory', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdjust = (variantItem) => {
    setTargetVariant(variantItem);
    setAdjustmentType('Purchase');
    setAdjustmentQty('');
    setAdjustmentReason('');
    setSupplierInput(variantItem.supplierName || 'Sri Amman Central Wholesale Distributors');
    setAdjustModalOpen(true);
  };

  const handleConfirmAdjustment = async (e) => {
    if (e) e.preventDefault();
    const qtyChange = Number(adjustmentQty);
    if (!qtyChange || isNaN(qtyChange)) {
      notify.error('Invalid Quantity', 'Please enter a valid stock delta number.');
      return;
    }
    if (!adjustmentReason.trim()) {
      notify.error('Missing Reason', 'Mandatory operational audit reason is required.');
      return;
    }

    setIsAdjusting(true);
    try {
      await recordStockMovement({
        productId: targetVariant.productId,
        productName: targetVariant.productName,
        variantId: targetVariant.variantId,
        variantName: targetVariant.variantName,
        sku: targetVariant.sku,
        previousQuantity: targetVariant.stock,
        changedQuantity: qtyChange,
        movementType: adjustmentType,
        supplierName: supplierInput.trim() || targetVariant.supplierName,
        reason: adjustmentReason.trim(),
        user: currentUser
      });

      notify.success(
        'Stock Adjusted Successfully',
        `${targetVariant.productName} (${targetVariant.variantName}) stock recorded (${qtyChange > 0 ? '+' : ''}${qtyChange}).`
      );
      setAdjustModalOpen(false);
      await loadData();
    } catch (err) {
      notify.error('Adjustment Failed', err.message);
    } finally {
      setIsAdjusting(false);
    }
  };

  // Export Inventory Excel / CSV Report
  const handleExportExcel = () => {
    if (activeTab === 'movements') {
      const headers = [
        { label: 'Date and Time', key: 'createdAtFormatted' },
        { label: 'Product Name', key: 'productName' },
        { label: 'Variant Name', key: 'variantName' },
        { label: 'SKU Code', key: 'sku' },
        { label: 'Adjustment Type', key: 'movementType' },
        { label: 'Previous Quantity', key: 'previousQuantity' },
        { label: 'Stock Delta (+/-)', key: 'changedQuantity' },
        { label: 'New Quantity', key: 'newQuantity' },
        { label: 'Audit Reason', key: 'reason' },
        { label: 'Staff Member Name', key: 'userName' },
        { label: 'Supplier Record', key: 'supplierName' }
      ];
      const rows = filteredMovements.map((m) => ({
        ...m,
        createdAtFormatted: formatDateTime(m.createdAt)
      }));
      exportDataToCsv('sri_amman_stock_movement_audit_ledger', headers, rows);
      notify.success('Audit Report Downloaded', 'Complete stock movement audit log exported successfully.');
      return;
    }

    if (!metrics?.flattenedVariants) return;
    const headers = [
      { label: 'Product Name', key: 'productName' },
      { label: 'Tamil Name', key: 'tamilName' },
      { label: 'Variant', key: 'variantName' },
      { label: 'SKU Code', key: 'sku' },
      { label: 'Barcode', key: 'barcode' },
      { label: 'Category', key: 'categoryName' },
      { label: 'Supplier Name', key: 'supplierName' },
      { label: 'Stock On Hand', key: 'stock' },
      { label: 'Safety Stock Limit', key: 'safetyStock' },
      { label: 'Cost Price (INR)', key: 'purchasePrice' },
      { label: 'Total Valuation (INR)', key: 'totalValuation' },
      { label: 'Batch Number', key: 'batchNumber' },
      { label: 'Expiry Date', key: 'expiryDate' },
      { label: 'Expiry Condition', key: 'expiryCondition' }
    ];
    const rows = metrics.flattenedVariants.map((v) => ({
      ...v,
      totalValuation: (v.stock * v.purchasePrice).toFixed(2)
    }));
    exportDataToCsv('sri_amman_inventory_stock_report', headers, rows);
    notify.success('Excel Report Downloaded', 'Complete inventory stock report exported successfully.');
  };

  // Extract unique supplier list
  const supplierList = Array.from(
    new Set((metrics?.flattenedVariants || []).map((v) => v.supplierName).filter(Boolean))
  );

  // Filtered variants based on Search, Alert Filter, and Supplier Filter
  const filteredVariants = (metrics?.flattenedVariants || []).filter((v) => {
    // Search Filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const match =
        v.productName?.toLowerCase().includes(q) ||
        v.tamilName?.toLowerCase().includes(q) ||
        v.sku?.toLowerCase().includes(q) ||
        v.barcode?.includes(q) ||
        v.batchNumber?.toLowerCase().includes(q) ||
        v.supplierName?.toLowerCase().includes(q);
      if (!match) return false;
    }

    // Supplier Filter
    if (supplierFilter !== 'ALL' && v.supplierName !== supplierFilter) {
      return false;
    }

    // Status / Alert Filter
    if (statusFilter === 'low_stock' && !(v.stock > 0 && v.stock <= v.safetyStock)) return false;
    if (statusFilter === 'out_of_stock' && v.stock > 0) return false;
    if (statusFilter === 'expiring' && v.expiryCondition !== 'expiring_soon') return false;
    if (statusFilter === 'expired' && v.expiryCondition !== 'expired') return false;

    return true;
  });

  // Filtered movements for Ledger
  const filteredMovements = movements.filter((m) => {
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const match =
        m.productName?.toLowerCase().includes(q) ||
        m.sku?.toLowerCase().includes(q) ||
        m.movementType?.toLowerCase().includes(q) ||
        m.supplierName?.toLowerCase().includes(q) ||
        m.reason?.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (supplierFilter !== 'ALL' && m.supplierName !== supplierFilter) {
      return false;
    }
    return true;
  });

  // Columns for Stock On Hand Table
  const stockColumns = [
    {
      key: 'productName',
      header: 'Grocery Item & Variant',
      sortable: true,
      render: (row) => (
        <div>
          <div className="font-bold text-slate-900">{row.productName}</div>
          <div className="text-[11px] text-slate-500 font-sans">{row.tamilName}</div>
          <div className="text-[11px] font-mono text-emerald-800 font-semibold mt-0.5">
            {row.variantName}
          </div>
        </div>
      )
    },
    {
      key: 'sku',
      header: 'SKU & Barcode',
      render: (row) => (
        <div className="font-mono text-xs text-slate-600">
          <div>{row.sku}</div>
          <div className="text-[10px] text-slate-400 flex items-center gap-1">
            <Barcode className="w-3 h-3" />
            {row.barcode}
          </div>
        </div>
      )
    },
    {
      key: 'supplierName',
      header: 'Supplier / Source',
      render: (row) => (
        <div className="text-xs text-slate-700 font-medium">
          <div className="line-clamp-1">{row.supplierName}</div>
          <span className="text-[10px] text-slate-400 font-sans block">{row.categoryName}</span>
        </div>
      )
    },
    {
      key: 'stock',
      header: 'Available Stock',
      align: 'center',
      sortable: true,
      render: (row) => (
        <StockBadge quantity={row.stock} safetyStock={row.safetyStock} showCount={true} />
      )
    },
    {
      key: 'purchasePrice',
      header: 'Valuation (₹)',
      align: 'right',
      sortable: true,
      render: (row) => (
        <div className="text-right font-sans">
          <div className="font-bold text-slate-900">
            {formatCurrency(row.stock * row.purchasePrice)}
          </div>
          <span className="text-[10px] text-slate-400">@ {formatCurrency(row.purchasePrice)}/unit</span>
        </div>
      )
    },
    {
      key: 'batch',
      header: 'Batch & Expiry Alert',
      render: (row) => (
        <div className="text-xs font-mono">
          <span className="text-slate-800 font-semibold">{row.batchNumber}</span>
          <div className="text-[10px] flex items-center gap-1 mt-0.5">
            <Calendar className="w-3 h-3 text-slate-400" />
            <span
              className={
                row.expiryCondition === 'expired'
                  ? 'text-rose-600 font-bold'
                  : row.expiryCondition === 'expiring_soon'
                  ? 'text-amber-600 font-bold'
                  : 'text-slate-500'
              }
            >
              Exp: {row.expiryDate}
            </span>
          </div>
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <PermissionGuard permission={PERMISSIONS.INVENTORY_ADJUST}>
          <button
            onClick={() => handleOpenAdjust(row)}
            className="btn-secondary text-xs py-1"
          >
            Adjust / Intake
          </button>
        </PermissionGuard>
      )
    }
  ];

  // Columns for Movement Ledger
  const movementColumns = [
    {
      key: 'createdAt',
      header: 'Timestamp',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-slate-500 text-xs">
          {formatDateTime(row.createdAt)}
        </span>
      )
    },
    {
      key: 'productName',
      header: 'Item & SKU',
      render: (row) => (
        <div>
          <div className="font-bold text-slate-800">{row.productName}</div>
          <span className="text-[11px] font-mono text-slate-400">{row.variantName} ({row.sku})</span>
        </div>
      )
    },
    {
      key: 'movementType',
      header: 'Adjustment Type',
      render: (row) => {
        const isPositive = row.changedQuantity > 0;
        return (
          <span
            className={`font-semibold text-xs px-2 py-0.5 rounded border inline-flex items-center gap-1 ${
              row.movementType === 'Damage'
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : row.movementType === 'Expired'
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : row.movementType === 'Missing'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : isPositive
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            {row.movementType}
          </span>
        );
      }
    },
    {
      key: 'supplierName',
      header: 'Supplier Record',
      render: (row) => (
        <span className="text-xs text-slate-700 font-medium line-clamp-1">
          {row.supplierName || 'Wholesale Supplier'}
        </span>
      )
    },
    {
      key: 'previousQuantity',
      header: 'Previous SOH',
      align: 'center',
      render: (row) => <span className="font-mono text-xs text-slate-500">{row.previousQuantity}</span>
    },
    {
      key: 'change',
      header: 'Stock Delta',
      align: 'center',
      render: (row) => (
        <span
          className={`font-mono font-bold text-xs ${
            row.changedQuantity > 0 ? 'text-emerald-700' : 'text-rose-600'
          }`}
        >
          {row.changedQuantity > 0 ? `+${row.changedQuantity}` : row.changedQuantity}
        </span>
      )
    },
    {
      key: 'newQuantity',
      header: 'New SOH',
      align: 'center',
      render: (row) => <span className="font-mono text-xs font-bold text-slate-900">{row.newQuantity}</span>
    },
    {
      key: 'reason',
      header: 'Audit Justification Reason',
      render: (row) => (
        <span className="text-slate-600 line-clamp-1 italic max-w-xs text-xs">
          "{row.reason}"
        </span>
      )
    },
    {
      key: 'userName',
      header: 'Staff Actor',
      render: (row) => <span className="text-slate-700 text-xs">{row.userName}</span>
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory & Warehouse Management"
        subtitle="Real-time stock control, purchase stock entry, damaged/expired write-offs, supplier records & Excel exports."
        actions={
          <div className="flex items-center gap-2">
            <button onClick={handleExportExcel} className="btn-primary text-xs flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800">
              <Download className="w-3.5 h-3.5" />
              <span>Download Excel Report</span>
            </button>
            <button onClick={loadData} className="btn-secondary text-xs">
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Stock</span>
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Current Stock On Hand"
          value={`${metrics?.totalStockUnits || 0} Units`}
          subtext="Total available warehouse inventory"
          icon={Boxes}
          variant="primary"
        />

        <StatCard
          title="Total Inventory Valuation"
          value={formatCurrency(metrics?.totalStockValue || 0)}
          subtext="Calculated at procurement cost"
          icon={IndianRupee}
          variant="default"
        />

        <StatCard
          title="Low & Out of Stock Alerts"
          value={`${metrics?.lowStockCount || 0} Low Stock`}
          change={`${metrics?.outOfStockCount || 0} Out of stock`}
          changeType="negative"
          icon={AlertTriangle}
          variant="warning"
        />

        <StatCard
          title="Batch Expiry Alerts"
          value={`${metrics?.expiringSoonCount || 0} Expiring Soon`}
          subtext={`${metrics?.expiredCount || 0} expired write-offs`}
          icon={Clock}
          variant="danger"
        />
      </div>

      {/* Main Workstation Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle p-4 space-y-4">
        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {[
              { id: 'stock', label: '1. Live Stock On Hand' },
              { id: 'batches', label: '2. Grocery Batches & Expiry Alerts' },
              { id: 'movements', label: '3. Stock Movement Audit Ledger' },
              { id: 'suppliers', label: '4. Supplier-Wise Purchase Records' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search item, SKU, barcode, supplier..."
                className="input-text pl-9 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="font-bold text-slate-500 mr-1 flex items-center gap-1 text-[11px] uppercase tracking-wider">
              <Filter className="w-3 h-3" /> Filter Alerts:
            </span>
            {[
              { id: 'ALL', label: 'All Items' },
              { id: 'low_stock', label: `Low Stock (${metrics?.lowStockCount || 0})` },
              { id: 'out_of_stock', label: `Out of Stock (${metrics?.outOfStockCount || 0})` },
              { id: 'expiring', label: `Expiring Soon (${metrics?.expiringSoonCount || 0})` },
              { id: 'expired', label: `Expired (${metrics?.expiredCount || 0})` }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                  statusFilter === f.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Supplier Selector */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-semibold text-[11px]">Supplier:</span>
            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="input-text text-xs py-1 px-2 border-slate-300 rounded-md bg-white font-medium max-w-[200px]"
            >
              <option value="ALL">All Suppliers</option>
              {supplierList.map((sup) => (
                <option key={sup} value={sup}>
                  {sup}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tab 1: Live Stock On Hand */}
        {activeTab === 'stock' && (
          <DataTable
            columns={stockColumns}
            data={filteredVariants}
            loading={loading}
            emptyTitle="No stock records found matching filters"
          />
        )}

        {/* Tab 2: Grocery Batches & Expiry Alerts */}
        {activeTab === 'batches' && (
          <div className="space-y-3">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>FEFO Expiry Alert Engine:</strong> Batches with less than 30 days of shelf life are highlighted with active warnings for priority clearance.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVariants.map((item) => (
                <div
                  key={`${item.variantId}-batch`}
                  className={`p-4 rounded-xl border transition-all ${
                    item.expiryCondition === 'expiring_soon'
                      ? 'bg-amber-50/60 border-amber-300'
                      : item.expiryCondition === 'expired'
                      ? 'bg-rose-50/60 border-rose-300'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="font-bold text-xs text-slate-900 block line-clamp-1">
                        {item.productName}
                      </span>
                      <span className="text-[11px] font-mono text-emerald-800 block">
                        {item.variantName}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                        item.expiryCondition === 'expiring_soon'
                          ? 'bg-amber-200 text-amber-900'
                          : item.expiryCondition === 'expired'
                          ? 'bg-rose-200 text-rose-900'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {item.expiryCondition === 'expiring_soon'
                        ? 'Expiring Soon'
                        : item.expiryCondition === 'expired'
                        ? 'Expired'
                        : 'Fresh Batch'}
                    </span>
                  </div>

                  <div className="text-xs space-y-1 font-mono text-slate-600 border-t border-slate-200/60 pt-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Batch Code:</span>
                      <strong className="text-slate-900">{item.batchNumber}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Supplier:</span>
                      <span className="font-sans text-[11px] text-slate-800 font-medium truncate max-w-[140px]">{item.supplierName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Batch Stock:</span>
                      <span className="font-bold text-slate-900">{item.stock} units</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Expiry Date:</span>
                      <span className="font-semibold text-rose-700">{item.expiryDate}</span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200/60 flex justify-end">
                    <button
                      onClick={() => handleOpenAdjust(item)}
                      className="text-[11px] font-bold text-emerald-800 hover:text-emerald-950 underline"
                    >
                      Record Expiry / Adjustment
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Stock Movement Audit Ledger */}
        {activeTab === 'movements' && (
          <DataTable
            columns={movementColumns}
            data={filteredMovements}
            loading={loading}
            emptyTitle="No stock movements recorded matching search"
          />
        )}

        {/* Tab 4: Supplier-Wise Purchase Records */}
        {activeTab === 'suppliers' && (
          <div className="space-y-4">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Supplier-wise stock purchase records & intake history overview.</span>
              </div>
              <span className="font-mono font-bold">{supplierList.length} Registered Suppliers</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {supplierList.map((supplier) => {
                const supVariants = (metrics?.flattenedVariants || []).filter((v) => v.supplierName === supplier);
                const supTotalUnits = supVariants.reduce((sum, v) => sum + v.stock, 0);
                const supTotalValuation = supVariants.reduce((sum, v) => sum + v.stock * v.purchasePrice, 0);
                const supIntakes = movements.filter((m) => m.supplierName === supplier);

                return (
                  <div key={supplier} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <div className="flex items-start justify-between border-b border-slate-200 pb-2.5">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{supplier}</h4>
                        <span className="text-xs text-slate-500 font-sans">{supVariants.length} Active Product SKUs</span>
                      </div>
                      <span className="text-xs font-bold font-mono px-2 py-1 bg-emerald-100 text-emerald-900 rounded-lg">
                        Valuation: {formatCurrency(supTotalValuation)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono bg-white p-2.5 rounded-lg border border-slate-100">
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase block">Total Stock Units</span>
                        <strong className="text-slate-900">{supTotalUnits} units</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase block">Purchase Movements</span>
                        <strong className="text-slate-900">{supIntakes.length} Intake Records</strong>
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold text-slate-600 block mb-1">Supplied Products:</span>
                      <div className="flex flex-wrap gap-1">
                        {supVariants.slice(0, 4).map((sv) => (
                          <span key={sv.variantId} className="text-[10px] bg-slate-200/70 text-slate-700 px-2 py-0.5 rounded font-mono">
                            {sv.productName} ({sv.stock} SOH)
                          </span>
                        ))}
                        {supVariants.length > 4 && (
                          <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                            +{supVariants.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Stock Adjustment / Intake / Damage Modal */}
      <FormModal
        isOpen={adjustModalOpen}
        onClose={() => setAdjustModalOpen(false)}
        title="Record Stock Movement / Adjustment"
        subtitle={`Intake, manual count, damage, expired, or missing stock for ${targetVariant?.productName} (${targetVariant?.variantName})`}
        maxWidth="max-w-md"
        onSubmit={handleConfirmAdjustment}
        submitLabel="Commit Stock Movement"
        isSubmitting={isAdjusting}
      >
        <form onSubmit={handleConfirmAdjustment} className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Current Stock On Hand:</span>
              <strong className="text-slate-900 font-mono text-sm">{targetVariant?.stock} units</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">SKU Code:</span>
              <span className="font-mono text-slate-700">{targetVariant?.sku}</span>
            </div>
          </div>

          <div>
            <label className="input-label">Adjustment / Operational Reason Type <span className="text-rose-500">*</span></label>
            <select
              value={adjustmentType}
              onChange={(e) => setAdjustmentType(e.target.value)}
              className="input-text text-xs font-semibold"
            >
              <option value="Purchase">Purchase (Supplier Stock Intake)</option>
              <option value="Manual Adjustment">Manual Adjustment (Shelf Count Audit)</option>
              <option value="Damage">Damage (Spoiled or Torn Packet Write-off)</option>
              <option value="Expired">Expired (Shelf Life Expiry Write-off)</option>
              <option value="Missing">Missing / Shrinkage (Unaccounted Discrepancy)</option>
              <option value="Return">Customer Return Intake</option>
              <option value="Correction">Correction (Barcode / System Mismatch)</option>
            </select>
          </div>

          <div>
            <label className="input-label">Supplier / Source Agency</label>
            <input
              type="text"
              value={supplierInput}
              onChange={(e) => setSupplierInput(e.target.value)}
              placeholder="e.g. Virudhunagar Paddy & Rice Traders"
              className="input-text text-xs"
            />
          </div>

          <div>
            <label className="input-label">
              Quantity Delta (+ to Add Intake, - to Deduct Loss) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              required
              value={adjustmentQty}
              onChange={(e) => setAdjustmentQty(e.target.value)}
              placeholder="e.g. +50 for purchase intake, -5 for damage/missing"
              className="input-text text-xs font-mono font-bold"
            />
          </div>

          <div>
            <label className="input-label">
              Mandatory Operational Audit Reason <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              required
              value={adjustmentReason}
              onChange={(e) => setAdjustmentReason(e.target.value)}
              placeholder="Provide reason for audit log (e.g. Received fresh shipment batch #B-104 from supplier)..."
              className="input-text text-xs"
            />
          </div>
        </form>
      </FormModal>
    </div>
  );
};
