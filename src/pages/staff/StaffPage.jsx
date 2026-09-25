import React, { useState, useEffect } from 'react';
import { 
  UserCheck, Shield, Plus, Mail, Phone, CheckCircle, Search, Filter,
  Edit2, Trash2, Power, History, KeyRound, Lock, AlertTriangle, Eye, Clock, Sparkles
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/table/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { FormModal } from '../../components/common/FormModal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { PermissionGuard } from '../../components/auth/PermissionGuard';
import { PERMISSIONS, PERMISSION_GROUPS } from '../../utils/permissions';
import { ROLES, ROLE_DEFINITIONS } from '../../utils/roles';
import { DEMO_USERS } from '../../firebase/authService';
import { useNotification } from '../../context/NotificationContext';
import { usePermissions } from '../../hooks/usePermissions';
import { logActivity } from '../../firebase/auditLogger';

const STAFF_LOCAL_KEY = 'grocery_admin_staff_list_v5';

export const StaffPage = () => {
  const [staffList, setStaffList] = useState(() => {
    try {
      const stored = localStorage.getItem(STAFF_LOCAL_KEY);
      return stored ? JSON.parse(stored) : Object.values(DEMO_USERS);
    } catch (e) {
      return Object.values(DEMO_USERS);
    }
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStaffForEdit, setSelectedStaffForEdit] = useState(null);

  // Delegation Modal State
  const [isDelegateModalOpen, setIsDelegateModalOpen] = useState(false);
  const [selectedStaffForDelegation, setSelectedStaffForDelegation] = useState(null);
  const [delegationForm, setDelegationForm] = useState({
    permissions: [],
    durationDays: '1',
    reason: ''
  });

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: ROLES.PACKING_STAFF,
    status: 'active'
  });

  const notify = useNotification();
  const { userRole, currentUser } = usePermissions();

  useEffect(() => {
    localStorage.setItem(STAFF_LOCAL_KEY, JSON.stringify(staffList));
  }, [staffList]);

  const filteredStaff = staffList.filter((staff) => {
    if (selectedRoleFilter !== 'ALL' && staff.role !== selectedRoleFilter) return false;
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      (staff.displayName || '').toLowerCase().includes(q) ||
      (staff.email || '').toLowerCase().includes(q) ||
      (staff.phone || '').includes(q)
    );
  });

  const handleOpenEdit = (staff) => {
    setSelectedStaffForEdit(staff);
    setFormData({
      name: staff.displayName || '',
      email: staff.email || '',
      phone: staff.phone || '',
      role: staff.role || ROLES.STORE_MANAGER,
      status: staff.status || 'active'
    });
    setIsEditModalOpen(true);
  };

  const handleOpenDelegateModal = (staff) => {
    setSelectedStaffForDelegation(staff);
    const existing = staff.delegatedPermissions || [];
    setDelegationForm({
      permissions: existing.map(d => d.permission),
      durationDays: '1',
      reason: ''
    });
    setIsDelegateModalOpen(true);
  };

  const handleSaveDelegationSubmit = async (e) => {
    e.preventDefault();
    if (!delegationForm.permissions.length) {
      notify.error('Select Permission', 'Please select at least one permission to delegate.');
      return;
    }
    if (!delegationForm.reason.trim()) {
      notify.error('Justification Required', 'Mandatory operational reason is required.');
      return;
    }

    let expiresAt = null;
    if (delegationForm.durationDays !== 'permanent') {
      const days = parseInt(delegationForm.durationDays, 10) || 1;
      const exp = new Date();
      exp.setDate(exp.getDate() + (days - 1));
      exp.setHours(23, 59, 59, 999);
      expiresAt = exp.toISOString();
    }

    const newDelegations = delegationForm.permissions.map(perm => ({
      permission: perm,
      grantedAt: new Date().toISOString(),
      expiresAt,
      reason: delegationForm.reason,
      grantedBy: currentUser?.displayName || currentUser?.email || 'Super Admin Owner'
    }));

    const updated = staffList.map(s => {
      if (s.uid === selectedStaffForDelegation.uid) {
        return {
          ...s,
          delegatedPermissions: newDelegations
        };
      }
      return s;
    });

    setStaffList(updated);

    await logActivity(
      currentUser || { id: 'admin', name: 'Super Admin' },
      'staff.delegate_permission',
      'staff',
      selectedStaffForDelegation.uid,
      `Delegated ${newDelegations.length} Owner permission(s) to ${selectedStaffForDelegation.displayName} for ${delegationForm.durationDays} day(s). Reason: ${delegationForm.reason}`,
      { delegations: newDelegations }
    );

    notify.success(
      'Permissions Delegated',
      `Granted ${newDelegations.length} temporary Owner permission(s) to ${selectedStaffForDelegation.displayName}.`
    );

    setIsDelegateModalOpen(false);
    setSelectedStaffForDelegation(null);
  };

  const handleRevokeDelegation = async () => {
    if (!selectedStaffForDelegation) return;

    const updated = staffList.map(s => {
      if (s.uid === selectedStaffForDelegation.uid) {
        return {
          ...s,
          delegatedPermissions: []
        };
      }
      return s;
    });

    setStaffList(updated);

    await logActivity(
      currentUser || { id: 'admin', name: 'Super Admin' },
      'staff.revoke_permission',
      'staff',
      selectedStaffForDelegation.uid,
      `Revoked all temporary Owner delegations for ${selectedStaffForDelegation.displayName}.`
    );

    notify.info(
      'Delegation Revoked',
      `Temporary permissions for ${selectedStaffForDelegation.displayName} have been revoked.`
    );

    setIsDelegateModalOpen(false);
    setSelectedStaffForDelegation(null);
  };

  const handleSaveStaffSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      notify.error('Missing Details', 'Staff name and email are mandatory.');
      return;
    }

    if (selectedStaffForEdit) {
      // Edit existing
      const updated = staffList.map(s => {
        if (s.uid === selectedStaffForEdit.uid) {
          return {
            ...s,
            displayName: formData.name,
            phone: formData.phone,
            role: formData.role,
            status: formData.status
          };
        }
        return s;
      });
      setStaffList(updated);

      await logActivity(
        currentUser || { id: 'admin', name: 'Super Admin' },
        'staff.update',
        'staff',
        selectedStaffForEdit.uid,
        `Updated profile details and role for ${formData.name} to ${formData.role}`,
        { updates: formData }
      );

      notify.success('Staff Updated', `${formData.name}'s profile was updated.`);
      setIsEditModalOpen(false);
      setSelectedStaffForEdit(null);
    } else {
      // Create new
      const newStaff = {
        uid: `staff-${Date.now()}`,
        displayName: formData.name,
        email: formData.email,
        phone: formData.phone || '+91 94440 00000',
        role: formData.role,
        status: 'active',
        createdAt: new Date().toISOString(),
        delegatedPermissions: []
      };

      setStaffList(prev => [newStaff, ...prev]);

      await logActivity(
        currentUser || { id: 'admin', name: 'Super Admin' },
        'staff.create',
        'staff',
        newStaff.uid,
        `Provisioned account for ${newStaff.displayName} as ${ROLE_DEFINITIONS[newStaff.role]?.name || newStaff.role}`,
        { staff: newStaff }
      );

      notify.success('Account Created', `${newStaff.displayName} registered as ${ROLE_DEFINITIONS[newStaff.role]?.name}.`);
      setIsAddModalOpen(false);
      setFormData({ name: '', email: '', phone: '', role: ROLES.PACKING_STAFF, status: 'active' });
    }
  };

  const handleToggleStatus = (staff) => {
    const nextStatus = staff.status === 'active' ? 'disabled' : 'active';
    setConfirmConfig({
      type: 'toggle_status',
      staff,
      nextStatus,
      title: `${nextStatus === 'disabled' ? 'Disable' : 'Enable'} Staff Account`,
      message: `Are you sure you want to ${nextStatus === 'disabled' ? 'revoke login access for' : 're-enable access for'} ${staff.displayName}?`
    });
    setIsConfirmOpen(true);
  };

  const handleDeleteStaff = (staff) => {
    setConfirmConfig({
      type: 'delete',
      staff,
      title: 'Delete Staff Account',
      message: `Permanently delete ${staff.displayName} from system operators? This action is recorded in the permanent audit trail.`
    });
    setIsConfirmOpen(true);
  };

  const handleConfirmAction = async ({ reason }) => {
    if (!confirmConfig) return;

    if (confirmConfig.type === 'toggle_status') {
      const updated = staffList.map(s => s.uid === confirmConfig.staff.uid ? { ...s, status: confirmConfig.nextStatus } : s);
      setStaffList(updated);

      await logActivity(
        currentUser || { id: 'admin', name: 'Super Admin' },
        'staff.status_change',
        'staff',
        confirmConfig.staff.uid,
        `Account status changed to ${confirmConfig.nextStatus.toUpperCase()} for ${confirmConfig.staff.displayName}. Reason: ${reason}`
      );

      notify.success('Status Changed', `Staff account is now ${confirmConfig.nextStatus}.`);
    } else if (confirmConfig.type === 'delete') {
      const filtered = staffList.filter(s => s.uid !== confirmConfig.staff.uid);
      setStaffList(filtered);

      await logActivity(
        currentUser || { id: 'admin', name: 'Super Admin' },
        'staff.delete',
        'staff',
        confirmConfig.staff.uid,
        `Staff account ${confirmConfig.staff.displayName} deleted. Reason: ${reason}`
      );

      notify.success('Staff Deleted', `${confirmConfig.staff.displayName} removed.`);
    }

    setIsConfirmOpen(false);
    setConfirmConfig(null);
  };

  const columns = [
    {
      key: 'displayName',
      header: 'Staff Member',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0">
            {(row.displayName || 'S').charAt(0)}
          </div>
          <div>
            <div className="font-bold text-slate-900">{row.displayName}</div>
            <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
              <span className="flex items-center gap-1">
                <Mail className="w-3 h-3" />
                {row.email}
              </span>
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'phone',
      header: 'Contact Phone',
      render: (row) => <span className="font-mono text-slate-600">{row.phone}</span>
    },
    {
      key: 'role',
      header: 'Assigned Role',
      sortable: true,
      render: (row) => {
        const def = ROLE_DEFINITIONS[row.role] || { name: row.role };
        return (
          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${def.badgeColor || 'bg-slate-100 text-slate-700'}`}>
            <Shield className="w-3 h-3" />
            {def.name}
          </span>
        );
      }
    },
    {
      key: 'delegations',
      header: 'Temporary Owner Access',
      render: (row) => {
        const now = new Date();
        const activeDelegations = (row.delegatedPermissions || []).filter(
          d => !d.expiresAt || new Date(d.expiresAt) > now
        );

        if (activeDelegations.length === 0) {
          return (
            <span className="text-[11px] text-slate-400 italic">
              Standard Role Only
            </span>
          );
        }

        const first = activeDelegations[0];
        const count = activeDelegations.length;
        const expiresDateStr = first.expiresAt 
          ? new Date(first.expiresAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + new Date(first.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : 'Permanent';

        return (
          <div className="flex flex-col gap-0.5">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-100 text-purple-900 border border-purple-300">
              <KeyRound className="w-3 h-3 text-purple-700 shrink-0" />
              <span>{count} Temp {count > 1 ? 'Permissions' : 'Permission'}</span>
            </span>
            <span className="text-[10px] text-purple-700 font-mono font-medium">
              Expires: {expiresDateStr}
            </span>
          </div>
        );
      }
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (row) => <StatusBadge status={row.status || 'active'} />
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {row.role !== ROLES.SUPER_ADMIN && (
            <button
              type="button"
              onClick={() => handleOpenDelegateModal(row)}
              className="p-1.5 text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
              title="Delegate Owner Access (Temporary)"
            >
              <KeyRound className="w-3.5 h-3.5 text-purple-600" />
              <span className="hidden xl:inline">Delegate Access</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleOpenEdit(row)}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            title="Edit Staff Member"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => handleToggleStatus(row)}
            className={`p-1.5 rounded-lg transition-colors ${
              row.status === 'active'
                ? 'text-amber-600 hover:bg-amber-50'
                : 'text-emerald-600 hover:bg-emerald-50'
            }`}
            title={row.status === 'active' ? 'Disable Account' : 'Enable Account'}
          >
            <Power className="w-3.5 h-3.5" />
          </button>

          {row.role !== ROLES.SUPER_ADMIN && (
            <button
              type="button"
              onClick={() => handleDeleteStaff(row)}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Delete Staff"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff & Role Governance"
        subtitle="Manage Sri Amman Store operational personnel, access control levels, and temporary Owner permission delegations."
        actions={
          <button
            onClick={() => {
              setSelectedStaffForEdit(null);
              setFormData({ name: '', email: '', phone: '', role: ROLES.PACKING_STAFF, status: 'active' });
              setIsAddModalOpen(true);
            }}
            className="btn-primary text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Staff Member</span>
          </button>
        }
      />

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white rounded-xl border border-slate-200 shadow-subtle">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search staff by name or email..."
            className="input-text pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedRoleFilter}
            onChange={(e) => setSelectedRoleFilter(e.target.value)}
            className="input-text text-xs py-1.5"
          >
            <option value="ALL">All Operational Roles ({staffList.length})</option>
            {Object.values(ROLE_DEFINITIONS).map((def) => (
              <option key={def.id} value={def.id}>
                {def.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Staff Table */}
      <DataTable
        columns={columns}
        data={filteredStaff}
        emptyTitle="No staff members found"
        emptyDescription="Try adjusting your role filter or search keyword."
      />

      {/* Temporary Owner Access Delegation Modal */}
      <FormModal
        isOpen={isDelegateModalOpen}
        onClose={() => {
          setIsDelegateModalOpen(false);
          setSelectedStaffForDelegation(null);
        }}
        title={`Delegate Owner Permissions: ${selectedStaffForDelegation?.displayName}`}
        subtitle="Grant temporary Super Admin / Owner capabilities to staff while Owner is absent."
        onSubmit={handleSaveDelegationSubmit}
        submitLabel="Grant Temporary Access"
      >
        <div className="space-y-4 text-xs">
          {/* Info Callout */}
          <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl text-purple-900 leading-relaxed flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-xs">Temporary Owner Authority Override</p>
              <p className="text-[11px] text-purple-800 mt-0.5">
                Selected Owner capabilities will be extended to <strong>{selectedStaffForDelegation?.displayName}</strong> ({selectedStaffForDelegation?.email}) for the specified duration only. All actions will be logged into the security audit ledger.
              </p>
            </div>
          </div>

          {/* Permission Checklist */}
          <div>
            <label className="input-label mb-2">Select Owner Permissions to Delegate *</label>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {[
                { key: PERMISSIONS.PRODUCTS_EDIT, label: 'Modify Product Prices & Stock Levels', desc: 'Allows overriding catalog pricing and stock safety bounds' },
                { key: PERMISSIONS.PRODUCTS_DELETE, label: 'Delete Products & Categories', desc: 'High-risk catalog purging authority' },
                { key: PERMISSIONS.REPORTS_FINANCIAL, label: 'Full Financial Reports & P&L Audit', desc: 'Access revenue, gross margin, and profit statements' },
                { key: PERMISSIONS.FINANCIALS_REFUND, label: 'Process Customer Cash Refunds & COD Handover', desc: 'Authorize cash refunds and rider COD settlements' },
                { key: PERMISSIONS.STAFF_VIEW, label: 'Staff Account Management & Role Edit', desc: 'Modify staff member accounts and permissions' },
                { key: PERMISSIONS.AUDIT_VIEW, label: 'View Security Activity Audit Log', desc: 'Inspect system operational event logs' },
                { key: PERMISSIONS.SETTINGS_MANAGE, label: 'Store Business & Order Settings', desc: 'Change checkout rules and delivery thresholds' }
              ].map((item) => {
                const isChecked = delegationForm.permissions.includes(item.key);
                return (
                  <label
                    key={item.key}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-colors cursor-pointer ${
                      isChecked
                        ? 'bg-purple-50/80 border-purple-300 text-purple-950 font-medium shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setDelegationForm(prev => ({
                            ...prev,
                            permissions: [...prev.permissions, item.key]
                          }));
                        } else {
                          setDelegationForm(prev => ({
                            ...prev,
                            permissions: prev.permissions.filter(p => p !== item.key)
                          }));
                        }
                      }}
                      className="mt-0.5 rounded text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <span className="font-bold block text-xs">{item.label}</span>
                      <span className="text-[10px] text-slate-500 block">{item.desc}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Duration Selector */}
          <div>
            <label className="input-label">Delegation Validity Duration *</label>
            <select
              value={delegationForm.durationDays}
              onChange={(e) => setDelegationForm({ ...delegationForm, durationDays: e.target.value })}
              className="input-text text-xs bg-white font-bold text-purple-900"
            >
              <option value="1">1 Day (Expires Tonight at 11:59 PM)</option>
              <option value="2">2 Days (Expires Tomorrow at 11:59 PM)</option>
              <option value="7">1 Week (7 Days)</option>
              <option value="30">1 Month (30 Days)</option>
              <option value="permanent">Permanent Custom Override (Until Revoked)</option>
            </select>
          </div>

          {/* Operational Reason */}
          <div>
            <label className="input-label">Mandatory Operational Justification *</label>
            <textarea
              rows={2}
              required
              value={delegationForm.reason}
              onChange={(e) => setDelegationForm({ ...delegationForm, reason: e.target.value })}
              placeholder="e.g. Super Admin out of town for supplier negotiation. Delegating price update and financial audit access to Senthil for 2 days."
              className="input-text text-xs"
            />
          </div>

          {/* Active Delegations Revoke Button */}
          {selectedStaffForDelegation?.delegatedPermissions?.length > 0 && (
            <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
              <span className="text-[11px] text-slate-500">Currently has active delegations</span>
              <button
                type="button"
                onClick={handleRevokeDelegation}
                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-colors"
              >
                Revoke All Delegations
              </button>
            </div>
          )}
        </div>
      </FormModal>

      {/* Add / Edit Staff Modal */}
      <FormModal
        isOpen={isAddModalOpen || isEditModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setIsEditModalOpen(false);
          setSelectedStaffForEdit(null);
        }}
        title={selectedStaffForEdit ? 'Edit Staff Member' : 'Provision New Staff Member'}
        subtitle="Configure role credentials and operational authorizations."
        onSubmit={handleSaveStaffSubmit}
        submitLabel={selectedStaffForEdit ? 'Save Changes' : 'Create Staff Account'}
      >
        <form className="space-y-4">
          <div>
            <label className="input-label">Full Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Ramesh Krishnan"
              className="input-text text-xs"
            />
          </div>

          <div>
            <label className="input-label">Corporate Email *</label>
            <input
              type="email"
              required
              disabled={Boolean(selectedStaffForEdit)}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="staff@sriammanstore.com"
              className="input-text text-xs disabled:opacity-50"
            />
          </div>

          <div>
            <label className="input-label">Contact Phone</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+91 98765 00000"
              className="input-text text-xs"
            />
          </div>

          <div>
            <label className="input-label">Assigned Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="input-text text-xs"
            >
              {Object.values(ROLE_DEFINITIONS).map((def) => (
                <option key={def.id} value={def.id}>
                  {def.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              {ROLE_DEFINITIONS[formData.role]?.description}
            </p>
          </div>

          {selectedStaffForEdit && (
            <div>
              <label className="input-label">Account Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="input-text text-xs"
              >
                <option value="active">Active (Full Access)</option>
                <option value="disabled">Disabled (Revoked Access)</option>
              </select>
            </div>
          )}
        </form>
      </FormModal>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isConfirmOpen}
        title={confirmConfig?.title || 'Confirm Staff Action'}
        message={confirmConfig?.message || 'Are you sure?'}
        confirmText="Confirm & Audit Log"
        variant={confirmConfig?.type === 'delete' ? 'danger' : 'warning'}
        isHighRisk={true}
        requireReason={true}
        reasonPlaceholder="Mandatory reason for staff account alteration..."
        onConfirm={handleConfirmAction}
        onCancel={() => {
          setIsConfirmOpen(false);
          setConfirmConfig(null);
        }}
      />
    </div>
  );
};
