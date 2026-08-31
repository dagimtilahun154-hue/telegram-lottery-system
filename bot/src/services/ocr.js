/**
 * OCR service using Tesseract.js for extracting payment reference numbers
 * from receipt screenshots. Supports Telebirr, CBE, and generic references.
 * Completely free — no API costs.
 */
const Tesseract = require('tesseract.js');
const { PAYMENT_METHOD } = require('../utils/constants');

// Regex patterns for Ethiopian payment references
const PATTERNS = {
  // Telebirr: FT followed by 8-12 digits (e.g., FT84729361)
  telebirr: /FT[\s-]?(\d[\d\s-]{6,14}\d)/i,

  // CBE: Usually a long digit string (10-20 digits)
  cbe: /(?:(?:ref|trans|txn|receipt)\s*(?:no|id|#|:)?\s*[:#]?\s*)(\d{6,20})/i,

  // CBE Birr: Similar to Telebirr but with CB prefix
  cbeBirr: /CB[\s-]?(\d[\d\s-]{6,14}\d)/i,

  // Generic transaction reference (alphanumeric, 6+ chars after a label)
  generic: /(?:ref(?:erence)?|trans(?:action)?|txn|receipt|confirmation)\s*(?:no|id|number|#|code)?\s*[:#.\-]?\s*([A-Z0-9][\w\-]{5,})/i,

  // Standalone long number (fallback for any 10+ digit number)
  longNumber: /\b(\d{10,20})\b/,
};

/**
 * Extract payment reference from a receipt image.
 * @param {string|Buffer} imageSource - Path to image or image buffer
 * @returns {Promise<{refCode: string|null, confidence: number, rawText: string, paymentMethod: string|null}>}
 */
async function extractReference(imageSource) {
  let result;

  try {
    result = await Tesseract.recognize(imageSource, 'eng', {
      logger: () => {}, // Suppress progress logs
    });
  } catch (err) {
    console.error('OCR failed:', err.message);
    return {
      refCode: null,
      confidence: 0,
      rawText: '',
      paymentMethod: null,
    };
  }

  const text = result.data.text;
  const confidence = result.data.confidence / 100; // Normalize to 0-1

  // Try matching patterns in priority order
  let refCode = null;
  let paymentMethod = null;

  // 1. Telebirr pattern
  const telebirrMatch = text.match(PATTERNS.telebirr);
  if (telebirrMatch) {
    refCode = 'FT' + telebirrMatch[1].replace(/[\s-]/g, '');
    paymentMethod = PAYMENT_METHOD.TELEBIRR;
  }

  // 2. CBE Birr pattern
  if (!refCode) {
    const cbeMatch = text.match(PATTERNS.cbeBirr);
    if (cbeMatch) {
      refCode = 'CB' + cbeMatch[1].replace(/[\s-]/g, '');
      paymentMethod = PAYMENT_METHOD.CBE;
    }
  }

  // 3. CBE / labeled reference
  if (!refCode) {
    const labeledMatch = text.match(PATTERNS.cbe);
    if (labeledMatch) {
      refCode = labeledMatch[1].replace(/[\s-]/g, '');
      paymentMethod = PAYMENT_METHOD.CBE;
    }
  }

  // 4. Generic labeled reference
  if (!refCode) {
    const genericMatch = text.match(PATTERNS.generic);
    if (genericMatch) {
      refCode = genericMatch[1];
      paymentMethod = PAYMENT_METHOD.BANK_TRANSFER;
    }
  }

  // 5. Fallback: any standalone long number
  if (!refCode) {
    const longNumMatch = text.match(PATTERNS.longNumber);
    if (longNumMatch) {
      refCode = longNumMatch[1];
      paymentMethod = null; // Unknown method
    }
  }

  return {
    refCode,
    confidence,
    rawText: text.substring(0, 500), // Keep first 500 chars for debugging
    paymentMethod,
  };
}

module.exports = { extractReference };
