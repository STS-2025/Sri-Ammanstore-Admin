import React, { useState } from 'react';
import { X, Send, Users, MessageSquare, Smartphone, Bell, Calendar, Sparkles } from 'lucide-react';

export const CampaignModal = ({ isOpen, onClose, onSendCampaign, customers = [] }) => {
  const [formData, setFormData] = useState({
    title: '',
    channel: 'whatsapp', // 'whatsapp' | 'sms' | 'push'
    segment: 'All Customers',
    templateText: 'Vanakkam {Customer Name}! Sri Amman Store fresh stock of cooking powders and oils has arrived. Enjoy exclusive savings: {Tracking Link}',
    scheduleMode: 'instant', // 'instant' | 'scheduled'
    scheduledDate: new Date().toISOString().slice(0, 10),
    scheduledTime: '09:00'
  });

  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  // Calculate target audience based on segment
  const getEstimatedAudienceCount = (seg) => {
    const total = customers.length || 104;
    switch (seg) {
      case 'All Customers':
        return total;
      case 'New Customers':
        return Math.floor(total * 0.25);
      case 'Top Customers':
        return Math.floor(total * 0.15);
      case 'Inactive 30 Days':
        return Math.floor(total * 0.2);
      case 'Inactive 60 Days':
        return Math.floor(total * 0.1);
      case 'Birthday This Month':
        return Math.floor(total * 0.08);
      case 'Coimbatore Central Zone':
        return Math.floor(total * 0.6);
      default:
        return Math.floor(total * 0.5);
    }
  };

  const audienceCount = getEstimatedAudienceCount(formData.segment);

  const insertVariable = (variable) => {
    setFormData(prev => ({
      ...prev,
      templateText: prev.templateText + ' ' + variable
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setErrors({ title: 'Campaign title is required' });
      return;
    }

    const payload = {
      title: formData.title,
      channel: formData.channel,
      segment: formData.segment,
      targetCount: audienceCount,
      templateText: formData.templateText,
      scheduledAt: formData.scheduleMode === 'scheduled'
        ? `${formData.scheduledDate}T${formData.scheduledTime}:00Z`
        : null
    };

    onSendCampaign(payload);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">New Marketing Broadcast Campaign</h3>
              <p className="text-xs text-slate-400">Target customer segments via WhatsApp, SMS & Push</p>
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
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Campaign Name / Subject *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Festival Spice Specials Weekend Broadcast"
              className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
            {errors.title && <p className="text-[11px] text-rose-600 mt-1">{errors.title}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Communication Channel
              </label>
              <select
                value={formData.channel}
                onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none bg-white font-medium"
              >
                <option value="whatsapp">📱 WhatsApp Message</option>
                <option value="sms">💬 Transactional SMS</option>
                <option value="push">🔔 Mobile Push Notification</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Target Audience Segment
              </label>
              <select
                value={formData.segment}
                onChange={(e) => setFormData({ ...formData, segment: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none bg-white font-medium"
              >
                <option value="All Customers">All Registered Customers</option>
                <option value="Top Customers">VIP / High Spenders</option>
                <option value="New Customers">New Customers (First 30 Days)</option>
                <option value="Inactive 30 Days">Inactive 30 Days</option>
                <option value="Inactive 60 Days">Inactive 60 Days</option>
                <option value="Birthday This Month">Birthday Celebrants</option>
                <option value="Coimbatore Central Zone">Coimbatore Central PINs</option>
              </select>
            </div>
          </div>

          {/* Audience Counter Badge */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <span className="text-xs text-slate-600">Selected Segment Reach:</span>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
              ~{audienceCount} Customers
            </span>
          </div>

          {/* Message Template & Variables */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Message Content
              </label>
              <span className="text-[10px] text-slate-400">Click variable chip to insert</span>
            </div>

            {/* Variable Insertion Chips */}
            <div className="flex flex-wrap gap-1.5 mb-2">
              {['{Customer Name}', '{Tracking Link}', '{Order ID}', '{Amount}'].map(v => (
                <button
                  key={v}
                  type="button"
                  onClick={() => insertVariable(v)}
                  className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 transition-colors"
                >
                  +{v}
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              value={formData.templateText}
              onChange={(e) => setFormData({ ...formData, templateText: e.target.value })}
              className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Dispatch Mode */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Dispatch Schedule
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer text-xs font-semibold ${
                formData.scheduleMode === 'instant' ? 'border-emerald-500 bg-emerald-50 text-emerald-950' : 'border-slate-200'
              }`}>
                <input
                  type="radio"
                  name="scheduleMode"
                  checked={formData.scheduleMode === 'instant'}
                  onChange={() => setFormData({ ...formData, scheduleMode: 'instant' })}
                  className="text-emerald-600"
                />
                <span>Instant Broadcast Now</span>
              </label>

              <label className={`p-3 rounded-xl border flex items-center gap-2.5 cursor-pointer text-xs font-semibold ${
                formData.scheduleMode === 'scheduled' ? 'border-emerald-500 bg-emerald-50 text-emerald-950' : 'border-slate-200'
              }`}>
                <input
                  type="radio"
                  name="scheduleMode"
                  checked={formData.scheduleMode === 'scheduled'}
                  onChange={() => setFormData({ ...formData, scheduleMode: 'scheduled' })}
                  className="text-emerald-600"
                />
                <span>Schedule for Later</span>
              </label>
            </div>
          </div>

          {formData.scheduleMode === 'scheduled' && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <input
                type="date"
                value={formData.scheduledDate}
                onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 outline-none"
              />
              <input
                type="time"
                value={formData.scheduledTime}
                onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 outline-none"
              />
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              {formData.scheduleMode === 'instant' ? 'Launch Broadcast' : 'Schedule Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
