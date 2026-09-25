/**
 * Formatting Utilities for Sri Amman Store Grocery Admin Operations
 */

/**
 * Formats numeric currency values into Indian Rupees (INR)
 */
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

/**
 * Formats a date into a human readable string
 */
export const formatDate = (dateValue, options = {}) => {
  if (!dateValue) return '—';
  const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
  if (isNaN(date.getTime())) return '—';

  const defaultOptions = {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options
  };

  return new Intl.DateTimeFormat('en-IN', defaultOptions).format(date);
};

/**
 * Formats date and time
 */
export const formatDateTime = (dateValue) => {
  if (!dateValue) return '—';
  const date = dateValue.toDate ? dateValue.toDate() : new Date(dateValue);
  if (isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(date);
};

/**
 * Formats grocery weight or volume
 */
export const formatWeight = (value, unit = 'g') => {
  if (!value && value !== 0) return '—';
  if (unit === 'g' && value >= 1000) {
    return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 2)} kg`;
  }
  if (unit === 'ml' && value >= 1000) {
    return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 2)} L`;
  }
  return `${value} ${unit}`;
};

/**
 * Formats a phone number for display
 */
export const formatPhone = (phone) => {
  if (!phone) return '—';
  const cleaned = ('' + phone).replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return phone;
};
