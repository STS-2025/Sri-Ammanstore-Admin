import React, { useState, useEffect, useMemo } from 'react';
import { 
  History, Shield, Filter, Search, Eye, FileText, CheckCircle2, 
  Download, RefreshCw, Calendar, ArrowRight, UserCheck, AlertTriangle
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/table/DataTable';
import { FormModal } from '../../components/common/FormModal';
import { formatDateTime } from '../../utils/formatters';
import { exportDataToCsv } from '../../firebase/reportService';

const SAMPLE_ACTIVITY_AUDIT_LOGS = [
  {
    id: 'log-001',
    userEmail: 'owner@sriammanstore.com',
    userName: 'Karthikeyan (Owner)',
    userRole: 'super_admin',
    action: 'PRICE_UPDATE',
    module: 'Products & Pricing',
    targetId: 'prod-001-var-01',
    recordName: 'Aachi Turmeric Powder (மஞ்சள் தூள்) 500g',
    previousValue: '₹180',
    newValue: '₹195',
    reason: 'Supplier procurement price increase by 8%',
    createdAt: '2026-09-24T05:12:00Z',
    device: 'Chrome / Windows (Admin Office)'
  },
  {
    id: 'log-002',
    userEmail: 'manager@sriammanstore.com',
    userName: 'Senthil Nathan',
    userRole: 'store_manager',
    action: 'DELIVERY_BATCH_DISPATCH',
    module: 'Delivery Logistics',
    targetId: 'batch-cbe-01',
    recordName: 'BATCH-2026-0924-A (3 Orders)',
    previousValue: 'Draft',
    newValue: 'Dispatched to Saravanan M. (TN 38 BZ 4040)',
    reason: 'Morning delivery run to RS Puram and Tatabad zones',
    createdAt: '2026-09-24T05:30:00Z',
    device: 'Firefox / Android (Dispatch Hub Tab)'
  },
  {
    id: 'log-003',
    userEmail: 'accounts@sriammanstore.com',
    userName: 'Meenakshi Sundaram',
    userRole: 'accounts_staff',
    action: 'COD_RECONCILIATION',
    module: 'Accounts & Finance',
    targetId: 'cod-rec-091',
    recordName: 'Rider Praveen Kumar (TN 38 DE 1088)',
    previousValue: 'Pending Handover ₹3,200',
    newValue: 'Settled ₹3,200 Cash In Hand',
    reason: 'Verified cash notes against delivery run sheet',
    createdAt: '2026-09-24T06:10:00Z',
    device: 'Edge / Windows (Accounts Counter)'
  },
  {
    id: 'log-004',
    userEmail: 'marketing@sriammanstore.com',
    userName: 'Deepa Lakshmi',
    userRole: 'marketing_staff',
    action: 'PROMO_CODE_CREATE',
    module: 'Marketing & Promos',
    targetId: 'promo-01',
    recordName: 'Coupon AMMANFEST',
    previousValue: 'None',
    newValue: 'Flat ₹100 Off on orders above ₹999',
    reason: 'Festive season customer acquisition campaign',
    createdAt: '2026-09-23T14:20:00Z',
    device: 'Chrome / MacOS'
  },
  {
    id: 'log-005',
    userEmail: 'owner@sriammanstore.com',
    userName: 'Karthikeyan (Owner)',
    userRole: 'super_admin',
    action: 'STAFF_ROLE_CHANGE',
    module: 'Staff & Governance',
    targetId: 'staff-402',
    recordName: 'Muthu Kumar (Packing Team)',
    previousValue: 'Packing Staff',
    newValue: 'Inventory Staff',
    reason: 'Internal warehouse department promotion',
    createdAt: '2026-09-23T11:00:00Z',
    device: 'Chrome / Windows'
  },
  {
    id: 'log-006',
    userEmail: 'manager@sriammanstore.com',
    userName: 'Senthil Nathan',
    userRole: 'store_manager',
    action: 'STOCK_ADJUSTMENT',
    module: 'Inventory Operations',
    targetId: 'inv-var-88',
    recordName: 'Idhayam Sesame Oil 1L Pouch',
    previousValue: 'Stock: 48 units',
    newValue: 'Stock: 46 units (-2 damaged)',
    reason: 'Carton leak during unloader delivery',
    createdAt: '2026-09-22T08:45:00Z',
    device: 'Mobile Scanner Handheld'
  }
];

export const ActivityLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState(null);

  const loadLogs = () => {
    try {
      const stored = JSON.parse(localStorage.getItem('grocery_admin_audit_logs') || '[]');
      // Combine local dynamic events with baseline historical records
      const combined = [...stored, ...SAMPLE_ACTIVITY_AUDIT_LOGS];
      // Deduplicate by ID
      const uniqueMap = new Map();
      combined.forEach(l => uniqueMap.set(l.id || `${l.timestamp}-${l.action}`, l));
      setLogs(Array.from(uniqueMap.values()));
    } catch (e) {
      setLogs(SAMPLE_ACTIVITY_AUDIT_LOGS);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (moduleFilter !== 'ALL' && log.module !== moduleFilter) return false;
      if (roleFilter !== 'ALL' && log.userRole !== roleFilter) return false;
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        (log.action || '').toLowerCase().includes(q) ||
        (log.userEmail || '').toLowerCase().includes(q) ||
        (log.userName || '').toLowerCase().includes(q) ||
        (log.recordName || '').toLowerCase().includes(q) ||
        (log.reason || '').toLowerCase().includes(q) ||
        (log.module || '').toLowerCase().includes(q)
      );
    });
  }, [logs, moduleFilter, roleFilter, searchTerm]);

  const handleExportLogs = () => {
    const headers = [
      { label: 'Log ID', key: 'id' },
      { label: 'Timestamp', key: 'createdAt' },
      { label: 'Operator Email', key: 'userEmail' },
      { label: 'Role', key: 'userRole' },
      { label: 'Module', key: 'module' },
      { label: 'Action', key: 'action' },
      { label: 'Target Record', key: 'recordName' },
      { label: 'Previous Value', key: 'previousValue' },
      { label: 'New Value', key: 'newValue' },
      { label: 'Mandatory Reason', key: 'reason' },
      { label: 'Device / IP', key: 'device' }
    ];
    exportDataToCsv('sri_amman_activity_audit_logs', headers, filteredLogs);
  };

  const columns = [
    {
      key: 'createdAt',
      header: 'Timestamp',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-slate-500 text-xs">
          {formatDateTime(row.createdAt || row.timestamp)}
        </span>
      )
    },
    {
      key: 'operator',
      header: 'Staff Actor',
      render: (row) => (
        <div>
          <div className="font-bold text-slate-900">{row.userName || row.userEmail}</div>
          <span className="text-[10px] font-mono uppercase bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-semibold">
            {row.userRole || 'staff'}
          </span>
        </div>
      )
    },
    {
      key: 'module',
      header: 'Module',
      sortable: true,
      render: (row) => (
        <span className="font-semibold text-slate-700">{row.module}</span>
      )
    },
    {
      key: 'action',
      header: 'Action & Record',
      render: (row) => (
        <div>
          <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            {row.action}
          </span>
          {row.recordName && (
            <p className="text-xs text-slate-700 font-medium mt-1 truncate max-w-xs">{row.recordName}</p>
          )}
        </div>
      )
    },
    {
      key: 'changeDiff',
      header: 'Audit Value Change',
      render: (row) => {
        if (!row.previousValue && !row.newValue) return <span className="text-slate-400 text-xs">-</span>;
        return (
          <div className="text-xs flex items-center gap-1.5 font-medium">
            <span className="text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 line-through">
              {row.previousValue || 'None'}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-bold">
              {row.newValue}
            </span>
          </div>
        );
      }
    },
    {
      key: 'reason',
      header: 'Mandatory Justification',
      render: (row) => (
        <span className="text-slate-600 line-clamp-1 italic max-w-xs text-xs">
          "{row.reason}"
        </span>
      )
    },
    {
      key: 'view',
      header: 'Inspect',
      align: 'right',
      render: (row) => (
        <button
          onClick={() => setSelectedLog(row)}
          className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Inspect</span>
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security & Operational Activity Logs"
        subtitle="Immutable audit timeline with mandatory reason tracking for financial, stock, and permission alterations."
        badge={
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-900 text-white shadow-xs">
            ISO-Compliant Audit Ledger
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportLogs}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              Export Audit Trail (CSV)
            </button>

            <button
              onClick={loadLogs}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              title="Refresh Logs"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-subtle">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search action, staff, item or reason..."
            className="input-text pl-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            className="input-text text-xs py-1.5 bg-white font-medium"
          >
            <option value="ALL">All Modules ({logs.length})</option>
            <option value="Products & Pricing">Products & Pricing</option>
            <option value="Delivery Logistics">Delivery Logistics</option>
            <option value="Accounts & Finance">Accounts & Finance</option>
            <option value="Inventory Operations">Inventory Operations</option>
            <option value="Marketing & Promos">Marketing & Promos</option>
            <option value="Staff & Governance">Staff & Governance</option>
            <option value="Settings">Settings</option>
          </select>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="input-text text-xs py-1.5 bg-white font-medium"
          >
            <option value="ALL">All Roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="store_manager">Store Manager</option>
            <option value="accounts_staff">Accounts Staff</option>
            <option value="marketing_staff">Marketing Staff</option>
            <option value="delivery_manager">Delivery Manager</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <DataTable
        columns={columns}
        data={filteredLogs}
        emptyTitle="No activity logs match your filters"
        emptyDescription="Audit records will automatically populate as staff take actions."
      />

      {/* Audit Detail Modal */}
      <FormModal
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title="Audit Trail Entry Inspection"
        subtitle={`Audit ID: ${selectedLog?.id}`}
        showFooter={false}
      >
        {selectedLog && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl space-y-2.5 border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Timestamp:</span>
                <span className="font-mono text-slate-900 font-bold">{formatDateTime(selectedLog.createdAt || selectedLog.timestamp)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Staff Operator:</span>
                <span className="font-semibold text-slate-800">{selectedLog.userName} ({selectedLog.userEmail})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Assigned Operational Role:</span>
                <span className="font-mono uppercase font-bold text-slate-800">{selectedLog.userRole}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Module:</span>
                <span className="font-bold text-slate-800">{selectedLog.module}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Action Executed:</span>
                <span className="font-mono font-bold text-emerald-800">{selectedLog.action}</span>
              </div>
              {selectedLog.device && (
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Device & Session Info:</span>
                  <span className="font-mono text-slate-600">{selectedLog.device}</span>
                </div>
              )}
            </div>

            {/* Before vs After Visual Diff */}
            {(selectedLog.previousValue || selectedLog.newValue) && (
              <div className="p-3.5 bg-slate-100 rounded-xl space-y-2 border border-slate-200">
                <span className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">
                  State Transition Diff
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white p-2.5 rounded-lg border border-rose-200">
                    <span className="text-[10px] text-rose-700 font-bold uppercase">Before</span>
                    <p className="text-xs font-semibold text-slate-800 mt-0.5">{selectedLog.previousValue || 'None'}</p>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-emerald-200">
                    <span className="text-[10px] text-emerald-700 font-bold uppercase">After</span>
                    <p className="text-xs font-semibold text-slate-800 mt-0.5">{selectedLog.newValue || 'Updated'}</p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="input-label">Mandatory Operational Justification</label>
              <div className="p-3 bg-amber-50/80 border border-amber-300 rounded-xl text-amber-950 font-medium leading-relaxed italic">
                "{selectedLog.reason}"
              </div>
            </div>
          </div>
        )}
      </FormModal>
    </div>
  );
};
