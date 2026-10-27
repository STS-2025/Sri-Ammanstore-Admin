import React, { useEffect, useState } from 'react';
import JsBarcode from 'jsbarcode';
import {
  Search,
  Phone,
  Mail,
  RefreshCw,
  Eye,
  Pencil,
  Trash2,
  X,
  Upload,
  Printer,
  Barcode
} from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/table/DataTable';
import { FormModal } from '../../components/common/FormModal';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import {
  deleteCustomerProfile,
  getAllCustomers,
  updateCustomerProfile
} from '../../firebase/customerService';
import { getAllOrders } from '../../firebase/orderService';
import { formatCurrency, formatDateTime } from '../../utils/formatters';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../hooks/useAuth';

const normalizePhone = (value) => String(value ?? '').replace(/\D+/g, '');

const getCustomerPhoneCandidates = (customer = {}) => {
  const candidates = [
    customer.mobile,
    customer.phone,
    customer.phoneNumber,
    customer.customerMobile,
    customer.customerPhone,
    customer.mobileNumber,
    customer.contactNumber
  ];

  return candidates
    .filter(Boolean)
    .map((value) => normalizePhone(value))
    .filter(Boolean);
};

const getCustomerAddress = (customer = {}) =>
  customer.addresses?.[0] || customer.address || customer.deliveryAddress || {};

const getCustomerAddressText = (customer = {}) => {
  const address = getCustomerAddress(customer);
  const parts = [
    address.addressLine1 || address.addressLine || address.flatNo,
    address.addressLine2 || address.street,
    address.landmark,
    address.locality || address.area,
    address.city || address.district,
    address.state,
    address.pincode || address.pinCode || address.zipCode
  ].filter(Boolean);
  return [...new Set(parts.map((part) => String(part).trim()).filter(Boolean))].join(', ');
};

const getCustomerImage = (customer = {}) =>
  customer.photoUrl || customer.photoURL || customer.profileImageUrl || customer.imageUrl || customer.image || '';

const getManualOrderCustomerIds = (order = {}) =>
  [order.customerId, order.customer?.id, order.customer?.customerId, order.userProfile?.customerId]
    .filter(Boolean)
    .map(String);

const getManualOrderPhones = (order = {}) =>
  [
    order.customerPhone,
    order.customerMobile,
    order.customer?.phone,
    order.customer?.mobile,
    order.userProfile?.phone,
    order.userProfile?.number,
    order.phone
  ]
    .filter(Boolean)
    .map(normalizePhone)
    .filter(Boolean);

const getOrdersForCustomer = (customer, orders) => {
  const customerIds = [customer.id, customer.customerId].filter(Boolean).map(String);
  const customerPhones = new Set(getCustomerPhoneCandidates(customer));

  return orders.filter((order) => {
    const orderIds = getManualOrderCustomerIds(order);
    const matchesId = orderIds.some((id) => customerIds.includes(id));
    const matchesPhone = getManualOrderPhones(order).some((phone) => customerPhones.has(phone));
    return matchesId || matchesPhone;
  });
};

const getOrderValue = (order = {}) =>
  Number(order.totalAmount ?? order.total ?? order.subtotal ?? 0) || 0;

const compressCustomerImage = async (file) => {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.');
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Please choose an image smaller than 10 MB.');
  }

  const image = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 512 / Math.max(image.width, image.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not prepare the selected image.');

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.82, 0.7, 0.58, 0.46]) {
      const imageData = canvas.toDataURL('image/jpeg', quality);
      if (imageData.length <= 900_000) return imageData;
    }
  } finally {
    image.close();
  }

  throw new Error('Could not reduce this image enough to save. Please choose a smaller image.');
};

const getEditForm = (customer) => {
  const address = getCustomerAddress(customer);
  return {
    name: customer.name || '',
    tamilName: customer.tamilName || '',
    mobile: customer.mobile || customer.phone || '',
    email: customer.email || '',
    photoUrl: getCustomerImage(customer),
    locality: address.locality || address.area || address.city || address.district || '',
    pincode: address.pincode || address.zipCode || address.pinCode || '',
    creditEnabled: customer.creditEnabled !== false,
    creditLimit: Number(customer.creditLimit ?? 5000)
  };
};

export const ManualCustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingCustomer, setViewingCustomer] = useState(null);
  const [showAllOrders, setShowAllOrders] = useState(false);
  const [printableCustomer, setPrintableCustomer] = useState(null);
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const notify = useNotification();
  const { currentUser } = useAuth();

  const loadData = async () => {
    setLoading(true);
    try {
      const [orderData, customerData] = await Promise.all([getAllOrders({ manualOnly: true }), getAllCustomers()]);
      const manualOrders = orderData.filter((order) => order.orderSource === 'manual');
      const manualCustomerIds = new Set(manualOrders.flatMap(getManualOrderCustomerIds));
      const manualCustomerPhones = new Set(manualOrders.flatMap(getManualOrderPhones));

      const matches = customerData
        .filter((customer) => {
          const idCandidates = [customer.id, customer.customerId].filter(Boolean).map(String);
          const phoneCandidates = getCustomerPhoneCandidates(customer);
          return (
            idCandidates.some((id) => manualCustomerIds.has(id)) ||
            phoneCandidates.some((phone) => manualCustomerPhones.has(phone))
          );
        })
        .map((customer) => {
          const manualCustomerOrders = getOrdersForCustomer(customer, manualOrders).sort(
            (first, second) => new Date(second.createdAt || 0).getTime() - new Date(first.createdAt || 0).getTime()
          );
          const manualOrderValue = manualCustomerOrders.reduce((total, order) => total + getOrderValue(order), 0);
          return {
            ...customer,
            manualOrders: manualCustomerOrders,
            manualOrderCount: manualCustomerOrders.length,
            manualOrderValue
          };
        });

      setCustomers(matches);
    } catch (err) {
      notify.error('Failed to load manual customers', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredCustomers = customers.filter((customer) => {
    if (!searchTerm.trim()) return true;

    const query = searchTerm.toLowerCase();
    const idText = [customer.id, customer.customerId].filter(Boolean).join(' ').toLowerCase();
    const phoneText = getCustomerPhoneCandidates(customer).join(' ');
    const localityText = String(getCustomerAddress(customer).locality || getCustomerAddress(customer).area || '').toLowerCase();
    const emailText = (customer.email || '').toLowerCase();

    return (
      idText.includes(query) ||
      phoneText.includes(query) ||
      (customer.name || '').toLowerCase().includes(query) ||
      (customer.tamilName || '').toLowerCase().includes(query) ||
      emailText.includes(query) ||
      localityText.includes(query)
    );
  });

  const openEditModal = (customer) => {
    setEditingCustomer(customer);
    setEditForm(getEditForm(customer));
  };

  const openCustomerView = (customer) => {
    setShowAllOrders(false);
    setViewingCustomer(customer);
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      const photoUrl = await compressCustomerImage(file);
      setEditForm((previous) => ({ ...previous, photoUrl }));
    } catch (err) {
      notify.error('Image upload failed', err.message);
    }
  };

  const handleGenerateCustomerCard = async () => {
    if (!viewingCustomer) return;
    setIsGeneratingCard(true);
    try {
      const customerId = viewingCustomer.customerId || viewingCustomer.id;
      const barcodeCanvas = document.createElement('canvas');
      JsBarcode(barcodeCanvas, String(customerId), {
        format: 'CODE128',
        width: 2,
        height: 72,
        displayValue: true,
        fontSize: 14,
        margin: 8,
        background: '#ffffff',
        lineColor: '#0f172a'
      });
      setPrintableCustomer({ ...viewingCustomer, barcodeDataUrl: barcodeCanvas.toDataURL('image/png') });
    } catch (err) {
      notify.error('Failed to generate customer card', err.message);
    } finally {
      setIsGeneratingCard(false);
    }
  };

  const handleSaveCustomer = async () => {
    if (!editingCustomer || !editForm) return;
    if (!editForm.name.trim()) {
      notify.error('Name required', 'Please enter the customer name.');
      return;
    }

    setIsSaving(true);
    try {
      const currentAddress = getCustomerAddress(editingCustomer);
      const updates = {
        name: editForm.name.trim(),
        tamilName: editForm.tamilName.trim(),
        mobile: editForm.mobile.trim(),
        phone: editForm.mobile.trim(),
        email: editForm.email.trim(),
        photoUrl: editForm.photoUrl.trim(),
        creditEnabled: Boolean(editForm.creditEnabled),
        creditLimit: editForm.creditEnabled ? Math.max(0, Number(editForm.creditLimit || 0)) : 0,
        address: {
          ...(editingCustomer.address || {}),
          ...currentAddress,
          locality: editForm.locality.trim(),
          area: editForm.locality.trim(),
          pincode: editForm.pincode.trim()
        }
      };

      if (Array.isArray(editingCustomer.addresses) && editingCustomer.addresses.length > 0) {
        updates.addresses = [
          { ...editingCustomer.addresses[0], locality: editForm.locality.trim(), pincode: editForm.pincode.trim() },
          ...editingCustomer.addresses.slice(1)
        ];
      }

      await updateCustomerProfile(editingCustomer.id, updates, currentUser);
      notify.success('Customer updated', 'Manual customer profile has been updated.');
      setEditingCustomer(null);
      setEditForm(null);
      await loadData();
    } catch (err) {
      notify.error('Failed to update customer', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    setIsDeleting(true);
    try {
      await deleteCustomerProfile(customerToDelete.id, currentUser);
      notify.success('Customer deleted', 'The customer profile was deleted. Manual order records were kept.');
      setCustomerToDelete(null);
      if (viewingCustomer?.id === customerToDelete.id) setViewingCustomer(null);
      await loadData();
    } catch (err) {
      notify.error('Failed to delete customer', err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Customer',
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-3">
          {getCustomerImage(row) ? (
            <img
              src={getCustomerImage(row)}
              alt={row.name || 'Customer'}
              className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-200"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0 font-mono">
              {(row.name || 'C').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <span>{row.name || 'Unnamed Customer'}</span>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1 rounded">
                {row.customerId || row.id}
              </span>
            </div>
            {row.tamilName && <div className="text-[11px] text-slate-500 font-sans">{row.tamilName}</div>}
            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {getCustomerPhoneCandidates(row)[0] || 'No mobile'}
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
      header: 'Locality',
      render: (row) => {
        const address = getCustomerAddress(row);
        return (
          <div className="text-xs text-slate-700">
            <span className="font-semibold">{address.locality || address.area || address.city || 'Locality not set'}</span>
            <span className="block text-[10px] text-slate-400 font-mono">
              PIN: {address.pincode || address.zipCode || address.pinCode || 'N/A'}
            </span>
          </div>
        );
      }
    },
    {
      key: 'manualOrderValue',
      header: 'Manual Order Value',
      sortable: true,
      render: (row) => (
        <div className="text-xs">
          <div className="font-bold font-sans text-slate-900">{formatCurrency(row.manualOrderValue)}</div>
          <div className="text-[10px] text-slate-500 font-mono">{row.manualOrderCount} orders</div>
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => openCustomerView(row)}
            className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
            title="View customer"
            aria-label={`View ${row.name || 'customer'}`}
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => openEditModal(row)}
            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit customer"
            aria-label={`Edit ${row.name || 'customer'}`}
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setCustomerToDelete(row)}
            className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
            title="Delete customer"
            aria-label={`Delete ${row.name || 'customer'}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Manual Customers"
        subtitle="Registered customer profiles referenced by at least one manual order."
        actions={
          <button
            onClick={loadData}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-white border border-slate-200 transition-colors"
            title="Refresh Manual Customers"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        }
      />

      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-subtle">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search customer name, ID, phone, or locality"
            className="input-text pl-9 text-xs"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredCustomers}
        loading={loading}
        emptyTitle="No registered customers found for manual orders"
      />

      <FormModal
        isOpen={Boolean(viewingCustomer)}
        title="Customer Profile"
        subtitle="Manual customer details and linked manual orders"
        onClose={() => {
          setViewingCustomer(null);
          setShowAllOrders(false);
        }}
        showFooter={false}
        maxWidth="max-w-2xl"
      >
        {viewingCustomer && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              {getCustomerImage(viewingCustomer) ? (
                <img
                  src={getCustomerImage(viewingCustomer)}
                  alt={viewingCustomer.name || 'Customer'}
                  className="w-20 h-20 rounded-full object-cover border border-slate-200"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-2xl font-bold">
                  {(viewingCustomer.name || 'C').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-slate-900">{viewingCustomer.name || 'Unnamed Customer'}</h3>
                {viewingCustomer.tamilName && <p className="text-sm text-slate-500">{viewingCustomer.tamilName}</p>}
                <p className="text-xs text-slate-400 font-mono">{viewingCustomer.customerId || viewingCustomer.id}</p>
              </div>
              <button
                type="button"
                onClick={handleGenerateCustomerCard}
                disabled={isGeneratingCard}
                className="ml-auto inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-700 text-white text-xs font-semibold hover:bg-emerald-800 disabled:opacity-60"
              >
                <Barcode className="w-4 h-4" />
                {isGeneratingCard ? 'Generating...' : 'Generate Card'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewingCustomer(null);
                  setShowAllOrders(false);
                }}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                aria-label="Close customer profile"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-xs text-slate-400 block">Mobile</span>
                <span className="font-medium text-slate-800">{getCustomerPhoneCandidates(viewingCustomer)[0] || 'Not set'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-xs text-slate-400 block">Email</span>
                <span className="font-medium text-slate-800 break-all">{viewingCustomer.email || 'Not set'}</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-xs text-slate-400 block">Locality / PIN</span>
                <span className="font-medium text-slate-800">
                  {getCustomerAddress(viewingCustomer).locality ||
                    getCustomerAddress(viewingCustomer).area ||
                    getCustomerAddress(viewingCustomer).city ||
                    'Not set'}
                  {' / '}
                  {getCustomerAddress(viewingCustomer).pincode ||
                    getCustomerAddress(viewingCustomer).zipCode ||
                    'N/A'}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-xs text-slate-400 block">Manual order total</span>
                <span className="font-bold text-slate-900">
                  {formatCurrency(viewingCustomer.manualOrderValue)} · {viewingCustomer.manualOrderCount} orders
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-slate-800 text-sm">Manual Order History</h4>
                {viewingCustomer.manualOrders.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setShowAllOrders((showingAll) => !showingAll)}
                    className="text-xs font-semibold text-emerald-700 hover:text-emerald-900"
                  >
                    {showAllOrders ? 'Show less' : `View all (${viewingCustomer.manualOrders.length})`}
                  </button>
                )}
              </div>
              {viewingCustomer.manualOrders.length ? (
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg">
                  {(showAllOrders ? viewingCustomer.manualOrders : viewingCustomer.manualOrders.slice(0, 5)).map((order) => (
                    <div key={order.id || order.orderNumber} className="flex items-center justify-between gap-3 p-3 text-xs">
                      <div>
                        <div className="font-semibold text-slate-800">{order.orderNumber || order.id || 'Manual order'}</div>
                        <div className="text-slate-400">
                          {order.createdAt ? formatDateTime(order.createdAt) : 'Date not set'}
                        </div>
                      </div>
                      <span className="font-bold text-slate-900">{formatCurrency(getOrderValue(order))}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">No linked manual orders found.</p>
              )}
            </div>
          </div>
        )}
      </FormModal>

      <FormModal
        isOpen={Boolean(editingCustomer && editForm)}
        title="Edit Customer"
        subtitle="Update the registered manual customer profile"
        onClose={() => {
          if (!isSaving) {
            setEditingCustomer(null);
            setEditForm(null);
          }
        }}
        onSubmit={handleSaveCustomer}
        submitLabel="Save Customer"
        isSubmitting={isSaving}
        maxWidth="max-w-xl"
      >
        {editForm && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              {editForm.photoUrl ? (
                <img src={editForm.photoUrl} alt="Customer preview" className="w-20 h-20 rounded-full object-cover border border-slate-200" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
              )}
              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  Upload image
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="sr-only" />
                </label>
                {editForm.photoUrl && (
                  <button
                    type="button"
                    onClick={() => setEditForm((previous) => ({ ...previous, photoUrl: '' }))}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-800"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { name: 'name', label: 'Name', required: true },
                { name: 'tamilName', label: 'Tamil Name' },
                { name: 'mobile', label: 'Mobile' },
                { name: 'email', label: 'Email', type: 'email' },
                { name: 'locality', label: 'Locality' },
                { name: 'pincode', label: 'PIN Code' }
              ].map((field) => (
                <label key={field.name} className="space-y-1">
                  <span className="input-label">{field.label}</span>
                  <input
                    type={field.type || 'text'}
                    value={editForm[field.name]}
                    required={field.required}
                    onChange={(event) => setEditForm((previous) => ({ ...previous, [field.name]: event.target.value }))}
                    className="input-text text-xs"
                  />
                </label>
              ))}
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
              <label className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-900">Enable Customer Store Credit</span>
                <input
                  type="checkbox"
                  checked={editForm.creditEnabled}
                  onChange={(event) => setEditForm((previous) => ({ ...previous, creditEnabled: event.target.checked }))}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
              </label>
              {editForm.creditEnabled && (
                <label className="block space-y-1">
                  <span className="input-label">Credit Limit (₹)</span>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={editForm.creditLimit}
                    onChange={(event) => setEditForm((previous) => ({ ...previous, creditLimit: event.target.value }))}
                    className="input-text text-xs"
                  />
                </label>
              )}
            </div>
          </div>
        )}
      </FormModal>

      <FormModal
        isOpen={Boolean(printableCustomer)}
        title="Customer Barcode Card"
        subtitle="Print this customer card with the scannable customer barcode"
        onClose={() => setPrintableCustomer(null)}
        showFooter={false}
        maxWidth="max-w-md"
      >
        {printableCustomer && (
          <>
            <style>{`
              @media print {
                body * { visibility: hidden !important; }
                .manual-customer-print-card,
                .manual-customer-print-card * { visibility: visible !important; }
                .manual-customer-print-card {
                  position: fixed !important;
                  left: 50% !important;
                  top: 50% !important;
                  transform: translate(-50%, -50%) !important;
                  width: 3.5in !important;
                  min-height: 2.5in !important;
                  margin: 0 !important;
                  box-shadow: none !important;
                }
                .manual-customer-print-controls { display: none !important; }
                @page { margin: 0.35in; }
              }
            `}</style>
            <div className="manual-customer-print-card mx-auto w-full max-w-sm rounded-xl border-2 border-slate-800 bg-white p-5 text-center shadow-sm">
              <div className="mb-4 border-b border-slate-200 pb-3">
                <div className="text-xs font-black tracking-widest text-emerald-800">SRI AMMAN STORE</div>
                <div className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Customer Card</div>
              </div>
              <div className="flex items-center justify-center gap-4">
                {getCustomerImage(printableCustomer) ? (
                  <img
                    src={getCustomerImage(printableCustomer)}
                    alt={printableCustomer.name || 'Customer'}
                    className="h-16 w-16 rounded-full border border-slate-200 object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-xl font-bold text-emerald-800">
                    {(printableCustomer.name || 'C').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="text-left">
                  <div className="font-bold text-slate-900">{printableCustomer.name || 'Customer'}</div>
                  <div className="mt-1 text-xs text-slate-500">{getCustomerPhoneCandidates(printableCustomer)[0] || 'No mobile'}</div>
                  <div className="mt-1 font-mono text-xs font-semibold text-slate-700">
                    {printableCustomer.customerId || printableCustomer.id}
                  </div>
                </div>
              </div>
              <div className="mt-3 border-t border-slate-100 pt-2 text-left">
                <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">Address</div>
                <div className="mt-0.5 text-[10px] leading-snug text-slate-700">
                  {getCustomerAddressText(printableCustomer) || 'Address not available'}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-center border-t border-slate-100 pt-3">
                <img src={printableCustomer.barcodeDataUrl} alt="Customer ID Code 128 barcode" className="h-auto max-h-24 max-w-full" />
              </div>
              <div className="manual-customer-print-controls mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                >
                  <Printer className="h-4 w-4" />
                  Print customer card
                </button>
              </div>
            </div>
          </>
        )}
      </FormModal>

      <ConfirmDialog
        isOpen={Boolean(customerToDelete)}
        title="Delete Customer Profile"
        message={`Delete ${customerToDelete?.name || 'this customer'}'s profile? The manual order records will be kept.`}
        confirmText="Delete Customer"
        variant="danger"
        isLoading={isDeleting}
        onCancel={() => !isDeleting && setCustomerToDelete(null)}
        onConfirm={handleDeleteCustomer}
      />
    </div>
  );
};
