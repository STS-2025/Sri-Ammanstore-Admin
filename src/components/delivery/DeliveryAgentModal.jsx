import React, { useState, useEffect } from 'react';
import { X, User, Phone, Truck, ShieldCheck, MapPin, Award } from 'lucide-react';

export const DeliveryAgentModal = ({ isOpen, onClose, onSave, agent = null }) => {
  const [formData, setFormData] = useState({
    name: '',
    tamilName: '',
    mobile: '',
    photo: '',
    address: '',
    vehicle: 'Electric Two-Wheeler (Ather 450X)',
    vehicleNumber: '',
    licenseNumber: '',
    status: 'available',
    activeLocation: 'Gandhipuram Dispatch Hub'
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (agent) {
      setFormData({
        name: agent.name || '',
        tamilName: agent.tamilName || '',
        mobile: agent.mobile || '',
        photo: agent.photo || '',
        address: agent.address || '',
        vehicle: agent.vehicle || 'Electric Two-Wheeler',
        vehicleNumber: agent.vehicleNumber || '',
        licenseNumber: agent.licenseNumber || '',
        status: agent.status || 'available',
        activeLocation: agent.activeLocation || 'Gandhipuram Dispatch Hub'
      });
    } else {
      setFormData({
        name: '',
        tamilName: '',
        mobile: '',
        photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        address: '',
        vehicle: 'Electric Two-Wheeler (Ather 450X)',
        vehicleNumber: '',
        licenseNumber: '',
        status: 'available',
        activeLocation: 'Gandhipuram Dispatch Hub'
      });
    }
    setErrors({});
  }, [agent, isOpen]);

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Agent name is required';
    if (!formData.mobile.trim()) errs.mobile = 'Mobile number is required';
    if (!formData.vehicleNumber.trim()) errs.vehicleNumber = 'Vehicle number (e.g. TN 38 BZ 4040) is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold">
                {agent ? 'Edit Delivery Fleet Rider' : 'Add New Delivery Fleet Rider'}
              </h3>
              <p className="text-xs text-slate-400">Sri Amman Store Logistics Partner</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Full Name (English) *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Saravanan Muthusamy"
                className={`w-full px-3.5 py-2 text-sm rounded-lg border ${errors.name ? 'border-rose-500 bg-rose-50' : 'border-slate-300'} focus:ring-2 focus:ring-emerald-500 outline-none`}
              />
              {errors.name && <p className="text-xs text-rose-600 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Name in Tamil (தமிழ் பெயர்)
              </label>
              <input
                type="text"
                value={formData.tamilName}
                onChange={(e) => setFormData({ ...formData, tamilName: e.target.value })}
                placeholder="எ.கா. சரவணன் முத்துசாமி"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Mobile Number *
              </label>
              <input
                type="tel"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                placeholder="+91 94440 56789"
                className={`w-full px-3.5 py-2 text-sm rounded-lg border ${errors.mobile ? 'border-rose-500 bg-rose-50' : 'border-slate-300'} focus:ring-2 focus:ring-emerald-500 outline-none`}
              />
              {errors.mobile && <p className="text-xs text-rose-600 mt-1">{errors.mobile}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Duty Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
              >
                <option value="available">🟢 Available (At Hub)</option>
                <option value="on_delivery">🔵 On Delivery (En Route)</option>
                <option value="off_duty">⚪ Off Duty (Not Available)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Vehicle Type
              </label>
              <select
                value={formData.vehicle}
                onChange={(e) => setFormData({ ...formData, vehicle: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none bg-white"
              >
                <option value="Electric Two-Wheeler (Ather 450X)">Electric Two-Wheeler (Ather / Ola)</option>
                <option value="Cargo Scooter (Hero Electric)">Cargo Scooter with Rear Rack</option>
                <option value="Motorcycle (125cc-150cc)">Standard Motorcycle</option>
                <option value="Piaggio Ape Cargo Auto (Heavy Loads)">Cargo Auto 3-Wheeler (Heavy 150kg+)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Vehicle Plate Number *
              </label>
              <input
                type="text"
                value={formData.vehicleNumber}
                onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value.toUpperCase() })}
                placeholder="TN 38 BZ 4040"
                className={`w-full px-3.5 py-2 text-sm rounded-lg border ${errors.vehicleNumber ? 'border-rose-500 bg-rose-50' : 'border-slate-300'} focus:ring-2 focus:ring-emerald-500 outline-none uppercase`}
              />
              {errors.vehicleNumber && <p className="text-xs text-rose-600 mt-1">{errors.vehicleNumber}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Driving License Number
              </label>
              <input
                type="text"
                value={formData.licenseNumber}
                onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value.toUpperCase() })}
                placeholder="TN3820180004921"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Current Hub / Location
              </label>
              <input
                type="text"
                value={formData.activeLocation}
                onChange={(e) => setFormData({ ...formData, activeLocation: e.target.value })}
                placeholder="Gandhipuram Dispatch Hub"
                className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Residential Address (Coimbatore)
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="e.g. 12, Raja Street, Town Hall, Coimbatore"
              className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
            >
              {agent ? 'Save Changes' : 'Register Rider'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
