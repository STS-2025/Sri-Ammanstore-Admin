import React, { useState, useEffect } from 'react';
import JsBarcode from 'jsbarcode';
import { X, UserPlus, Camera, Upload, CheckCircle2, User, Phone, Mail, MapPin, Calendar, CreditCard, ShieldCheck, Printer } from 'lucide-react';
import { createNewCustomer, generateNextCustomerId, checkDuplicateCustomer, getAllCustomers } from '../../firebase/customerService';
import { getAllOrders } from '../../firebase/orderService';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../hooks/useAuth';

export const NewCustomerModal = ({ isOpen, onClose, onCustomerCreated, autoSelectForBilling = true, availableAreas = [] }) => {
  const notify = useNotification();
  const { userRole, currentUser } = useAuth();

  const [formData, setFormData] = useState({
    customerId: '',
    name: '',
    mobile: '',
    email: '',
    photoUrl: '',
    dob: '',
    gender: '',
    addressLine1: '',
    addressLine2: '',
    area: '',
    city: '',
    district: 'Erode',
    state: 'Tamil Nadu',
    pincode: '641012',
    landmark: '',
    creditEnabled: true,
    creditLimit: 5000
  });

  const [loading, setLoading] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [areas, setAreas] = useState([]);
  const [showAddressDetails, setShowAddressDetails] = useState(false);
  const [barcodePrompt, setBarcodePrompt] = useState(null);
  const [printCustomer, setPrintCustomer] = useState(null);

  useEffect(() => {
    if (!barcodePrompt) return undefined;
    const handlePromptKey = (event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        setBarcodePrompt((current) => ({ ...current, printBarcode: !current.printBarcode }));
      } else if (event.key === 'Enter') {
        event.preventDefault();
        const { selectForBilling, printBarcode } = barcodePrompt;
        setBarcodePrompt(null);
        handleSubmit(event, selectForBilling, printBarcode);
      } else if (event.key === 'Escape') {
        setBarcodePrompt(null);
      }
    };
    window.addEventListener('keydown', handlePromptKey);
    return () => window.removeEventListener('keydown', handlePromptKey);
  }, [barcodePrompt]);

  useEffect(() => {
    if (!printCustomer) return undefined;
    const finishPrint = () => {
      setPrintCustomer(null);
      onClose();
    };
    window.addEventListener('afterprint', finishPrint);
    return () => window.removeEventListener('afterprint', finishPrint);
  }, [printCustomer, onClose]);

  useEffect(() => {
    if (isOpen) {
      // Auto-generate Customer ID preview
      generateNextCustomerId().then((id) => {
        setFormData((prev) => ({ ...prev, customerId: id }));
      });
      Promise.all([getAllCustomers(), getAllOrders({ manualOnly: true })]).then(([customers, manualOrders]) => {
        const uniqueAreas = [...new Set([
          ...availableAreas,
          ...customers.map((customer) => customer.address?.area || customer.area || ''),
          ...manualOrders.map((order) => order.area || order.deliveryAddress?.area || order.deliveryAddress?.locality || '')
        ].map((area) => String(area).trim()).filter(Boolean))]
          .sort((a, b) => a.localeCompare(b));
        setAreas(uniqueAreas);
      }).catch(() => setAreas([]));
      setDuplicateWarning(null);
    }
  }, [isOpen, availableAreas]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    if (name === 'mobile' || name === 'email') {
      setDuplicateWarning(null);
    }
  };

  const handleMobileBlur = async () => {
    if (!formData.mobile || formData.mobile.trim().length < 10) return;
    try {
      const res = await checkDuplicateCustomer({ mobile: formData.mobile });
      if (res.isDuplicate) {
        setDuplicateWarning(`Customer with mobile ${formData.mobile} already exists: ${res.customer.name} (${res.customer.customerId || res.customer.id})`);
      } else {
        setDuplicateWarning(null);
      }
    } catch (_) {}
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        notify.error('Photo too large', 'Please upload an image smaller than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, photoUrl: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const requestSubmit = (e, selectForBilling) => {
    e.preventDefault();
    if (loading || barcodePrompt) return;
    setBarcodePrompt({ selectForBilling, printBarcode: true });
  };

  const handleSubmit = async (e, selectForBilling = autoSelectForBilling, shouldPrintBarcode = false) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      notify.error('Name required', 'Please enter customer name');
      return;
    }
    if (!formData.mobile.trim() || formData.mobile.replace(/\D/g, '').length < 10) {
      notify.error('Mobile required', 'Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    try {
      const created = await createNewCustomer(formData, currentUser || { role: userRole });
      if (shouldPrintBarcode) {
        const customerId = String(created.customerId || created.id || formData.customerId);
        const barcodeCanvas = document.createElement('canvas');
        JsBarcode(barcodeCanvas, customerId, {
          format: 'CODE128', width: 2, height: 64, displayValue: false,
          margin: 4, background: '#ffffff', lineColor: '#0f172a'
        });
        setPrintCustomer({ name: created.name || formData.name, customerId, barcodeDataUrl: barcodeCanvas.toDataURL('image/png') });
        window.setTimeout(() => window.print(), 150);
      }
      if (formData.area.trim() && !areas.some((area) => area.toLowerCase() === formData.area.trim().toLowerCase())) {
        setAreas((prev) => [...prev, formData.area.trim()].sort((a, b) => a.localeCompare(b)));
      }
      notify.success('Customer Registered', `Customer ${created.name} registered with ID ${created.customerId}!`);

      if (onCustomerCreated) {
        onCustomerCreated(created, selectForBilling);
      }
      if (!shouldPrintBarcode) onClose();
    } catch (err) {
      notify.error('Registration Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 text-white border-b border-slate-200 bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 text-white shadow-md rounded-xl bg-emerald-600">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white">Register New Customer</h2>
              <p className="text-xs text-slate-300">Create profile, assign Customer ID & enable store credit</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={(e) => requestSubmit(e, true)} className="flex-1 p-6 space-y-6 overflow-y-auto text-slate-800">
          {duplicateWarning && (
            <div className="flex items-center gap-2 p-3 text-xs font-semibold border bg-amber-50 border-amber-200 rounded-xl text-amber-900">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{duplicateWarning}</span>
            </div>
          )}

          {/* Basic Information */}
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <User className="w-4 h-4 text-emerald-600" />
              <span>Basic Information</span>
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Customer ID (Auto Generated) */}
              <div>
                <label className="block mb-1 text-xs font-bold text-slate-700">Customer ID (Auto Generated)</label>
                <input
                  type="text"
                  name="customerId"
                  value={formData.customerId}
                  readOnly
                  className="w-full px-3 py-2 font-mono text-xs font-bold border cursor-not-allowed bg-slate-100 border-slate-300 rounded-xl text-slate-600 focus:outline-none"
                />
              </div>

              {/* Full Name */}
              <div>
                <label className="block mb-1 text-xs font-bold text-slate-700">
                  Customer Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g. Mari Selvam"
                  required
                  className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block mb-1 text-xs font-bold text-slate-700">
                  Mobile Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">+91</span>
                  <input
                    type="tel"
                    name="mobile"
                    value={formData.mobile}
                    onChange={handleChange}
                    onBlur={handleMobileBlur}
                    placeholder="98765 43210"
                    maxLength="10"
                    required
                    className="w-full py-2 pr-3 font-mono text-xs font-bold bg-white border border-slate-300 rounded-xl pl-11 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 text-xs font-bold text-slate-700">Area / Locality</label>
                <input
                  type="text"
                  name="area"
                  list="customer-area-options"
                  value={formData.area}
                  onChange={handleChange}
                  placeholder="Select or type a new area"
                  autoComplete="off"
                  className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                <datalist id="customer-area-options">
                  {areas.map((area) => <option key={area} value={area} />)}
                </datalist>
              </div>

              <div>
                <label className="block mb-1 text-xs font-bold text-slate-700">Landmark</label>
                <input
                  type="text"
                  name="landmark"
                  value={formData.landmark}
                  onChange={handleChange}
                  placeholder="e.g. Near Bus Stand"
                  className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Photo Upload */}
            <div className="mt-4">
              <label className="block mb-1 text-xs font-bold text-slate-700">Customer Photo</label>
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center overflow-hidden border w-14 h-14 rounded-2xl bg-slate-100 border-slate-200 shrink-0">
                  {formData.photoUrl ? (
                    <img src={formData.photoUrl} alt="Preview" className="object-cover w-full h-full" />
                  ) : (
                    <User className="w-6 h-6 text-slate-400" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <label className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Photo</span>
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </label>
                  {formData.photoUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, photoUrl: '' }))}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setShowAddressDetails((shown) => !shown)}
              aria-expanded={showAddressDetails}
              className="px-4 py-2 text-xs font-bold transition-colors border text-emerald-700 border-emerald-200 rounded-xl bg-emerald-50 hover:bg-emerald-100"
            >
              {showAddressDetails ? 'Less Details' : 'More Details'}
            </button>
          </div>

          {/* Address Details */}
          {showAddressDetails && <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>Address Details</span>
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Email Address */}
              <div>
                <label className="block mb-1 text-xs font-bold text-slate-700">Email Address (Optional)</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="e.g. mari@example.com"
                  className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block mb-1 text-xs font-bold text-slate-700">Date of Birth (Optional)</label>
                <input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              {/* Gender */}
              <div>
                <label className="block mb-1 text-xs font-bold text-slate-700">Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              
              <div className="sm:col-span-2">
                <label className="block mb-1 text-xs font-bold text-slate-700">Address Line 1</label>
                <input
                  type="text"
                  name="addressLine1"
                  value={formData.addressLine1}
                  onChange={handleChange}
                  placeholder="Door / Flat No, Street Name"
                  className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block mb-1 text-xs font-bold text-slate-700">City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs font-semibold bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block mb-1 text-xs font-bold text-slate-700">PIN Code</label>
                <input
                  type="text"
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  className="w-full px-3 py-2 font-mono text-xs font-bold bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>
          </div>}

          {/* Store Credit Settings */}
          <div className="p-4 space-y-3 border bg-emerald-50/50 border-emerald-200 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-bold text-slate-900">Enable Customer Store Credit</span>
              </div>
              <input
                type="checkbox"
                name="creditEnabled"
                checked={!!formData.creditEnabled}
                onChange={handleChange}
                className="w-4 h-4 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500"
              />
            </div>

            {formData.creditEnabled && (
              <div>
                <label className="block mb-1 text-xs font-bold text-slate-700">Initial Credit Limit (₹)</label>
                <input
                  type="number"
                  name="creditLimit"
                  value={formData.creditLimit}
                  onChange={handleChange}
                  min="0"
                  step="500"
                  className="w-full px-3 py-2 font-mono text-xs font-bold bg-white border border-slate-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            )}
          </div>
        </form>

        {barcodePrompt && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="barcode-prompt-title">
            <div className="w-full max-w-sm p-6 text-center bg-white shadow-2xl rounded-2xl">
              <h3 id="barcode-prompt-title" className="text-base font-bold text-slate-900">Would you like to print a barcode for this customer?</h3>
              <div className="flex justify-center gap-3 mt-5">
                {[true, false].map((printBarcode) => (
                  <button
                    key={String(printBarcode)}
                    type="button"
                    aria-pressed={barcodePrompt.printBarcode === printBarcode}
                    onClick={() => setBarcodePrompt((current) => ({ ...current, printBarcode }))}
                    className={`rounded-xl border px-6 py-2 text-sm font-bold ${barcodePrompt.printBarcode === printBarcode ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-slate-300 text-slate-700'}`}
                  >{printBarcode ? 'Yes' : 'No'}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {printCustomer && (
          <>
            <style>{`@media print { @page { size: 3.5in 2.1in; margin: 0; } html, body { width: 3.5in !important; height: 2.1in !important; margin: 0 !important; padding: 0 !important; overflow: hidden !important; } body * { visibility: hidden !important; } .customer-barcode-sticker, .customer-barcode-sticker * { visibility: visible !important; } .customer-barcode-sticker { position: fixed !important; left: 0 !important; top: 0 !important; width: 3.5in !important; height: 2.1in !important; box-sizing: border-box !important; margin: 0 !important; padding: 0.18in !important; border: 0 !important; overflow: hidden !important; break-after: avoid-page !important; page-break-after: avoid !important; transform: none !important; } }`}</style>
            <div className="customer-barcode-sticker fixed left-[-10000px] top-0 w-[2.8in] rounded border border-slate-300 bg-white p-3 text-center print:border-0 print:p-2">
              <div className="text-sm font-bold truncate text-slate-900">{printCustomer.name}</div>
              <img className="mx-auto mt-1 h-[0.55in] w-full object-contain" src={printCustomer.barcodeDataUrl} alt={`Barcode for ${printCustomer.customerId}`} />
              <div className="mt-1 font-mono text-xs font-semibold tracking-wide text-slate-900">{printCustomer.customerId}</div>
            </div>
          </>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-xs btn-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={(e) => requestSubmit(e, false)}
            disabled={loading}
            className="px-4 py-2 text-xs font-bold text-white transition-colors shadow-sm bg-slate-800 hover:bg-slate-700 rounded-xl"
          >
            Save Customer Only
          </button>
          <button
            type="button"
            onClick={(e) => requestSubmit(e, true)}
            disabled={loading}
            className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 shadow-md"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Save & Select for Billing</span>
          </button>
        </div>
      </div>
    </div>
  );
};
