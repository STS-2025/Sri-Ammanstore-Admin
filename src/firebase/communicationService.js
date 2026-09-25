import { logActivity } from './auditLogger';
import { adjustSmartCoins } from './customerService';

const BIRTHDAY_SETTINGS_KEY = 'grocery_admin_birthday_automation_settings';
const MESSAGE_LOGS_KEY = 'grocery_admin_message_logs';

export const getBirthdaySettings = () => {
  try {
    const raw = localStorage.getItem(BIRTHDAY_SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}

  return {
    isEnabled: true,
    channels: {
      whatsapp: true,
      sms: true,
      push: true,
      email: false
    },
    rewardCoins: 50,
    promoCode: 'BDAY50OFF',
    templateMessage: 'Vanakkam {name}! Sri Amman Store wishes you a joyful Birthday! Enjoy {coins} complimentary Smart Coins and use code {code} for 10% off your grocery basket today.'
  };
};

export const saveBirthdaySettings = (settings) => {
  localStorage.setItem(BIRTHDAY_SETTINGS_KEY, JSON.stringify(settings));
};

export const getMessageLogs = () => {
  try {
    const raw = localStorage.getItem(MESSAGE_LOGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
};

/**
 * Send Communication Message (WhatsApp, SMS, Push) respecting DND & Consent
 */
export const sendMessage = async ({ customer, channel = 'whatsapp', templateText, user }) => {
  // Check DND / Consent rules
  if (channel === 'whatsapp' && !customer.consentWhatsApp) {
    throw new Error(`Customer ${customer.name} has opted out of WhatsApp messages.`);
  }
  if (channel === 'sms' && !customer.consentSMS) {
    throw new Error(`Customer ${customer.name} has opted out of SMS broadcasts.`);
  }

  const logEntry = {
    id: `msg-${Date.now().toString(36)}`,
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.mobile,
    channel,
    message: templateText,
    status: 'Delivered (Mock Gateway)',
    timestamp: new Date().toISOString(),
    sentBy: user?.displayName || 'System Automation'
  };

  const currentLogs = getMessageLogs();
  currentLogs.unshift(logEntry);
  localStorage.setItem(MESSAGE_LOGS_KEY, JSON.stringify(currentLogs.slice(0, 100)));

  await logActivity({
    userId: user?.uid,
    userEmail: user?.email,
    userRole: user?.role,
    action: `SEND_${channel.toUpperCase()}_MESSAGE`,
    module: 'Communication',
    targetId: customer.id,
    targetType: 'customer',
    reason: `Dispatched ${channel} message to ${customer.name}`
  });

  return logEntry;
};

/**
 * Trigger Birthday Automation Gift & Message
 */
export const executeBirthdayAutomation = async (customer, user) => {
  const settings = getBirthdaySettings();
  if (!settings.isEnabled) {
    throw new Error('Birthday automation is currently disabled in store settings.');
  }

  // 1. Credit complimentary Birthday Smart Coins
  if (settings.rewardCoins > 0) {
    await adjustSmartCoins({
      customerId: customer.id,
      deltaCoins: settings.rewardCoins,
      reason: `Annual Birthday Celebration Reward (${settings.rewardCoins} Smart Coins)`,
      user
    });
  }

  // 2. Format customized message
  const personalizedMessage = settings.templateMessage
    .replace('{name}', customer.name)
    .replace('{coins}', settings.rewardCoins)
    .replace('{code}', settings.promoCode);

  // 3. Dispatch message via consented channel (WhatsApp or SMS)
  const channel = customer.consentWhatsApp ? 'whatsapp' : 'sms';
  const dispatchResult = await sendMessage({
    customer,
    channel,
    templateText: personalizedMessage,
    user
  });

  return { success: true, rewardCoins: settings.rewardCoins, dispatchResult };
};
