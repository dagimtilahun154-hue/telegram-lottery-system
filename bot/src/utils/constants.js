// Status constants for tickets
const TICKET_STATUS = {
  AVAILABLE: 'AVAILABLE',
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
};

// Status constants for lottery items
const ITEM_STATUS = {
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  COMPLETED: 'COMPLETED',
};

// Status constants for lottery rounds
const ROUND_STATUS = {
  OPEN: 'OPEN',
  LOCKED: 'LOCKED',
  DRAWING: 'DRAWING',
  COMPLETED: 'COMPLETED',
};

// Payment methods
const PAYMENT_METHOD = {
  TELEBIRR: 'TELEBIRR',
  CBE: 'CBE',
  BANK_TRANSFER: 'BANK_TRANSFER',
};

// Reservation lock duration (15 minutes)
const LOCK_DURATION_MS = (parseInt(process.env.LOCK_DURATION_MINUTES) || 15) * 60 * 1000;

// Receipt image retention (48 hours)
const RECEIPT_RETENTION_MS = (parseInt(process.env.RECEIPT_RETENTION_HOURS) || 48) * 60 * 60 * 1000;

// Max active lottery items at once
const MAX_ACTIVE_ITEMS = 4;

// Spot colors for reference
const SPOT_COLORS = {
  AVAILABLE: '🟢',
  PENDING_PAYMENT: '🟡',
  CONFIRMED: '🔴',
  CANCELLED: '⚪',
  MY_CART: '🔵',
};

module.exports = {
  TICKET_STATUS,
  ITEM_STATUS,
  ROUND_STATUS,
  PAYMENT_METHOD,
  LOCK_DURATION_MS,
  RECEIPT_RETENTION_MS,
  MAX_ACTIVE_ITEMS,
  SPOT_COLORS,
};
