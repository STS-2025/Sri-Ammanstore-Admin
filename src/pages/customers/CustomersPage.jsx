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
  Check,
  Download,
  BellRing,
  ShoppingCart,
  TrendingUp,
  UserPlus,
  AlertTriangle,
  ToggleLeft,
  ToggleRight,
  History,
  ShieldCheck,
  Ban
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
  saveBirthdaySettings,
  getMessageLogs
} from '../../firebase/communicationService';
import { exportDataToCsv } from '../../firebase/reportService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { useNotification } from '../../context/NotificationContext';
import { usePermissions } from '../../hooks/usePermissions';

export const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Behaviour Tabs: 'ALL' | 'top100' | 'frequent' | 'dormant' | 'new' | 'abandoned_cart' | 'high_cancel' | 'birthday' | 'blocked'
  const [activeTab, setActiveTab] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

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
  const [messageChannel, setMessageChannel] = useState('whatsapp'); // 'whatsapp' | 'sms' | 'push' | 'email'
  const [customMessageText, setCustomMessageText] = useState('');

  // High-Risk Block Confirmation
  const [blockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [targetBlockCustomer, setTargetBlockCustomer] = useState(null);

  // Birthday Automation Control Panel Modal
  const [birthdayDrawerOpen, setBirthdayDrawerOpen] = useState(false);
  const [birthdayTab, setBirthdayTab] = useState('celebrations'); // 'celebrations' | 'settings' | 'history'
  const [birthdayData, setBirthdayData] = useState({ todayList: [], thisWeekList: [], thisMonthList: [] });
  const [birthdayConfig, setBirthdayConfig] = useState(getBirthdaySettings());
  const [messageHistory, setMessageHistory] = useState([]);

  const notify = useNotification();
  const { currentUser } = usePermissions();

  const loadData = async () => {
    setLoading(true);
    try {
      const custData = await getAllCustomers();
      const orderData = await getAllOrders();
      const bData = await getBirthdayCustomers();
      const logs = getMessageLogs();
      setCustomers(custData);
      setAllOrders(orderData);
      setBirthdayData(bData);
      setMessageHistory(logs);
    } catch (err) {
      notify.error('Failed to load CRM data', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Filtered & Segmented Customers List
  const filteredCustomers = customers.filter((cust) => {
    // Category Buyer Filter
    if (categoryFilter !== 'ALL') {
      const preferredCat = cust.preferredCategory || 'Rice & Grains';
      if (preferredCat !== categoryFilter) return false;
    }

    // Behavioural Segmentation Tabs
    if (activeTab === 'vip' && cust.status !== 'VIP') return false;
    if (activeTab === 'blocked' && cust.status !== 'Blocked' && cust.status !== 'Suspicious') return false;
    if (activeTab === 'frequent' && (cust.totalOrders || 0) < 10) return false;
    if (activeTab === 'high_cancel' && (cust.cancelledOrders || 0) < 2) return false;
    if (activeTab === 'abandoned_cart' && !cust.hasAbandonedCart && cust.cancelledOrders < 1) return false;
    
    if (activeTab === 'dormant') {
      if (!cust.lastOrderDate) return false;
      const lastOrder = new Date(cust.lastOrderDate);
      if (lastOrder >= thirtyDaysAgo) return false;
    }

    if (activeTab === 'new') {
      if (!cust.registrationDate) return false;
      const reg = new Date(cust.registrationDate);
      if (reg < thirtyDaysAgo) return false;
    }

    if (activeTab === 'birthday') {
      const isBday = birthdayData.thisMonthList.some((b) => b.id === cust.id);
      if (!isBday) return false;
    }

    // Search bar matching: Customer ID, Name, Mobile, Email, Locality, Order ID
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      
      const matchesProfile =
        cust.id?.toLowerCase().includes(q) ||
        cust.name?.toLowerCase().includes(q) ||
        cust.tamilName?.toLowerCase().includes(q) ||
        cust.mobile?.includes(q) ||
        cust.email?.toLowerCase().includes(q) ||
        cust.addresses?.[0]?.locality?.toLowerCase().includes(q);

      if (matchesProfile) return true;

      // Check if q matches any Order ID placed by this customer
      const matchesOrderId = allOrders.some(
        (ord) =>
          (ord.customerId === cust.id || ord.customerMobile === cust.mobile) &&
          ord.id?.toLowerCase().includes(q)
      );

      return matchesOrderId;
    }

    return true;
  }).sort((a, b) => {
    if (activeTab === 'top100') {
      return (b.totalSpending || 0) - (a.totalSpending || 0);
    }
    return 0;
  });

  // Limit top 100 purchase value if tab selected
  const displayedCustomers = activeTab === 'top100' ? filteredCustomers.slice(0, 100) : filteredCustomers;

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
        'Notification Dispatched',
        `Dispatched via ${messageChannel.toUpperCase()} to ${selectedCustomer.name} (${selectedCustomer.mobile}).`
      );
      setMessageModalOpen(false);
      await loadData();
    } catch (err) {
      notify.error('Delivery Blocked', err.message);
    }
  };

  const handleExecuteBirthdayGift = async (customer) => {
    try {
      const res = await executeBirthdayAutomation(customer, currentUser);
      notify.success(
        'Birthday Gift Dispatched',
        `Credited +${res.rewardCoins} Smart Coins and dispatched greeting to ${customer.name}!`
      );
      await loadData();
    } catch (err) {
      notify.error('Automation Blocked', err.message);
    }
  };

  const handleSaveBirthdaySettingsUpdate = (newConfig) => {
    setBirthdayConfig(newConfig);
    saveBirthdaySettings(newConfig);
    notify.success('Birthday Settings Updated', 'Birthday automation parameters updated successfully.');
  };

  // Export Filtered Customer Data to Excel / CSV
  const handleExportFilteredCustomers = () => {
    const headers = [
      { label: 'Customer ID', key: 'id' },
      { label: 'Customer Name', key: 'name' },
      { label: 'Tamil Name', key: 'tamilName' },
      { label: 'Mobile Number', key: 'mobile' },
      { label: 'Email', key: 'email' },
      { label: 'Gender', key: 'gender' },
      { label: 'Date of Birth', key: 'dob' },
      { label: 'Registration Date', key: 'registrationDate' },
      { label: 'Status', key: 'status' },
      { label: 'Smart Coins Balance', key: 'smartCoins' },
      { label: 'Total Spending (INR)', key: 'totalSpending' },
      { label: 'Total Orders', key: 'totalOrders' },
      { label: 'Average Order Value (INR)', key: 'averageOrderValue' },
      { label: 'Last Order Date', key: 'lastOrderDate' },
      { label: 'Cancelled Orders', key: 'cancelledOrders' },
      { label: 'Returned Orders', key: 'returnedOrders' },
      { label: 'Promo Codes Used', key: 'promoCodesFormatted' },
      { label: 'Referral Code', key: 'referralCode' },
      { label: 'Referred By', key: 'referredBy' },
      { label: 'Support Team Notes', key: 'notes' }
    ];

    const rows = displayedCustomers.map((c) => ({
      ...c,
      email: c.email || 'N/A',
      gender: c.gender || 'Unspecified',
      dob: c.dob || 'N/A',
      promoCodesFormatted: (c.promoCodesUsed || []).join(', ') || 'None',
      referredBy: c.referredBy || 'Organic Direct'
    }));

    exportDataToCsv('sri_amman_filtered_crm_customers', headers, rows);
    notify.success('Customer List Downloaded', `Exported ${rows.length} customer records to CSV/Excel format.`);
  };

  const columns = [
    {
      key: 'name',
      header: 'Customer ID & Profile',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0 font-mono">
            {row.name.charAt(0)}
          </div>
          <div>
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <span>{row.name}</span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1 rounded">
                {row.id}
              </span>
            </div>
            {row.tamilName && (
              <div className="text-[11px] text-slate-500 font-sans">{row.tamilName}</div>
            )}
            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {row.mobile}
              </span>
              {row.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {row.email}
                </span>
              )}
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
          {row.lastOrderDate ? formatDateTime(row.lastOrderDate) : 'No Orders'}
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
          status={row.status === 'VIP' ? 'active' : row.status === 'Blocked' ? 'blocked' : 'active'}
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
            title="View Complete CRM Profile & Order History"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              setSelectedCustomer(row);
              setCustomMessageText(`Vanakkam ${row.name}! Sri Amman Store has fresh grocery offers for you today.`);
              setMessageModalOpen(true);
            }}
            className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Send WhatsApp / SMS / Email / Push Notification"
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
        subtitle="360° customer profiles, order history, behavioural segmentation, Smart Coins loyalty, WhatsApp/Push notices & Excel exports."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportFilteredCustomers}
              className="btn-primary text-xs flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Customer List (Excel/CSV)</span>
            </button>

            <button
              onClick={() => {
                setBirthdayTab('celebrations');
                setBirthdayDrawerOpen(true);
              }}
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

      {/* Behavioural Segmentation & Filters Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-subtle space-y-3">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3">
          {/* Universal Search Bar */}
          <div className="relative w-full lg:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by Mobile, Customer Name, Customer ID, Email, Order ID..."
              className="input-text pl-9 text-xs"
            />
          </div>

          {/* Category Preferred Filter */}
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <span className="text-xs text-slate-500 font-semibold whitespace-nowrap">Preferred Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input-text text-xs py-1.5 px-2 bg-slate-50 border-slate-300 rounded-lg max-w-[200px]"
            >
              <option value="ALL">All Categories</option>
              <option value="Rice & Grains">Rice & Grains</option>
              <option value="Edible Oils & Ghee">Edible Oils & Ghee</option>
              <option value="Spices & Masala">Spices & Masala</option>
              <option value="Dairy & Milk">Dairy & Milk</option>
              <option value="Atta & Flours">Atta & Flours</option>
            </select>
          </div>
        </div>

        {/* Customer Behaviour Segment Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs pt-1 border-t border-slate-100">
          {[
            { id: 'ALL', label: 'All Customers' },
            { id: 'top100', label: '🏆 Top 100 Purchase Value' },
            { id: 'frequent', label: '⚡ Most Frequent (10+ Orders)' },
            { id: 'dormant', label: '💤 Dormant (>30 Days No Order)' },
            { id: 'new', label: '✨ New Customers (<30 Days)' },
            { id: 'abandoned_cart', label: '🛒 Abandoned Carts' },
            { id: 'high_cancel', label: '⚠️ High Cancellation Rate' },
            { id: 'birthday', label: '🎂 Birthday Celebrations' },
            { id: 'vip', label: '👑 VIP Shoppers' },
            { id: 'blocked', label: '⛔ Blocked / Suspicious' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-colors ${
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

      {/* Customers Table */}
      <DataTable
        columns={columns}
        data={displayedCustomers}
        loading={loading}
        emptyTitle="No customer profiles match your search criteria"
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
                { id: 'crm', label: '1. Profile & CRM Data', icon: FileText },
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

            {/* TAB 1: PROFILE METRICS, CRM DATA & SUPPORT NOTES */}
            {modalActiveTab === 'crm' && (
              <div className="space-y-4">
                {/* Basic Customer Profile Info Bar */}
                <div className="p-3 bg-slate-100/80 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Customer ID</span>
                    <strong className="text-slate-900">{selectedCustomer.id}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Mobile & Email</span>
                    <strong className="text-slate-900">{selectedCustomer.mobile}</strong>
                    <span className="text-[10px] text-slate-500 block truncate">{selectedCustomer.email || 'No Email'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Gender & DOB</span>
                    <strong className="text-slate-900">{selectedCustomer.gender || 'Not Specified'}</strong>
                    <span className="text-[10px] text-slate-500 block">{selectedCustomer.dob || 'DOB N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase">Registration & Status</span>
                    <strong className="text-emerald-800">{selectedCustomer.registrationDate}</strong>
                    <span className="text-[10px] font-bold uppercase text-slate-700 block">{selectedCustomer.status}</span>
                  </div>
                </div>

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

            {/* TAB 2: COMPLETE ORDER HISTORY LIST */}
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

      {/* Customer Communication Modal (WhatsApp, SMS, Email, Push Alert) */}
      <FormModal
        isOpen={messageModalOpen}
        onClose={() => setMessageModalOpen(false)}
        title="Direct Customer Notification"
        subtitle={`Dispatch notice to ${selectedCustomer?.name} (${selectedCustomer?.mobile})`}
        maxWidth="max-w-md"
        onSubmit={handleSendMessageSubmit}
        submitLabel="Dispatch Notification"
      >
        <form onSubmit={handleSendMessageSubmit} className="space-y-4 text-xs">
          <div>
            <label className="input-label">Communication Channel</label>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                { id: 'whatsapp', label: 'WhatsApp' },
                { id: 'sms', label: 'SMS' },
                { id: 'email', label: 'Email' },
                { id: 'push', label: 'Push' }
              ].map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setMessageChannel(ch.id)}
                  className={`p-2 rounded-lg border text-center font-semibold text-xs transition-all ${
                    messageChannel === ch.id
                      ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {ch.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              System checks customer consent ({selectedCustomer?.consentWhatsApp ? 'WhatsApp OK' : 'No WA'}, {selectedCustomer?.consentSMS ? 'SMS OK' : 'No SMS'}) before delivery.
            </p>
          </div>

          <div>
            <label className="input-label">Notification Message Body</label>
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

      {/* Automatic Birthday Automation & Control Panel Modal */}
      <FormModal
        isOpen={birthdayDrawerOpen}
        onClose={() => setBirthdayDrawerOpen(false)}
        title="Automatic Birthday Automation & Loyalty Engine"
        subtitle="Configure automatic birthday rewards, channel rules, message templates & audit message logs."
        maxWidth="max-w-2xl"
        showFooter={false}
      >
        <div className="space-y-4 text-xs">
          {/* Modal Internal Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            {[
              { id: 'celebrations', label: `🎂 Today's Birthdays (${birthdayData.todayList.length})`, icon: Cake },
              { id: 'settings', label: '⚙️ Rules & Message Template', icon: BellRing },
              { id: 'history', label: `📜 Sent Message Audit Logs (${messageHistory.length})`, icon: History }
            ].map((bTab) => {
              const Icon = bTab.icon;
              return (
                <button
                  key={bTab.id}
                  onClick={() => setBirthdayTab(bTab.id)}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 text-xs whitespace-nowrap transition-colors ${
                    birthdayTab === bTab.id
                      ? 'bg-emerald-800 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{bTab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: TODAY'S CELEBRATIONS */}
          {birthdayTab === 'celebrations' && (
            <div className="space-y-3">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-900 block text-xs">
                    🎂 Today's Birthday Celebrations ({birthdayData.todayList.length})
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    birthdayConfig.isEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {birthdayConfig.isEnabled ? 'Automatic Engine Active' : 'Engine Disabled'}
                  </span>
                </div>

                {birthdayData.todayList.length === 0 ? (
                  <p className="text-rose-700 italic text-xs py-2">No shoppers celebrating birthdays today. ({birthdayData.thisMonthList.length} birthdays coming up this month).</p>
                ) : (
                  <div className="divide-y divide-rose-200/60 pt-1">
                    {birthdayData.todayList.map((b) => (
                      <div key={b.id} className="py-2 flex items-center justify-between">
                        <div>
                          <strong className="text-slate-900">{b.name}</strong>
                          <span className="text-[10px] text-slate-500 block font-mono">{b.mobile} • {b.email || 'No email'}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleExecuteBirthdayGift(b)}
                          className="btn-primary text-xs py-1 px-3 bg-rose-600 hover:bg-rose-700"
                        >
                          Send {birthdayConfig.rewardCoins} Coins & Wish
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="font-bold text-slate-700 block mb-1">Upcoming Birthdays This Month ({birthdayData.thisMonthList.length}):</span>
                <div className="flex flex-wrap gap-1.5">
                  {birthdayData.thisMonthList.map((mb) => (
                    <span key={mb.id} className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] font-mono text-slate-700">
                      {mb.name} ({mb.dob})
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RULES, CHANNELS & MESSAGE TEMPLATES */}
          {birthdayTab === 'settings' && (
            <div className="space-y-4">
              {/* Master Switch */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <strong className="text-slate-900 block">Automatic Birthday Engine Status</strong>
                  <span className="text-[10px] text-slate-500">Automatically dispatches greetings & rewards on customer DOB at 08:00 AM</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const updated = { ...birthdayConfig, isEnabled: !birthdayConfig.isEnabled };
                    handleSaveBirthdaySettingsUpdate(updated);
                  }}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-colors ${
                    birthdayConfig.isEnabled
                      ? 'bg-emerald-700 text-white'
                      : 'bg-slate-300 text-slate-700'
                  }`}
                >
                  {birthdayConfig.isEnabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                  <span>{birthdayConfig.isEnabled ? 'ENABLED' : 'DISABLED'}</span>
                </button>
              </div>

              {/* Active Channels */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="input-label mb-0">Enabled Communication Channels</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { key: 'whatsapp', label: '💬 WhatsApp' },
                    { key: 'sms', label: '📱 SMS' },
                    { key: 'email', label: '✉️ Email' },
                    { key: 'push', label: '🔔 App Push' }
                  ].map((ch) => (
                    <button
                      key={ch.key}
                      type="button"
                      onClick={() => {
                        const updated = {
                          ...birthdayConfig,
                          channels: {
                            ...birthdayConfig.channels,
                            [ch.key]: !birthdayConfig.channels?.[ch.key]
                          }
                        };
                        handleSaveBirthdaySettingsUpdate(updated);
                      }}
                      className={`p-2 rounded-lg border text-center font-bold text-xs transition-all ${
                        birthdayConfig.channels?.[ch.key]
                          ? 'bg-emerald-800 text-white border-emerald-800 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-400'
                      }`}
                    >
                      {ch.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Message Template Editor */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="input-label mb-0">Custom Birthday Message Template</span>
                <textarea
                  rows={3}
                  value={birthdayConfig.templateMessage}
                  onChange={(e) => {
                    const updated = { ...birthdayConfig, templateMessage: e.target.value };
                    setBirthdayConfig(updated);
                  }}
                  className="input-text text-xs bg-white font-sans"
                />
                <div className="flex justify-between items-center text-[10px] text-slate-400">
                  <span>Available Placeholders: <code className="text-emerald-800 font-bold">{'{name}'}</code>, <code className="text-emerald-800 font-bold">{'{coins}'}</code>, <code className="text-emerald-800 font-bold">{'{code}'}</code></span>
                  <button
                    type="button"
                    onClick={() => handleSaveBirthdaySettingsUpdate(birthdayConfig)}
                    className="btn-primary text-xs py-1 px-2.5"
                  >
                    Save Template
                  </button>
                </div>
              </div>

              {/* Reward Config */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <span className="input-label mb-0">Birthday Reward Parameters</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Reward Smart Coins</span>
                    <input
                      type="number"
                      value={birthdayConfig.rewardCoins}
                      onChange={(e) => {
                        const updated = { ...birthdayConfig, rewardCoins: Number(e.target.value) };
                        handleSaveBirthdaySettingsUpdate(updated);
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
                        handleSaveBirthdaySettingsUpdate(updated);
                      }}
                      className="input-text text-xs font-mono uppercase py-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SENT MESSAGE HISTORY & DELIVERY AUDIT LOGS */}
          {birthdayTab === 'history' && (
            <div className="space-y-3">
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-700">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <span>Delivery & Consent Audit Log</span>
                </div>
                <span className="text-slate-500 font-mono text-[11px]">{messageHistory.length} Logged Entries</span>
              </div>

              <div className="divide-y divide-slate-200/80 border border-slate-200 rounded-xl max-h-72 overflow-y-auto bg-white">
                {messageHistory.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 italic">No message logs recorded yet.</div>
                ) : (
                  messageHistory.map((log) => (
                    <div key={log.id} className="p-3 text-xs space-y-1 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <strong className="text-slate-900 font-bold">{log.customerName}</strong>
                          <span className="text-[10px] font-mono text-slate-400">({log.customerPhone})</span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            log.status.includes('Consent Blocked')
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {log.status}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-600 font-mono bg-slate-50 p-1.5 rounded border border-slate-100">
                        "{log.message}"
                      </div>

                      <div className="flex justify-between text-[10px] text-slate-400 font-mono pt-0.5">
                        <span>Channel: <strong className="uppercase text-slate-700">{log.channel}</strong></span>
                        <span>{formatDateTime(log.timestamp)} • {log.sentBy}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
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
