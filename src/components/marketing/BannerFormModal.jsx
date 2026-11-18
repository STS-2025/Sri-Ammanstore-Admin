import React, { useEffect, useState } from 'react';
import { X, Image as ImageIcon, Eye, Palette, SlidersHorizontal, Check } from 'lucide-react';
import { ImageUploader } from '../common/ImageUploader';

const today = () => new Date().toISOString().slice(0, 10);
const defaults = () => ({
  title: '', tamilTitle: '', subheading: '', tamilSubheading: '', shortDescription: '', tamilShortDescription: '',
  desktopImageUrl: '', mobileImageUrl: '', videoUrl: '', redirectUrl: '/products', placement: 'homepage_slider',
  priority: 1, status: 'active', startDate: today(), endDate: '2026-12-31',
  textAlignment: 'left', verticalAlignment: 'center', textPosition: 'left',
  headingColor: '#ffffff', subheadingColor: '#ffffff', buttonTextColor: '#ffffff',
  buttonBackgroundColor: '#059669', bannerBackgroundColor: '#0f172a',
  imageOverlayEnabled: true, overlayColor: 'black', customOverlayColor: '#000000',
  overlayOpacity: 45, headingFontSize: 38, subheadingFontSize: 20, contentMaxWidth: 560,
});

const inputClass = 'w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none bg-white';
const labelClass = 'block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-1';
const tabs = [
  { id: 'content', label: 'Banner Content', icon: ImageIcon },
  { id: 'images', label: 'Images', icon: ImageIcon },
  { id: 'design', label: 'Content Design', icon: Palette },
  { id: 'publishing', label: 'Publishing', icon: SlidersHorizontal },
];

export const BannerFormModal = ({ isOpen, onClose, onSave, banner = null, onPreviewRequest = null }) => {
  const [formData, setFormData] = useState(defaults);
  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState('content');

  useEffect(() => {
    if (!isOpen) return;
    setFormData(banner ? { ...defaults(), ...banner } : {
      ...defaults(),
      desktopImageUrl: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1200&q=80',
      mobileImageUrl: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=600&q=80',
    });
    setErrors({});
    setActiveTab('content');
  }, [banner, isOpen]);

  const setField = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validate = () => {
    const next = {};
    if (!formData.title.trim()) next.title = 'Banner title is required';
    if (!formData.desktopImageUrl.trim()) next.desktopImageUrl = 'Desktop image is required';
    if (formData.endDate < formData.startDate) next.endDate = 'End date must be on or after start date';
    setErrors(next);
    if (next.title) setActiveTab('content');
    else if (next.desktopImageUrl) setActiveTab('images');
    else if (next.endDate) setActiveTab('publishing');
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validate()) return;
    onSave({
      ...formData,
      title: formData.title.trim(),
      tamilTitle: formData.tamilTitle.trim(),
      subheading: formData.subheading.trim(),
      tamilSubheading: formData.tamilSubheading.trim(),
      shortDescription: formData.shortDescription.trim(),
      tamilShortDescription: formData.tamilShortDescription.trim(),
      priority: Number(formData.priority) || 1,
      overlayOpacity: Math.max(0, Math.min(100, Number(formData.overlayOpacity) || 0)),
      headingFontSize: Number(formData.headingFontSize) || 38,
      subheadingFontSize: Number(formData.subheadingFontSize) || 20,
      contentMaxWidth: Number(formData.contentMaxWidth) || 560,
    });
  };

  if (!isOpen) return null;
  const errorText = (name) => errors[name] && <p className="text-[11px] text-rose-600 mt-1">{errors[name]}</p>;
  const Field = ({ label, name, type = 'text', ...props }) => <div><label className={labelClass}>{label}</label><input type={type} value={formData[name] ?? ''} onChange={(e) => setField(name, type === 'number' ? Number(e.target.value) : e.target.value)} className={inputClass} {...props} />{errorText(name)}</div>;
  const Select = ({ label, name, children }) => <div><label className={labelClass}>{label}</label><select value={formData[name]} onChange={(e) => setField(name, e.target.value)} className={inputClass}>{children}</select></div>;
  const colorFields = [['headingColor', 'Heading Color'], ['subheadingColor', 'Subheading Color'], ['buttonTextColor', 'Button Text Color'], ['buttonBackgroundColor', 'Button Background Color'], ['bannerBackgroundColor', 'Banner Background Color']];

  return <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true">
    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[calc(100vh-2rem)] overflow-hidden border border-slate-200">
      <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center"><ImageIcon className="w-5 h-5" /></div><div><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">Homepage Banner</p><h3 className="text-base font-bold">{banner ? 'Edit Promotional Banner' : 'Create Promotional Banner'}</h3></div></div>
        <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"><X className="w-5 h-5" /></button>
      </div>
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {tabs.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setActiveTab(id)} className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-[11px] font-bold transition-colors ${activeTab === id ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:bg-white hover:text-slate-800'}`}><Icon className="h-3.5 w-3.5" />{label}{(id === 'content' && errors.title) || (id === 'images' && errors.desktopImageUrl) || (id === 'publishing' && errors.endDate) ? <span className="h-1.5 w-1.5 rounded-full bg-rose-400" /> : null}</button>)}
        </div>
      </div>
      <form onSubmit={handleSubmit} className="p-6">
        {activeTab === 'content' && <section className="space-y-4"><div><h4 className="text-sm font-bold text-slate-900">Banner Content</h4><p className="text-xs text-slate-500 mt-1">Add bilingual copy for the homepage hero banner.</p></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Field label="Banner Heading – English *" name="title" placeholder="Festival Cooking Specials" /> <Field label="Banner Heading – Tamil" name="tamilTitle" placeholder="பண்டிகை கால சிறப்பு தள்ளுபடி" /><Field label="Banner Subheading – English" name="subheading" placeholder="Fresh ingredients for every kitchen" /><Field label="Banner Subheading – Tamil" name="tamilSubheading" placeholder="ஒவ்வொரு சமையலறைக்கும் தரமான பொருட்கள்" /></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div><label className={labelClass}>Short Description – English</label><textarea rows={4} value={formData.shortDescription} onChange={(e) => setField('shortDescription', e.target.value)} className={inputClass} placeholder="Tell customers what makes this offer special." /></div><div><label className={labelClass}>Short Description – Tamil</label><textarea rows={4} value={formData.tamilShortDescription} onChange={(e) => setField('tamilShortDescription', e.target.value)} className={inputClass} placeholder="இந்த சலுகையின் சிறப்பை சுருக்கமாக எழுதுங்கள்." /></div></div></section>}
        {activeTab === 'images' && <section className="space-y-4"><div><h4 className="text-sm font-bold text-slate-900">Banner Images</h4><p className="text-xs text-slate-500 mt-1">Upload JPG, JPEG, PNG, or WebP images.</p></div><div className="grid grid-cols-1 gap-5 md:grid-cols-2"><ImageUploader label="Desktop Image (1200 × 400)" value={formData.desktopImageUrl} maxSizeMB={5} aspectRatio="3:1" onChange={({ previewUrl }) => setField('desktopImageUrl', previewUrl)} onRemove={() => setField('desktopImageUrl', '')} /><ImageUploader label="Mobile Image (600 × 400)" value={formData.mobileImageUrl} maxSizeMB={5} aspectRatio="3:2" onChange={({ previewUrl }) => setField('mobileImageUrl', previewUrl)} onRemove={() => setField('mobileImageUrl', '')} /></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Field label="Desktop Image URL (optional)" name="desktopImageUrl" placeholder="Or paste an image URL" /> <Field label="Mobile Image URL (optional)" name="mobileImageUrl" placeholder="Or paste an image URL" /></div></section>}
        {activeTab === 'design' && <section className="space-y-4"><div><h4 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Palette className="w-4 h-4 text-emerald-600" />Banner Content Design</h4><p className="text-xs text-slate-500 mt-1">Customize alignment, typography, colors, and image overlay.</p></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-3"><Select label="Text Alignment" name="textAlignment"><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></Select><Select label="Vertical Alignment" name="verticalAlignment"><option value="top">Top</option><option value="center">Center</option><option value="bottom">Bottom</option></Select><Select label="Text Position" name="textPosition"><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></Select></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{colorFields.map(([name, label]) => <div key={name}><label className={labelClass}>{label}</label><div className="flex items-center gap-2"><input type="color" value={formData[name]} onChange={(e) => setField(name, e.target.value)} className="h-9 w-12 rounded border border-slate-300 p-1" /><input type="text" value={formData[name]} onChange={(e) => setField(name, e.target.value)} className={inputClass} /></div></div>)}</div><div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4"><div className="flex items-center justify-between"><div><p className="text-xs font-bold text-slate-800">Image Overlay</p><p className="text-[11px] text-slate-500">Improve text readability over the banner image.</p></div><button type="button" onClick={() => setField('imageOverlayEnabled', !formData.imageOverlayEnabled)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${formData.imageOverlayEnabled ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>{formData.imageOverlayEnabled ? 'Enabled' : 'Disabled'}</button></div>{formData.imageOverlayEnabled && <div className="grid grid-cols-1 gap-4 sm:grid-cols-3"><Select label="Overlay Color" name="overlayColor"><option value="black">Black</option><option value="white">White</option><option value="custom">Custom</option></Select>{formData.overlayColor === 'custom' && <Field label="Custom Overlay Color" name="customOverlayColor" type="color" />}<Field label="Overlay Opacity (0–100%)" name="overlayOpacity" type="number" min="0" max="100" /></div>}</div><div className="grid grid-cols-1 gap-4 sm:grid-cols-3"><Field label="Heading Font Size (px)" name="headingFontSize" type="number" min="12" max="96" /><Field label="Subheading Font Size (px)" name="subheadingFontSize" type="number" min="10" max="48" /><Field label="Content Maximum Width (px)" name="contentMaxWidth" type="number" min="240" max="1200" /></div></section>}
        {activeTab === 'publishing' && <section className="space-y-4"><div><h4 className="text-sm font-bold text-slate-900">Publishing Settings</h4><p className="text-xs text-slate-500 mt-1">Choose placement, status, destination, and schedule.</p></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-3"><Select label="Placement Location" name="placement"><option value="homepage_slider">Homepage Top Carousel</option><option value="mid_page">Mid-Page Featured Strip</option><option value="category_page">Category Header Banner</option><option value="offer_wall">Exclusive Offer Wall</option><option value="popup">Entry Modal Popup</option></Select><Field label="Display Priority" name="priority" type="number" min="1" max="99" /><Select label="Status" name="status"><option value="active">Active / Published</option><option value="draft">Draft</option><option value="scheduled">Scheduled</option><option value="paused">Paused</option></Select></div><div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><Field label="Redirect Link / Action" name="redirectUrl" placeholder="/products?category=cat-spices" /><Field label="Video URL (optional)" name="videoUrl" placeholder="https://..." /><Field label="Schedule Start Date" name="startDate" type="date" /><Field label="Schedule End Date" name="endDate" type="date" /></div>{errorText('endDate')}</section>}
        <div className="mt-6 flex flex-col-reverse items-stretch justify-between gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center"><p className="text-[11px] text-slate-500"><Check className="mr-1 inline h-3.5 w-3.5 text-emerald-600" />Changes are saved when you publish.</p><div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">Cancel</button>{onPreviewRequest && <button type="button" onClick={() => onPreviewRequest(formData)} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"><Eye className="h-4 w-4" />Preview</button>}<button type="submit" className="rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700">{banner ? 'Update Banner' : 'Publish Banner'}</button></div></div>
      </form>
    </div>
  </div>;
};
