/**
 * Helper utilities for formatting, phone masking, and date handling.
 */

/**
 * Mask a phone number for public display: +2519****1234
 */
function maskPhone(phone) {
  if (!phone || phone.length < 6) return '***';
  const visible = 4;
  return phone.slice(0, phone.length - visible - 4) + '****' + phone.slice(-visible);
}

/**
 * Format a date for display (Ethiopian-friendly format)
 */
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Calculate remaining time from now to a target date.
 * Returns human-readable string.
 */
function timeRemaining(targetDate) {
  const now = new Date();
  const target = new Date(targetDate);
  const diff = target - now;

  if (diff <= 0) return 'Expired';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);

  return parts.join(' ') || '< 1m';
}

/**
 * Parse user input for spot numbers.
 * Supports: "5, 17, 42" or "random 3"
 * Returns { type: 'specific', numbers: [5, 17, 42] } 
 *      or { type: 'random', count: 3 }
 *      or { type: 'invalid' }
 */
function parseSpotInput(text) {
  const trimmed = text.trim().toLowerCase();

  // Check for "random N" pattern
  const randomMatch = trimmed.match(/^random\s+(\d+)$/);
  if (randomMatch) {
    const count = parseInt(randomMatch[1]);
    if (count > 0 && count <= 100) {
      return { type: 'random', count };
    }
    return { type: 'invalid' };
  }

  // Try parsing as comma-separated numbers
  const parts = trimmed.split(/[,\s]+/).filter(Boolean);
  const numbers = parts.map(Number).filter((n) => !isNaN(n) && Number.isInteger(n) && n > 0);

  if (numbers.length > 0 && numbers.length === parts.length) {
    // Remove duplicates
    const unique = [...new Set(numbers)];
    return { type: 'specific', numbers: unique };
  }

  return { type: 'invalid' };
}

/**
 * Format currency amount (ETB)
 */
function formatPrice(amount) {
  return `${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })} ETB`;
}

/**
 * Generate a unique payment reference ID for a reservation
 */
function generatePaymentRef() {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `LOT-${timestamp}-${random}`;
}

module.exports = {
  maskPhone,
  formatDate,
  timeRemaining,
  parseSpotInput,
  formatPrice,
  generatePaymentRef,
};
