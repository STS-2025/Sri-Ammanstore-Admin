import React, { useState, useEffect, useMemo } from 'react';
import { 
  Image as ImageIcon, Megaphone, Send, Bell, Plus, Eye, 
  ExternalLink, Trash2, Edit3, CheckCircle2, AlertCircle, RefreshCw,
  Smartphone, Monitor, Tablet, Layers, ArrowUp, ArrowDown
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { 
  getAllBanners, 
  createBanner, 
  updateBanner, 
  deleteBanner,
  getAllAnnouncements,
  saveAnnouncement,
  getAllCampaigns,
  createAndSendCampaign,
  getNotificationTemplates,
  updateNotificationTemplate
} from '../../firebase/marketingService';
import { getAllCustomers } from '../../firebase/customerService';
import { BannerFormModal } from '../../components/marketing/BannerFormModal';
import { BannerPreviewModal } from '../../components/marketing/BannerPreviewModal';
import { AnnouncementModal } from '../../components/marketing/AnnouncementModal';
import { CampaignModal } from '../../components/marketing/CampaignModal';

export const MarketingPage = () => {
  const { currentUser } = useAuth();

  const [banners, setBanners] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active Tab: 'banners' | 'announcements' | 'campaigns' | 'templates'
  const [activeTab, setActiveTab] = useState('banners');

  // Modals
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [selectedBannerForEdit, setSelectedBannerForEdit] = useState(null);
  const [previewBanner, setPreviewBanner] = useState(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [selectedAnnouncementForEdit, setSelectedAnnouncementForEdit] = useState(null);

  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);

  const loadAllMarketingData = async () => {
    setLoading(true);
    try {
      const [fetchedBanners, fetchedAnnouncements, fetchedCampaigns, fetchedCustomers] = await Promise.all([
        getAllBanners(),
        getAllAnnouncements(),
        getAllCampaigns(),
        getAllCustomers()
      ]);
      setBanners(fetchedBanners);
      setAnnouncements(fetchedAnnouncements);
      setCampaigns(fetchedCampaigns);
      setCustomers(fetchedCustomers);
      setTemplates(getNotificationTemplates());
    } catch (err) {
      console.error('Error loading marketing data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllMarketingData();
  }, []);

  // Banner Actions
  const handleSaveBanner = async (formData) => {
    try {
      if (selectedBannerForEdit) {
        await updateBanner(selectedBannerForEdit.id, formData, currentUser);
      } else {
        await createBanner(formData, currentUser);
      }
      setIsBannerModalOpen(false);
      setSelectedBannerForEdit(null);
      await loadAllMarketingData();
    } catch (err) {
      alert(`Error saving banner: ${err.message}`);
    }
  };

  const handleDeleteBanner = async (bannerId) => {
    if (!window.confirm('Are you sure you want to delete this promotional banner?')) return;
    try {
      await deleteBanner(bannerId, currentUser);
      await loadAllMarketingData();
    } catch (err) {
      alert(`Error deleting banner: ${err.message}`);
    }
  };

  const handleToggleBannerStatus = async (banner) => {
    const nextStatus = banner.status === 'active' ? 'paused' : 'active';
    try {
      await updateBanner(banner.id, { status: nextStatus }, currentUser);
      await loadAllMarketingData();
    } catch (err) {
      alert(`Error toggling banner: ${err.message}`);
    }
  };

  const handleOpenPreview = (banner) => {
    setPreviewBanner(banner);
    setIsPreviewModalOpen(true);
  };

  // Announcement Actions
  const handleSaveAnnouncement = async (formData) => {
    try {
      await saveAnnouncement(formData, currentUser);
      setIsAnnouncementModalOpen(false);
      setSelectedAnnouncementForEdit(null);
      await loadAllMarketingData();
    } catch (err) {
      alert(`Error saving announcement: ${err.message}`);
    }
  };

  const handleToggleAnnouncementActive = async (ann) => {
    try {
      await saveAnnouncement({ ...ann, isActive: !ann.isActive }, currentUser);
      await loadAllMarketingData();
    } catch (err) {
      alert(`Error updating announcement: ${err.message}`);
    }
  };

  // Campaign Actions
  const handleSendCampaign = async (campaignData) => {
    try {
      await createAndSendCampaign(campaignData, currentUser);
      setIsCampaignModalOpen(false);
      await loadAllMarketingData();
    } catch (err) {
      alert(`Error launching campaign: ${err.message}`);
    }
  };

  // Metrics
  const campaignMetrics = useMemo(() => {
    const totalSent = campaigns.reduce((sum, c) => sum + (c.sentCount || 0), 0);
    const totalDelivered = campaigns.reduce((sum, c) => sum + (c.deliveredCount || 0), 0);
    const totalRead = campaigns.reduce((sum, c) => sum + (c.readCount || 0), 0);
    const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0;
    const readRate = totalDelivered > 0 ? Math.round((totalRead / totalDelivered) * 100) : 0;

    return {
      totalCampaigns: campaigns.length,
      totalSent,
      deliveryRate,
      readRate
    };
  }, [campaigns]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Marketing & Campaigns Hub</h1>
          <p className="text-sm text-slate-500">
            Homepage hero banners, live ticker announcement bars, and customer broadcast campaigns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'banners' && (
            <button
              type="button"
              onClick={() => {
                setSelectedBannerForEdit(null);
                setIsBannerModalOpen(true);
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add Banner Creative
            </button>
          )}

          {activeTab === 'announcements' && (
            <button
              type="button"
              onClick={() => {
                setSelectedAnnouncementForEdit(null);
                setIsAnnouncementModalOpen(true);
              }}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add Announcement
            </button>
          )}

          {activeTab === 'campaigns' && (
            <button
              type="button"
              onClick={() => setIsCampaignModalOpen(true)}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              New Broadcast Campaign
            </button>
          )}

          <button
            onClick={loadAllMarketingData}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-white border border-slate-200 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('banners')}
          className={`pb-3 px-4 text-xs font-bold transition-all ${
            activeTab === 'banners'
              ? 'text-emerald-700 border-b-2 border-emerald-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Homepage Banners ({banners.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('announcements')}
          className={`pb-3 px-4 text-xs font-bold transition-all ${
            activeTab === 'announcements'
              ? 'text-emerald-700 border-b-2 border-emerald-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Scrolling Announcement Bar ({announcements.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('campaigns')}
          className={`pb-3 px-4 text-xs font-bold transition-all ${
            activeTab === 'campaigns'
              ? 'text-emerald-700 border-b-2 border-emerald-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Broadcast Campaigns ({campaigns.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('templates')}
          className={`pb-3 px-4 text-xs font-bold transition-all ${
            activeTab === 'templates'
              ? 'text-emerald-700 border-b-2 border-emerald-600'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Notification Templates ({templates.length})
        </button>
      </div>

      {/* TAB 1: Banners & Creatives */}
      {activeTab === 'banners' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {banners.map(banner => (
              <div
                key={banner.id}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Banner Image Preview Header */}
                  <div className="relative h-44 bg-slate-100 overflow-hidden group">
                    <img
                      src={banner.desktopImageUrl}
                      alt={banner.title}
                      className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                    />
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900/80 text-white backdrop-blur-xs uppercase">
                        {banner.placement.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white text-slate-800 shadow-xs">
                        Priority #{banner.priority}
                      </span>
                    </div>

                    <div className="absolute top-2.5 right-2.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        banner.status === 'active' ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-white'
                      }`}>
                        {banner.status}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenPreview(banner)}
                      className="absolute bottom-2.5 right-2.5 px-2.5 py-1 bg-slate-900/80 hover:bg-slate-900 text-white text-[11px] font-bold rounded-lg backdrop-blur-xs flex items-center gap-1 shadow-md transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Preview Devices
                    </button>
                  </div>

                  {/* Banner Details Body */}
                  <div className="p-4 space-y-2">
                    <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{banner.title}</h3>
                    {banner.tamilTitle && (
                      <p className="text-xs text-slate-500 font-medium line-clamp-1">{banner.tamilTitle}</p>
                    )}

                    <div className="text-xs text-slate-500 space-y-1 pt-1">
                      <div className="flex justify-between">
                        <span>Target Link:</span>
                        <span className="font-semibold text-slate-700 truncate max-w-[180px]">{banner.redirectUrl}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Schedule:</span>
                        <span className="text-slate-600">{banner.startDate} to {banner.endDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>User Clicks:</span>
                        <span className="font-bold text-emerald-700">{banner.clicks || 0} clicks</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => handleToggleBannerStatus(banner)}
                    className={`font-semibold ${banner.status === 'active' ? 'text-amber-700 hover:text-amber-800' : 'text-emerald-700 hover:text-emerald-800'}`}
                  >
                    {banner.status === 'active' ? 'Pause Banner' : 'Activate'}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBannerForEdit(banner);
                        setIsBannerModalOpen(true);
                      }}
                      className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
                      title="Edit Creative"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteBanner(banner.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete Banner"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Scrolling Announcement Bar */}
      {activeTab === 'announcements' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Storewide Header Announcement Bars</h3>
              <p className="text-xs text-slate-500">Notice messages scrolling across top of customer store during festive offers and delivery updates.</p>
            </div>

            <div className="space-y-4">
              {announcements.map(ann => (
                <div key={ann.id} className="border border-slate-200 rounded-xl p-4 space-y-3 bg-white">
                  {/* Live Render Strip */}
                  <div
                    className="p-3 rounded-lg font-medium text-xs flex items-center justify-between shadow-xs"
                    style={{ backgroundColor: ann.bgColor, color: ann.textColor }}
                  >
                    <span className="truncate max-w-[80%]">{ann.text}</span>
                    <span className="text-[10px] opacity-80">{ann.speedSeconds}s scroll</span>
                  </div>

                  {ann.tamilText && (
                    <p className="text-xs text-slate-600 font-medium">தமிழ்: {ann.tamilText}</p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-4 text-slate-500">
                      <span>Link: <strong className="text-slate-800">{ann.linkUrl}</strong></span>
                      <span>Schedule: <strong className="text-slate-800">{ann.startDate} to {ann.endDate}</strong></span>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleToggleAnnouncementActive(ann)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                          ann.isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {ann.isActive ? 'Active on Web' : 'Hidden'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAnnouncementForEdit(ann);
                          setIsAnnouncementModalOpen(true);
                        }}
                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                      >
                        Edit Style
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Broadcast Campaigns & Analytics */}
      {activeTab === 'campaigns' && (
        <div className="space-y-6">
          {/* Campaign Analytics KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Total Broadcasts</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{campaignMetrics.totalCampaigns}</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wide">Messages Dispatched</span>
              <p className="text-2xl font-bold text-blue-600 mt-1">{campaignMetrics.totalSent}</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide">Delivered Rate</span>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{campaignMetrics.deliveryRate}%</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-purple-700 uppercase tracking-wide">Read / Open Rate</span>
              <p className="text-2xl font-bold text-purple-600 mt-1">{campaignMetrics.readRate}%</p>
            </div>
          </div>

          {/* Campaigns List */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-1">Customer Broadcast Records</h3>
            <p className="text-xs text-slate-500 mb-4">Detailed delivery and engagement analytics per segmented marketing blast.</p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Campaign Name</th>
                    <th className="py-2.5 px-3">Channel</th>
                    <th className="py-2.5 px-3">Segment</th>
                    <th className="py-2.5 px-3">Target</th>
                    <th className="py-2.5 px-3">Sent / Delivered</th>
                    <th className="py-2.5 px-3">Read / Opened</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {campaigns.map(camp => (
                    <tr key={camp.id} className="hover:bg-slate-50">
                      <td className="py-3 px-3">
                        <p className="font-bold text-slate-900">{camp.title}</p>
                        <p className="text-[11px] text-slate-400 truncate max-w-[280px]">{camp.templateText}</p>
                      </td>
                      <td className="py-3 px-3">
                        <span className="uppercase font-bold text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                          {camp.channel}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-700">{camp.segment}</td>
                      <td className="py-3 px-3 font-semibold text-slate-900">{camp.targetCount} users</td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-800">{camp.sentCount}</span> / <span className="font-bold text-emerald-600">{camp.deliveredCount}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-purple-700">{camp.readCount} ({Math.round(((camp.readCount || 0) / (camp.deliveredCount || 1)) * 100)}%)</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          camp.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : camp.status === 'scheduled'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {camp.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Notification Templates */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map(tmpl => (
              <div key={tmpl.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{tmpl.name}</span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {tmpl.channel}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-3 rounded-xl font-mono leading-relaxed">
                    {tmpl.content}
                  </p>

                  <div className="mt-3">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Supported Variables:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {tmpl.variables.map(v => (
                        <span key={v} className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold rounded-md">
                          {v}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 text-right">
                  <span className="text-[11px] text-slate-400">Trigger: {tmpl.event}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <BannerFormModal
        isOpen={isBannerModalOpen}
        onClose={() => {
          setIsBannerModalOpen(false);
          setSelectedBannerForEdit(null);
        }}
        onSave={handleSaveBanner}
        banner={selectedBannerForEdit}
        onPreviewRequest={(bannerData) => {
          setPreviewBanner(bannerData);
          setIsPreviewModalOpen(true);
        }}
      />

      <BannerPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        banner={previewBanner}
      />

      <AnnouncementModal
        isOpen={isAnnouncementModalOpen}
        onClose={() => {
          setIsAnnouncementModalOpen(false);
          setSelectedAnnouncementForEdit(null);
        }}
        onSave={handleSaveAnnouncement}
        announcement={selectedAnnouncementForEdit}
      />

      <CampaignModal
        isOpen={isCampaignModalOpen}
        onClose={() => setIsCampaignModalOpen(false)}
        onSendCampaign={handleSendCampaign}
        customers={customers}
      />
    </div>
  );
};
