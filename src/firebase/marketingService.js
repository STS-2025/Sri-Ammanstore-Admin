import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './config';
import { COLLECTIONS } from './collections';
import { INITIAL_BANNERS, INITIAL_ANNOUNCEMENTS, INITIAL_CAMPAIGNS } from '../data/deliveryAndMarketingSeedData';
import { logActivity } from './auditLogger';

const BANNERS_KEY = 'grocery_admin_banners_v4';
const ANNOUNCEMENTS_KEY = 'grocery_admin_announcements_v4';
const CAMPAIGNS_KEY = 'grocery_admin_campaigns_v4';
const TEMPLATES_KEY = 'grocery_admin_templates_v4';

const DEFAULT_TEMPLATES = [
  {
    id: 'tmpl-order-confirmed',
    name: 'Order Confirmed Alert',
    channel: 'whatsapp',
    event: 'order_confirmed',
    content: 'Vanakkam {Customer Name}! Your grocery order #{Order ID} for ₹{Amount} is confirmed. Sri Amman Store is packing fresh spices & rice for you.',
    variables: ['{Customer Name}', '{Order ID}', '{Amount}']
  },
  {
    id: 'tmpl-out-for-delivery',
    name: 'Out For Delivery & Tracking',
    channel: 'whatsapp',
    event: 'out_for_delivery',
    content: 'Hi {Customer Name}, your order #{Order ID} is out for delivery with our rider {Agent Name}. Estimated delivery time: {Delivery Time}. Live tracking: {Tracking Link}',
    variables: ['{Customer Name}', '{Order ID}', '{Agent Name}', '{Delivery Time}', '{Tracking Link}']
  },
  {
    id: 'tmpl-order-delivered',
    name: 'Delivery Completion & Coins Credit',
    channel: 'sms',
    event: 'order_delivered',
    content: 'Delivered! Order #{Order ID} has reached you. Smart Coins have been credited to your account. Enjoy fresh grocery from Sri Amman Store!',
    variables: ['{Customer Name}', '{Order ID}']
  }
];

const getStoredBanners = () => {
  try {
    const raw = localStorage.getItem(BANNERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

const saveStoredBanners = (items) => {
  try {
    localStorage.setItem(BANNERS_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Error saving banners locally', e);
  }
};

const getStoredAnnouncements = () => {
  try {
    const raw = localStorage.getItem(ANNOUNCEMENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

const saveStoredAnnouncements = (items) => {
  try {
    localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Error saving announcements locally', e);
  }
};

const getStoredCampaigns = () => {
  try {
    const raw = localStorage.getItem(CAMPAIGNS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

const saveStoredCampaigns = (items) => {
  try {
    localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Error saving campaigns locally', e);
  }
};

const getStoredTemplates = () => {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY);
    return raw ? JSON.parse(raw) : DEFAULT_TEMPLATES;
  } catch (e) {
    return DEFAULT_TEMPLATES;
  }
};

const saveStoredTemplates = (items) => {
  try {
    localStorage.setItem(TEMPLATES_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Error saving templates locally', e);
  }
};

// ================= BANNERS API =================

export const getAllBanners = async () => {
  if (!isFirebaseConfigured) {
    return getStoredBanners();
  }

  try {
    const snap = await getDocs(collection(db, COLLECTIONS.BANNERS));
    if (snap.empty) {
      return [];
    }
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('Firestore banners fetch failed:', err);
    return getStoredBanners();
  }
};

export const createBanner = async (bannerData, user) => {
  const imageUrl = bannerData.desktopImageUrl || bannerData.imageUrl || bannerData.mobileImageUrl || '';
  const newBanner = {
    ...bannerData,
    id: bannerData.id || `ban-${Date.now().toString().slice(-4)}`,
    imageUrl,
    clicks: 0,
    status: bannerData.status || 'active',
    priority: Number(bannerData.priority) || 1,
    createdAt: new Date().toISOString()
  };

  const banners = getStoredBanners();
  banners.push(newBanner);
  banners.sort((a, b) => a.priority - b.priority);
  saveStoredBanners(banners);

  if (isFirebaseConfigured) {
    try {
      await setDoc(doc(db, COLLECTIONS.BANNERS, newBanner.id), { ...newBanner, createdAt: serverTimestamp() });
    } catch (e) {
      console.warn('Firestore banner save failed:', e);
    }
  }

  await logActivity(
    user || { id: 'marketing', name: 'Marketing Staff' },
    'marketing.banner_create',
    COLLECTIONS.BANNERS,
    newBanner.id,
    `Created promotional banner "${newBanner.title}" for placement [${newBanner.placement}]`,
    { banner: newBanner }
  );

  return newBanner;
};

export const updateBanner = async (bannerId, updates, user) => {
  const banners = getStoredBanners();
  const idx = banners.findIndex(b => b.id === bannerId);
  if (idx === -1) throw new Error('Banner not found');

  const imageUrl = updates.desktopImageUrl || updates.imageUrl || updates.mobileImageUrl || banners[idx].imageUrl || banners[idx].desktopImageUrl || '';
  const updated = { ...banners[idx], ...updates, imageUrl, updatedAt: new Date().toISOString() };
  banners[idx] = updated;
  banners.sort((a, b) => a.priority - b.priority);
  saveStoredBanners(banners);

  if (isFirebaseConfigured) {
    try {
      await updateDoc(doc(db, COLLECTIONS.BANNERS, bannerId), { ...updates, imageUrl, updatedAt: serverTimestamp() });
    } catch (e) {
      console.warn('Firestore banner update failed:', e);
    }
  }

  await logActivity(
    user || { id: 'marketing', name: 'Marketing Staff' },
    'marketing.banner_update',
    COLLECTIONS.BANNERS,
    bannerId,
    `Updated banner "${updated.title}"`,
    { updates }
  );

  return updated;
};

export const deleteBanner = async (bannerId, user) => {
  const banners = getStoredBanners();
  const existing = banners.find(b => b.id === bannerId);
  const filtered = banners.filter(b => b.id !== bannerId);
  saveStoredBanners(filtered);

  if (isFirebaseConfigured) {
    try {
      await deleteDoc(doc(db, COLLECTIONS.BANNERS, bannerId));
    } catch (e) {
      console.warn('Firestore banner delete failed:', e);
    }
  }

  await logActivity(
    user || { id: 'marketing', name: 'Marketing Staff' },
    'marketing.banner_delete',
    COLLECTIONS.BANNERS,
    bannerId,
    `Deleted promotional banner "${existing?.title || bannerId}"`
  );

  return true;
};

export const clearAllBanners = async (user) => {
  saveStoredBanners([]);
  if (isFirebaseConfigured) {
    try {
      const snap = await getDocs(collection(db, COLLECTIONS.BANNERS));
      for (const d of snap.docs) {
        await deleteDoc(doc(db, COLLECTIONS.BANNERS, d.id));
      }
    } catch (e) {
      console.warn('Firestore clear banners failed:', e);
    }
  }
  await logActivity(
    user || { id: 'marketing', name: 'Marketing Staff' },
    'marketing.banners_clear',
    COLLECTIONS.BANNERS,
    'all',
    'Cleared all homepage banners'
  );
  return true;
};

// ================= ANNOUNCEMENTS API =================

export const getAllAnnouncements = async () => {
  if (!isFirebaseConfigured) {
    return getStoredAnnouncements();
  }

  try {
    const snap = await getDocs(collection(db, COLLECTIONS.ANNOUNCEMENTS));
    if (snap.empty) {
      return [];
    }
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('Firestore announcements fetch failed:', err);
    return getStoredAnnouncements();
  }
};

export const saveAnnouncement = async (data, user) => {
  const announcements = getStoredAnnouncements();
  let updated;

  if (data.id) {
    const idx = announcements.findIndex(a => a.id === data.id);
    if (idx !== -1) {
      updated = { ...announcements[idx], ...data, updatedAt: new Date().toISOString() };
      announcements[idx] = updated;
    } else {
      updated = { ...data, createdAt: new Date().toISOString() };
      announcements.push(updated);
    }
  } else {
    updated = {
      ...data,
      id: `ann-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toISOString()
    };
    announcements.push(updated);
  }

  saveStoredAnnouncements(announcements);

  if (isFirebaseConfigured) {
    try {
      await setDoc(doc(db, COLLECTIONS.ANNOUNCEMENTS, updated.id), { ...updated, updatedAt: serverTimestamp() });
      await setDoc(doc(db, 'offerMessages', updated.id), {
        text: updated.text,
        order: updated.priority || 0,
        createdAt: updated.createdAt,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.warn('Firestore announcement save failed:', e);
    }
  }

  await logActivity(
    user || { id: 'marketing', name: 'Marketing Staff' },
    'marketing.announcement_save',
    COLLECTIONS.ANNOUNCEMENTS,
    updated.id,
    `Saved storewide scrolling ticker: "${updated.text.slice(0, 45)}..."`
  );

  return updated;
};

export const deleteAnnouncement = async (announcementId, user) => {
  const announcements = getStoredAnnouncements();
  const existing = announcements.find(a => a.id === announcementId);
  const filtered = announcements.filter(a => a.id !== announcementId);
  saveStoredAnnouncements(filtered);

  if (isFirebaseConfigured) {
    try {
      await deleteDoc(doc(db, COLLECTIONS.ANNOUNCEMENTS, announcementId));
      await deleteDoc(doc(db, 'offerMessages', announcementId));
    } catch (e) {
      console.warn('Firestore announcement delete failed:', e);
    }
  }

  await logActivity(
    user || { id: 'marketing', name: 'Marketing Staff' },
    'marketing.announcement_delete',
    COLLECTIONS.ANNOUNCEMENTS,
    announcementId,
    `Deleted announcement "${existing?.text || announcementId}"`
  );

  return true;
};

export const clearAllAnnouncements = async (user) => {
  saveStoredAnnouncements([]);
  if (isFirebaseConfigured) {
    try {
      const snap = await getDocs(collection(db, COLLECTIONS.ANNOUNCEMENTS));
      for (const d of snap.docs) {
        await deleteDoc(doc(db, COLLECTIONS.ANNOUNCEMENTS, d.id));
      }
      const offerSnap = await getDocs(collection(db, 'offerMessages'));
      for (const d of offerSnap.docs) {
        await deleteDoc(doc(db, 'offerMessages', d.id));
      }
    } catch (e) {
      console.warn('Firestore clear announcements failed:', e);
    }
  }
  await logActivity(
    user || { id: 'marketing', name: 'Marketing Staff' },
    'marketing.announcements_clear',
    COLLECTIONS.ANNOUNCEMENTS,
    'all',
    'Cleared all scrolling announcement bars'
  );
  return true;
};

// ================= CAMPAIGNS API =================

export const getAllCampaigns = async () => {
  if (!isFirebaseConfigured) {
    return getStoredCampaigns();
  }

  try {
    const snap = await getDocs(collection(db, COLLECTIONS.CAMPAIGNS));
    if (snap.empty) {
      return [];
    }
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('Firestore campaigns fetch failed:', err);
    return getStoredCampaigns();
  }
};

export const createAndSendCampaign = async (campaignData, user) => {
  const targetCount = campaignData.targetCount || 50;
  const sentCount = targetCount;
  const deliveredCount = Math.floor(targetCount * 0.95);
  const readCount = Math.floor(targetCount * 0.72);
  const failedCount = targetCount - deliveredCount;

  const newCampaign = {
    ...campaignData,
    id: `camp-${Date.now().toString().slice(-4)}`,
    status: campaignData.scheduledAt ? 'scheduled' : 'completed',
    sentCount: campaignData.scheduledAt ? 0 : sentCount,
    deliveredCount: campaignData.scheduledAt ? 0 : deliveredCount,
    readCount: campaignData.scheduledAt ? 0 : readCount,
    failedCount: campaignData.scheduledAt ? 0 : failedCount,
    optedOutCount: 1,
    createdAt: new Date().toISOString(),
    completedAt: campaignData.scheduledAt ? null : new Date().toISOString()
  };

  const campaigns = getStoredCampaigns();
  campaigns.unshift(newCampaign);
  saveStoredCampaigns(campaigns);

  if (isFirebaseConfigured) {
    try {
      await setDoc(doc(db, COLLECTIONS.CAMPAIGNS, newCampaign.id), { ...newCampaign, createdAt: serverTimestamp() });
    } catch (e) {
      console.warn('Firestore campaign save failed:', e);
    }
  }

  await logActivity(
    user || { id: 'marketing', name: 'Marketing Staff' },
    'marketing.campaign_create',
    COLLECTIONS.CAMPAIGNS,
    newCampaign.id,
    `Launched marketing campaign "${newCampaign.title}" targeting ${targetCount} customers via ${newCampaign.channel.toUpperCase()}`,
    { campaign: newCampaign }
  );

  return newCampaign;
};

export const deleteCampaign = async (campaignId, user) => {
  const campaigns = getStoredCampaigns();
  const existing = campaigns.find(c => c.id === campaignId);
  const filtered = campaigns.filter(c => c.id !== campaignId);
  saveStoredCampaigns(filtered);

  if (isFirebaseConfigured) {
    try {
      await deleteDoc(doc(db, COLLECTIONS.CAMPAIGNS, campaignId));
    } catch (e) {
      console.warn('Firestore campaign delete failed:', e);
    }
  }

  await logActivity(
    user || { id: 'marketing', name: 'Marketing Staff' },
    'marketing.campaign_delete',
    COLLECTIONS.CAMPAIGNS,
    campaignId,
    `Deleted broadcast campaign "${existing?.title || campaignId}"`
  );

  return true;
};

export const clearAllCampaigns = async (user) => {
  saveStoredCampaigns([]);
  if (isFirebaseConfigured) {
    try {
      const snap = await getDocs(collection(db, COLLECTIONS.CAMPAIGNS));
      for (const d of snap.docs) {
        await deleteDoc(doc(db, COLLECTIONS.CAMPAIGNS, d.id));
      }
    } catch (e) {
      console.warn('Firestore clear campaigns failed:', e);
    }
  }
  await logActivity(
    user || { id: 'marketing', name: 'Marketing Staff' },
    'marketing.campaigns_clear',
    COLLECTIONS.CAMPAIGNS,
    'all',
    'Cleared all broadcast campaigns'
  );
  return true;
};

// ================= NOTIFICATION TEMPLATES API =================

export const getNotificationTemplates = () => {
  return getStoredTemplates();
};

export const updateNotificationTemplate = async (templateId, updates, user) => {
  const templates = getStoredTemplates();
  const idx = templates.findIndex(t => t.id === templateId);
  if (idx === -1) throw new Error('Template not found');

  const updated = { ...templates[idx], ...updates, updatedAt: new Date().toISOString() };
  templates[idx] = updated;
  saveStoredTemplates(templates);

  await logActivity(
    user || { id: 'marketing', name: 'Marketing Staff' },
    'marketing.template_update',
    COLLECTIONS.NOTIFICATION_TEMPLATES,
    templateId,
    `Updated communication template "${updated.name}"`
  );

  return updated;
};

export const deleteNotificationTemplate = async (templateId, user) => {
  const templates = getStoredTemplates();
  const existing = templates.find(t => t.id === templateId);
  const filtered = templates.filter(t => t.id !== templateId);
  saveStoredTemplates(filtered);

  await logActivity(
    user || { id: 'marketing', name: 'Marketing Staff' },
    'marketing.template_delete',
    COLLECTIONS.NOTIFICATION_TEMPLATES,
    templateId,
    `Deleted notification template "${existing?.name || templateId}"`
  );

  return true;
};

export const clearAllNotificationTemplates = async (user) => {
  saveStoredTemplates([]);
  await logActivity(
    user || { id: 'marketing', name: 'Marketing Staff' },
    'marketing.templates_clear',
    COLLECTIONS.NOTIFICATION_TEMPLATES,
    'all',
    'Cleared all notification templates'
  );
  return true;
};
