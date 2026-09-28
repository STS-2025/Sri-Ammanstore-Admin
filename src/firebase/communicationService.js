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
      email: true,
      push: true
    },
    rewardCoins: 50,
    promoCode: 'BDAY50OFF',
    templateMessage: 'Vanakkam {name}! Sri Amman Store wishes you a joyful Birthday! Enjoy {coins} complimentary Smart Coins and use promo code {code} for special grocery savings today.'
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
  
  // Seed sample initial logs if empty for clear UI audit table preview
  const sampleLogs = [
    {
      id: 'msg-seed-1',
      customerId: 'cust-101',
      customerName: 'Lakshmi Narayanan',
      customerPhone: '+91 98401 22334',
      channel: 'whatsapp',
      message: 'Vanakkam Lakshmi Narayanan! Sri Amman Store wishes you a joyful Birthday! Enjoy 50 complimentary Smart Coins.',
      status: 'Delivered (WhatsApp API)',
      timestamp: new Date().toISOString(),
      sentBy: 'System Automation'
    },
    {
      id: 'msg-seed-2',
      customerId: 'cust-102',
      customerName: 'Karpagam Venkat',
      customerPhone: '+91 97890 55667',
      channel: 'sms',
      message: 'Vanakkam Karpagam Venkat! Happy Birthday from Sri Amman Store. Code: BDAY50OFF.',
      status: 'Delivered (SMS Gateway)',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      sentBy: 'System Automation'
    }
  ];
  localStorage.setItem(MESSAGE_LOGS_KEY, JSON.stringify(sampleLogs));
  return sampleLogs;
};

/**
 * Send Communication Message (WhatsApp, SMS, Email, Push) respecting DND & Consent
 */
export const sendMessage = async ({ customer, channel = 'whatsapp', templateText, user }) => {
  // Check DND / Consent rules
  if (channel === 'whatsapp' && customer.consentWhatsApp === false) {
    const blockedLog = {
      id: `msg-${Date.now().toString(36)}`,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.mobile,
      channel,
      message: templateText,
      status: 'Consent Blocked (Opted Out)',
      timestamp: new Date().toISOString(),
      sentBy: user?.displayName || 'System Automation'
    };
    const currentLogs = getMessageLogs();
    currentLogs.unshift(blockedLog);
    localStorage.setItem(MESSAGE_LOGS_KEY, JSON.stringify(currentLogs.slice(0, 100)));
    throw new Error(`Customer ${customer.name} has opted out of WhatsApp marketing messages.`);
  }

  if (channel === 'sms' && customer.consentSMS === false) {
    const blockedLog = {
      id: `msg-${Date.now().toString(36)}`,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.mobile,
      channel,
      message: templateText,
      status: 'Consent Blocked (Opted Out)',
      timestamp: new Date().toISOString(),
      sentBy: user?.displayName || 'System Automation'
    };
    const currentLogs = getMessageLogs();
    currentLogs.unshift(blockedLog);
    localStorage.setItem(MESSAGE_LOGS_KEY, JSON.stringify(currentLogs.slice(0, 100)));
    throw new Error(`Customer ${customer.name} has opted out of SMS marketing broadcasts.`);
  }

  if (channel === 'email' && customer.consentEmail === false) {
    const blockedLog = {
      id: `msg-${Date.now().toString(36)}`,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.email || customer.mobile,
      channel,
      message: templateText,
      status: 'Consent Blocked (Opted Out)',
      timestamp: new Date().toISOString(),
      sentBy: user?.displayName || 'System Automation'
    };
    const currentLogs = getMessageLogs();
    currentLogs.unshift(blockedLog);
    localStorage.setItem(MESSAGE_LOGS_KEY, JSON.stringify(currentLogs.slice(0, 100)));
    throw new Error(`Customer ${customer.name} has opted out of Email marketing.`);
  }

  const logEntry = {
    id: `msg-${Date.now().toString(36)}`,
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.mobile || customer.email,
    channel,
    message: templateText,
    status: 'Delivered (Gateway Sync)',
    timestamp: new Date().toISOString(),
    sentBy: user?.displayName || user?.email || 'System Automation'
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

  // 3. Dispatch message via consented channel (WhatsApp, SMS, Email, or Push)
  let channel = 'whatsapp';
  if (customer.consentWhatsApp && settings.channels?.whatsapp) {
    channel = 'whatsapp';
  } else if (customer.consentSMS && settings.channels?.sms) {
    channel = 'sms';
  } else if (customer.consentEmail && settings.channels?.email) {
    channel = 'email';
  } else if (settings.channels?.push) {
    channel = 'push';
  }

  const dispatchResult = await sendMessage({
    customer,
    channel,
    templateText: personalizedMessage,
    user
  });

  return { success: true, rewardCoins: settings.rewardCoins, dispatchResult };
};
