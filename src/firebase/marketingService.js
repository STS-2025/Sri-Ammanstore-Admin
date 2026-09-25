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
  },
  {
    id: 'tmpl-festive-broadcast',
    name: 'Festive Season Promo Blast',
    channel: 'push',
    event: 'marketing_blast',
    content: '🌾 Festive discounts live at Sri Amman Store! Get flat ₹100 off on fresh cooking powders with code AMMANFEST. Order now: {Tracking Link}',
    variables: ['{Customer Name}', '{Tracking Link}']
  }
];

const getStoredBanners = () => {
  try {
    const raw = localStorage.getItem(BANNERS_KEY);
    if (!raw) {
      localStorage.setItem(BANNERS_KEY, JSON.stringify(INITIAL_BANNERS));
      return INITIAL_BANNERS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_BANNERS;
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
    if (!raw) {
      localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(INITIAL_ANNOUNCEMENTS));
      return INITIAL_ANNOUNCEMENTS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_ANNOUNCEMENTS;
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
    if (!raw) {
      localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(INITIAL_CAMPAIGNS));
      return INITIAL_CAMPAIGNS;
    }
    return JSON.parse(raw);
  } catch (e) {
    return INITIAL_CAMPAIGNS;
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
    if (!raw) {
      localStorage.setItem(TEMPLATES_KEY, JSON.stringify(DEFAULT_TEMPLATES));
      return DEFAULT_TEMPLATES;
    }
    return JSON.parse(raw);
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
      const local = getStoredBanners();
      for (const b of local) {
        await setDoc(doc(db, COLLECTIONS.BANNERS, b.id), { ...b, createdAt: serverTimestamp() });
      }
      return local;
    }
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('Firestore banners fetch failed:', err);
    return getStoredBanners();
  }
};

export const createBanner = async (bannerData, user) => {
  const newBanner = {
    ...bannerData,
    id: bannerData.id || `ban-${Date.now().toString().slice(-4)}`,
    clicks: 0,
    status: bannerData.status || 'active',
    priority: Number(bannerData.priority) || 1,
    createdAt: new Date().toISOString()
  };

  const banners = getStoredBanners();
  banners.push(newBanner);
  // Sort by priority ascending
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

  const updated = { ...banners[idx], ...updates, updatedAt: new Date().toISOString() };
  banners[idx] = updated;
  banners.sort((a, b) => a.priority - b.priority);
  saveStoredBanners(banners);

  if (isFirebaseConfigured) {
    try {
      await updateDoc(doc(db, COLLECTIONS.BANNERS, bannerId), { ...updates, updatedAt: serverTimestamp() });
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

// ================= ANNOUNCEMENTS API =================

export const getAllAnnouncements = async () => {
  if (!isFirebaseConfigured) {
    return getStoredAnnouncements();
  }

  try {
    const snap = await getDocs(collection(db, COLLECTIONS.ANNOUNCEMENTS));
    if (snap.empty) {
      const local = getStoredAnnouncements();
      for (const a of local) {
        await setDoc(doc(db, COLLECTIONS.ANNOUNCEMENTS, a.id), { ...a, createdAt: serverTimestamp() });
      }
      return local;
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

// ================= CAMPAIGNS API =================

export const getAllCampaigns = async () => {
  if (!isFirebaseConfigured) {
    return getStoredCampaigns();
  }

  try {
    const snap = await getDocs(collection(db, COLLECTIONS.CAMPAIGNS));
    if (snap.empty) {
      const local = getStoredCampaigns();
      for (const c of local) {
        await setDoc(doc(db, COLLECTIONS.CAMPAIGNS, c.id), { ...c, createdAt: serverTimestamp() });
      }
      return local;
    }
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('Firestore campaigns fetch failed:', err);
    return getStoredCampaigns();
  }
};

export const createAndSendCampaign = async (campaignData, user) => {
  const targetCount = campaignData.targetCount || 50;
  // Authentic simulated communication provider delivery rates
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
