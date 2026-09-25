import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  Phone,
  Mail,
  Coins,
  Cake,
  ShieldAlert,
  Send,
  Plus,
  Minus,
  Star,
  MapPin,
  Calendar,
  IndianRupee,
  CheckCircle2,
  Clock,
  MessageCircle,
  Eye,
  ShoppingBag,
  RotateCcw,
  XCircle,
  Tag,
  Share2,
  FileText,
  Edit,
  Save,
  Check
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/table/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { FormModal } from '../../components/common/FormModal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { PermissionGuard } from '../../components/auth/PermissionGuard';
import { PERMISSIONS } from '../../utils/permissions';
import {
  getAllCustomers,
  setCustomerStatus,
  adjustSmartCoins,
  getSmartCoinTransactions,
  getBirthdayCustomers,
  updateCustomerNotes
} from '../../firebase/customerService';
import { getAllOrders } from '../../firebase/orderService';
import {
  sendMessage,
  executeBirthdayAutomation,
  getBirthdaySettings,
  saveBirthdaySettings
} from '../../firebase/communicationService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { useNotification } from '../../context/NotificationContext';
import { usePermissions } from '../../hooks/usePermissions';

export const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'vip' | 'birthday' | 'frequent' | 'blocked'

  // Profile Detail Modal State
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [modalActiveTab, setModalActiveTab] = useState('crm'); // 'crm' | 'orders' | 'coins' | 'addresses'
  const [customerOrders, setCustomerOrders] = useState([]);
  const [customerCoinLogs, setCustomerCoinLogs] = useState([]);

  // Support Notes Editing
  const [supportNoteInput, setSupportNoteInput] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Smart Coins Modal State
  const [smartCoinsModalOpen, setSmartCoinsModalOpen] = useState(false);
  const [coinsDelta, setCoinsDelta] = useState(50);
  const [coinsReason, setCoinsReason] = useState('');
  const [isAdjustingCoins, setIsAdjustingCoins] = useState(false);

  // Direct Communication Modal
  const [messageModalOpen, setMessageModalOpen] = useState(false);
  const [messageChannel, setMessageChannel] = useState('whatsapp');
  const [customMessageText, setCustomMessageText] = useState('');

  // High-Risk Block Confirmation
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [targetBlockCustomer, setTargetBlockCustomer] = useState(null);

  // Birthday Automation Drawer
  const [birthdayDrawerOpen, setBirthdayDrawerOpen] = useState(false);
  const [birthdayData, setBirthdayData] = useState({ todayList: [], thisWeekList: [], thisMonthList: [] });
  const [birthdayConfig, setBirthdayConfig] = useState(getBirthdaySettings());

  const notify = useNotification();
  const { currentUser } = usePermissions();

  const loadData = async () => {
    setLoading(true);
    try {
      const custData = await getAllCustomers();
      const orderData = await getAllOrders();
      const bData = await getBirthdayCustomers();
      setCustomers(custData);
      setAllOrders(orderData);
      setBirthdayData(bData);
    } catch (err) {
      notify.error('Failed to load CRM data', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredCustomers = customers.filter((cust) => {
    if (activeTab === 'vip' && cust.status !== 'VIP') return false;
    if (activeTab === 'blocked' && cust.status !== 'Blocked') return false;
    if (activeTab === 'frequent' && (cust.totalOrders || 0) < 10) return false;
    if (activeTab === 'birthday') {
      const isBday = birthdayData.thisMonthList.some((b) => b.id === cust.id);
      if (!isBday) return false;
    }

    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      cust.name.toLowerCase().includes(q) ||
      cust.tamilName?.toLowerCase().includes(q) ||
      cust.mobile.includes(q) ||
      cust.email?.toLowerCase().includes(q) ||
      cust.addresses?.[0]?.locality?.toLowerCase().includes(q)
    );
  });

  const handleOpenCustomerDetail = async (cust) => {
    setSelectedCustomer(cust);
    setSupportNoteInput(cust.notes || '');
    setModalActiveTab('crm');

    // Filter customer order history
    const matchedOrders = allOrders.filter(
      (o) => o.customerId === cust.id || o.customerMobile === cust.mobile
    );
    setCustomerOrders(matchedOrders);

    // Filter customer coin transaction logs
    const logs = await getSmartCoinTransactions(cust.id);
    setCustomerCoinLogs(logs);

    setDetailModalOpen(true);
  };

  const handleSaveSupportNotes = async () => {
    if (!selectedCustomer) return;
    setIsSavingNotes(true);
    try {
      const updatedCust = await updateCustomerNotes(selectedCustomer.id, supportNoteInput.trim(), currentUser);
      setSelectedCustomer(updatedCust);
      notify.success('Support Notes Saved', 'Customer notes updated in CRM profile.');
      await loadData();
    } catch (err) {
      notify.error('Failed to save notes', err.message);
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleOpenSmartCoins = (cust) => {
    setSelectedCustomer(cust);
    setCoinsDelta(50);
    setCoinsReason('Customer loyalty appreciation bonus');
    setSmartCoinsModalOpen(true);
  };

  const handleConfirmSmartCoins = async (e) => {
    e.preventDefault();
    if (!coinsReason.trim()) {
      notify.error('Missing Reason', 'Mandatory audit reason required for Smart Coin changes.');
      return;
    }

    setIsAdjustingCoins(true);
    try {
      const result = await adjustSmartCoins({
        customerId: selectedCustomer.id,
        deltaCoins: Number(coinsDelta),
        reason: coinsReason.trim(),
        user: currentUser
      });

      notify.success(
        'Smart Coins Updated',
        `${selectedCustomer.name} wallet adjusted by ${coinsDelta > 0 ? '+' : ''}${coinsDelta} coins.`
      );
      setSmartCoinsModalOpen(false);
      await loadData();
      if (selectedCustomer) {
        setSelectedCustomer(result.customer);
      }
    } catch (err) {
      notify.error('Adjustment Failed', err.message);
    } finally {
      setIsAdjustingCoins(false);
    }
  };

  const handleToggleBlockCustomer = async ({ reason }) => {
    if (!targetBlockCustomer) return;
    const nextStatus = targetBlockCustomer.status === 'Blocked' ? 'Active' : 'Blocked';

    try {
      await setCustomerStatus(targetBlockCustomer.id, nextStatus, reason, currentUser);
      notify.success(
        'Account Status Changed',
        `${targetBlockCustomer.name} is now marked as ${nextStatus}.`
      );
      setBlockConfirmOpen(false);
      setTargetBlockCustomer(null);
      await loadData();
    } catch (err) {
      notify.error('Action Failed', err.message);
    }
  };

  const handleSendMessageSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    try {
      await sendMessage({
        customer: selectedCustomer,
        channel: messageChannel,
        templateText: customMessageText,
        user: currentUser
      });

      notify.success(
        'Message Dispatched',
        `Dispatched via ${messageChannel.toUpperCase()} to ${selectedCustomer.mobile}.`
      );
      setMessageModalOpen(false);
    } catch (err) {
      notify.error('Delivery Blocked', err.message);
    }
  };

  const handleExecuteBirthdayGift = async (customer) => {
    try {
      const res = await executeBirthdayAutomation(customer, currentUser);
      notify.success(
        'Birthday Gift Dispatched',
        `Credited +${res.rewardCoins} Smart Coins and dispatched WhatsApp greeting to ${customer.name}!`
      );
      await loadData();
    } catch (err) {
      notify.error('Automation Failed', err.message);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Customer Profile & CRM Info',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
            {row.name.charAt(0)}
          </div>
          <div>
            <div className="font-bold text-slate-900">{row.name}</div>
            {row.tamilName && (
              <div className="text-[11px] text-slate-500 font-sans">{row.tamilName}</div>
            )}
            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {row.mobile}
              </span>
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'locality',
      header: 'Locality & City',
      render: (row) => (
        <div className="text-xs text-slate-700">
          <span className="font-semibold">{row.addresses?.[0]?.locality || 'Coimbatore'}</span>
          <span className="block text-[10px] text-slate-400 font-mono">PIN: {row.addresses?.[0]?.pincode}</span>
        </div>
      )
    },
    {
      key: 'orders',
      header: 'Orders & Spend History',
      sortable: true,
      render: (row) => (
        <div className="text-xs">
          <div className="font-bold font-sans text-slate-900">
            {formatCurrency(row.totalSpending)}
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            {row.totalOrders} Orders • AOV: {formatCurrency(row.averageOrderValue)}
          </div>
          {(row.cancelledOrders > 0 || row.returnedOrders > 0) && (
            <div className="text-[9px] flex items-center gap-1 mt-0.5">
              {row.cancelledOrders > 0 && (
                <span className="text-rose-700 bg-rose-50 px-1 rounded font-bold">
                  {row.cancelledOrders} Cancelled
                </span>
              )}
              {row.returnedOrders > 0 && (
                <span className="text-amber-800 bg-amber-50 px-1 rounded font-bold">
                  {row.returnedOrders} Returned
                </span>
              )}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'lastOrderDate',
      header: 'Last Order Date',
      sortable: true,
      render: (row) => (
        <div className="text-xs font-mono text-slate-600">
          {row.lastOrderDate ? formatDateTime(row.lastOrderDate) : '—'}
        </div>
      )
    },
    {
      key: 'smartCoins',
      header: 'Smart Coins',
      align: 'center',
      sortable: true,
      render: (row) => (
        <button
          onClick={() => handleOpenSmartCoins(row)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors"
          title="Click to Add/Debit Smart Coins"
        >
          <Coins className="w-3.5 h-3.5 text-amber-600" />
          <span>{row.smartCoins}</span>
        </button>
      )
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (row) => (
        <StatusBadge
          status={row.status === 'VIP' ? 'active' : row.status.toLowerCase()}
          label={row.status}
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
            onClick={() => handleOpenCustomerDetail(row)}
            className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="View Full Profile & Order History"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              setSelectedCustomer(row);
              setCustomMessageText(`Vanakkam ${row.name}! Sri Amman Store has fresh farm produce in stock today.`);
              setMessageModalOpen(true);
            }}
            className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Send WhatsApp or SMS"
          >
            <MessageCircle className="w-3.5 h-3.5" />
          </button>

          <PermissionGuard permission={PERMISSIONS.CUSTOMERS_BLOCK}>
            <button
              onClick={() => {
                setTargetBlockCustomer(row);
                setBlockConfirmOpen(true);
              }}
              className={`p-1.5 rounded-lg transition-colors ${
                row.status === 'Blocked'
                  ? 'text-emerald-600 hover:bg-emerald-50'
                  : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
              }`}
              title={row.status === 'Blocked' ? 'Unblock Customer' : 'Block Customer'}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
            </button>
          </PermissionGuard>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Relationship Management (CRM)"
        subtitle="360° customer profile history, last order dates, cancellation/return audits, promo codes, referral tracking, and support notes."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBirthdayDrawerOpen(true)}
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              <Cake className="w-3.5 h-3.5 text-rose-500" />
              <span>
                Birthday Automation ({birthdayData.todayList.length} Today)
              </span>
            </button>
          </div>
        }
      />

      {/* Filter and Segmentation Pills */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-subtle space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search customer name, mobile, email, locality..."
              className="input-text pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto text-xs w-full sm:w-auto">
            {[
              { id: 'ALL', label: 'All Customers' },
              { id: 'vip', label: 'VIP Shoppers' },
              { id: 'frequent', label: 'Frequent (10+ Orders)' },
              { id: 'birthday', label: 'Birthday This Month' },
              { id: 'blocked', label: 'Blocked / Suspicious' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Customers Table */}
      <DataTable
        columns={columns}
        data={filteredCustomers}
        loading={loading}
        emptyTitle="No customer profiles match your criteria"
        exportFilename="sriammanstore-crm-customers.csv"
      />

      {/* Full Customer Profile & CRM 360° Detail Modal */}
      <FormModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title={`CRM Profile: ${selectedCustomer?.name}`}
        subtitle={`Customer ID: ${selectedCustomer?.id} • Member since ${selectedCustomer?.registrationDate}`}
        maxWidth="max-w-3xl"
        showFooter={false}
      >
        {selectedCustomer && (
          <div className="space-y-4 text-xs">
            {/* Modal Internal Navigation Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
              {[
                { id: 'crm', label: '1. CRM Metrics & Notes', icon: FileText },
                { id: 'orders', label: `2. Order History (${customerOrders.length})`, icon: ShoppingBag },
                { id: 'coins', label: '3. Smart Coins Wallet', icon: Coins },
                { id: 'addresses', label: '4. Address Book', icon: MapPin }
              ].map((mTab) => {
                const Icon = mTab.icon;
                return (
                  <button
                    key={mTab.id}
                    onClick={() => setModalActiveTab(mTab.id)}
                    className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 whitespace-nowrap text-xs transition-colors ${
                      modalActiveTab === mTab.id
                        ? 'bg-emerald-800 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{mTab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* TAB 1: CRM METRICS & SUPPORT NOTES */}
            {modalActiveTab === 'crm' && (
              <div className="space-y-4">
                {/* 4 CRM Metric Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Spending</span>
                    <strong className="text-slate-900 font-bold text-sm font-sans block mt-0.5">
                      {formatCurrency(selectedCustomer.totalSpending)}
                    </strong>
                    <span className="text-[9px] text-slate-500 font-mono">AOV: {formatCurrency(selectedCustomer.averageOrderValue)}</span>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Completed Orders</span>
                    <strong className="text-slate-900 font-bold text-sm font-mono block mt-0.5">
                      {selectedCustomer.totalOrders} Orders
                    </strong>
                    <span className="text-[9px] text-slate-500 font-mono">
                      Last: {selectedCustomer.lastOrderDate ? formatDateTime(selectedCustomer.lastOrderDate) : 'N/A'}
                    </span>
                  </div>

                  <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl">
                    <span className="text-[10px] text-rose-700 uppercase font-semibold block">Cancelled Orders</span>
                    <strong className="text-rose-900 font-bold text-sm font-mono block mt-0.5">
                      {selectedCustomer.cancelledOrders || 0} Orders
                    </strong>
                    <span className="text-[9px] text-rose-600 font-mono">
                      {(selectedCustomer.cancelledOrders || 0) > 0 ? 'Cancellation risk' : 'Clean record'}
                    </span>
                  </div>

                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
                    <span className="text-[10px] text-amber-800 uppercase font-semibold block">Returned Orders</span>
                    <strong className="text-amber-900 font-bold text-sm font-mono block mt-0.5">
                      {selectedCustomer.returnedOrders || 0} Orders
                    </strong>
                    <span className="text-[9px] text-amber-700 font-mono">
                      {(selectedCustomer.returnedOrders || 0) > 0 ? 'Item returns logged' : 'No returns'}
                    </span>
                  </div>
                </div>

                {/* Promo Codes Used Card */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Tag className="w-4 h-4 text-emerald-700" />
                    <span>Promo Codes Applied / Used</span>
                  </div>
                  {(selectedCustomer.promoCodesUsed || []).length === 0 ? (
                    <p className="text-slate-400 italic text-[11px]">No promo codes used by this customer yet.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedCustomer.promoCodesUsed.map((code) => (
                        <span
                          key={code}
                          className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-900 font-mono font-bold text-xs border border-emerald-300"
                        >
                          🎟️ {code}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Referral Details Card */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800">
                      <Share2 className="w-4 h-4 text-blue-600" />
                      <span>Referral & Loyalty Program Details</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      Referral Code: {selectedCustomer.referralCode || 'N/A'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 space-y-1 font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Referred By:</span>
                      <strong className="text-slate-800">{selectedCustomer.referredBy || 'Direct Organic Signup'}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Referral Bonus Coins Earned:</span>
                      <strong className="text-emerald-700">+100 Smart Coins</strong>
                    </div>
                  </div>
                </div>

                {/* Support Team Notes Card */}
                <div className="p-3.5 bg-amber-50/50 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <FileText className="w-4 h-4 text-amber-700" />
                      <span>Support Team Notes & Operation Guidelines</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveSupportNotes}
                      disabled={isSavingNotes}
                      className="btn-primary text-xs py-1 px-3 flex items-center gap-1"
                    >
                      <Save className="w-3 h-3" />
                      <span>{isSavingNotes ? 'Saving...' : 'Save Notes'}</span>
                    </button>
                  </div>

                  <textarea
                    rows={3}
                    value={supportNoteInput}
                    onChange={(e) => setSupportNoteInput(e.target.value)}
                    placeholder="Enter operational notes for customer care staff (e.g. Prefers cold-pressed oil, morning delivery only)..."
                    className="input-text text-xs bg-white border-amber-300 focus:border-amber-500"
                  />
                  <p className="text-[10px] text-slate-400">
                    Visible to all customer support and delivery dispatch staff.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: ORDER HISTORY LIST */}
            {modalActiveTab === 'orders' && (
              <div className="space-y-3">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">Total Recorded Orders: {customerOrders.length}</span>
                  <span className="text-slate-500 font-mono">
                    Last Active: {selectedCustomer.lastOrderDate ? formatDateTime(selectedCustomer.lastOrderDate) : 'N/A'}
                  </span>
                </div>

                {customerOrders.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 italic">No recent order records found for this customer.</div>
                ) : (
                  <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                    {customerOrders.map((ord) => (
                      <div
                        key={ord.id}
                        className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-slate-300 transition-all space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <strong className="text-slate-900 font-mono text-xs">{ord.id}</strong>
                            <span className="text-[10px] text-slate-400 block font-mono">
                              {formatDateTime(ord.createdAt)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900 font-sans text-xs">
                              {formatCurrency(ord.totalAmount)}
                            </span>
                            <StatusBadge status={ord.status || 'confirmed'} />
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg font-mono flex flex-wrap justify-between gap-1">
                          <span>Items: {(ord.items || []).map((i) => i.productName || 'Grocery Item').join(', ')}</span>
                          <span className="text-slate-400 font-semibold">{ord.paymentMethod?.toUpperCase() || 'COD'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: SMART COINS WALLET LEDGER */}
            {modalActiveTab === 'coins' && (
              <div className="space-y-3">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-amber-600" />
                    <div>
                      <span className="text-xs font-bold text-amber-900 block">Smart Coins Loyalty Wallet</span>
                      <span className="text-[10px] text-amber-700">1 Smart Coin = ₹1 Store Credit</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <strong className="font-mono text-lg text-amber-900">{selectedCustomer.smartCoins} Coins</strong>
                    <button
                      type="button"
                      onClick={() => handleOpenSmartCoins(selectedCustomer)}
                      className="btn-primary text-xs py-1"
                    >
                      + Add / Debit Coins
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 max-h-60 overflow-y-auto divide-y divide-slate-200/60 font-mono text-[11px]">
                  {customerCoinLogs.length === 0 ? (
                    <div className="text-slate-400 text-center py-4">No Smart Coins transaction ledger history</div>
                  ) : (
                    customerCoinLogs.map((log) => (
                      <div key={log.id} className="py-2 flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-slate-800">{log.reason}</span>
                          <div className="text-[10px] text-slate-400">
                            {formatDateTime(log.timestamp)} • by {log.staffName}
                          </div>
                        </div>
                        <span className={`font-bold text-xs ${log.deltaCoins > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {log.deltaCoins > 0 ? `+${log.deltaCoins}` : log.deltaCoins}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: SAVED ADDRESS BOOK */}
            {modalActiveTab === 'addresses' && (
              <div className="space-y-2">
                <span className="input-label">Saved Delivery Addresses ({selectedCustomer.addresses?.length || 0})</span>
                {(selectedCustomer.addresses || []).map((addr) => (
                  <div key={addr.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-2 text-xs">
                    <MapPin className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-900">{addr.title}: </strong>
                      <span className="text-slate-600">
                        {addr.addressLine}, Landmark: {addr.landmark}, {addr.locality}, PIN: {addr.pincode}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </FormModal>

      {/* Smart Coins Modification Modal */}
      <FormModal
        isOpen={smartCoinsModalOpen}
        onClose={() => setSmartCoinsModalOpen(false)}
        title="Modify Customer Smart Coins"
        subtitle={`Adjust balance for ${selectedCustomer?.name} (Current: ${selectedCustomer?.smartCoins} coins)`}
        maxWidth="max-w-md"
        onSubmit={handleConfirmSmartCoins}
        submitLabel="Commit Coins Adjustment"
        isSubmitting={isAdjustingCoins}
      >
        <form onSubmit={handleConfirmSmartCoins} className="space-y-4 text-xs">
          <div>
            <label className="input-label">
              Delta Coins (+ to Credit, - to Debit) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              required
              value={coinsDelta}
              onChange={(e) => setCoinsDelta(e.target.value)}
              placeholder="e.g. +50 for compensation, -20 for reversal"
              className="input-text font-mono font-bold text-sm"
            />
          </div>

          <div>
            <label className="input-label">
              Mandatory Business Justification <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              required
              value={coinsReason}
              onChange={(e) => setCoinsReason(e.target.value)}
              placeholder="Explain reason (e.g. Inconvenience compensation for delayed milk delivery)..."
              className="input-text text-xs"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Recorded into the immutable audit ledger. Silent balance modification is strictly prohibited.
            </p>
          </div>
        </form>
      </FormModal>

      {/* Customer Communication Modal */}
      <FormModal
        isOpen={messageModalOpen}
        onClose={() => setMessageModalOpen(false)}
        title="Direct Customer Communication"
        subtitle={`Dispatch transactional notice to ${selectedCustomer?.name} (${selectedCustomer?.mobile})`}
        maxWidth="max-w-md"
        onSubmit={handleSendMessageSubmit}
        submitLabel="Dispatch Message"
      >
        <form onSubmit={handleSendMessageSubmit} className="space-y-4 text-xs">
          <div>
            <label className="input-label">Communication Channel</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMessageChannel('whatsapp')}
                className={`p-2.5 rounded-xl border text-center font-semibold transition-all ${
                  messageChannel === 'whatsapp'
                    ? 'bg-emerald-800 text-white border-emerald-800'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                WhatsApp (Consented)
              </button>
              <button
                type="button"
                onClick={() => setMessageChannel('sms')}
                className={`p-2.5 rounded-xl border text-center font-semibold transition-all ${
                  messageChannel === 'sms'
                    ? 'bg-emerald-800 text-white border-emerald-800'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                Direct SMS
              </button>
            </div>
          </div>

          <div>
            <label className="input-label">Message Body</label>
            <textarea
              rows={3}
              required
              value={customMessageText}
              onChange={(e) => setCustomMessageText(e.target.value)}
              className="input-text text-xs"
            />
          </div>
        </form>
      </FormModal>

      {/* Birthday Automation Drawer */}
      <FormModal
        isOpen={birthdayDrawerOpen}
        onClose={() => setBirthdayDrawerOpen(false)}
        title="Birthday Automation & Loyalty Engine"
        subtitle="Automatic rewards and personalized greetings for shoppers celebrating birthdays."
        maxWidth="max-w-lg"
        showFooter={false}
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
            <span className="font-bold text-rose-900 block">
              🎂 Today's Birthday Celebrations ({birthdayData.todayList.length})
            </span>
            <div className="divide-y divide-rose-200/60 pt-1">
              {birthdayData.todayList.map((b) => (
                <div key={b.id} className="py-2 flex items-center justify-between">
                  <div>
                    <strong className="text-slate-900">{b.name}</strong>
                    <span className="text-[10px] text-slate-500 block font-mono">{b.mobile}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleExecuteBirthdayGift(b)}
                    className="btn-primary text-xs py-1 px-2.5"
                  >
                    Send 50 Coins & Greeting
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Birthday Settings */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <span className="input-label mb-0">Birthday Reward Parameters</span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-slate-400 block">Reward Smart Coins</span>
                <input
                  type="number"
                  value={birthdayConfig.rewardCoins}
                  onChange={(e) => {
                    const updated = { ...birthdayConfig, rewardCoins: Number(e.target.value) };
                    setBirthdayConfig(updated);
                    saveBirthdaySettings(updated);
                  }}
                  className="input-text text-xs font-mono py-1"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">Gift Promo Code</span>
                <input
                  type="text"
                  value={birthdayConfig.promoCode}
                  onChange={(e) => {
                    const updated = { ...birthdayConfig, promoCode: e.target.value };
                    setBirthdayConfig(updated);
                    saveBirthdaySettings(updated);
                  }}
                  className="input-text text-xs font-mono uppercase py-1"
                />
              </div>
            </div>
          </div>
        </div>
      </FormModal>

      {/* Block Customer Confirmation Dialog */}
      <ConfirmDialog
        isOpen={blockConfirmOpen}
        title={targetBlockCustomer?.status === 'Blocked' ? 'Unblock Customer Account' : 'Block Customer Account'}
        message={`You are modifying account status for ${targetBlockCustomer?.name}. Blocked accounts are prohibited from creating new orders.`}
        confirmText="Confirm Status Change"
        variant="danger"
        isHighRisk={true}
        requireReason={true}
        reasonPlaceholder="Mandatory reason for blocking/unblocking customer account..."
        onConfirm={handleToggleBlockCustomer}
        onCancel={() => setBlockConfirmOpen(false)}
      />
    </div>
  );
};
