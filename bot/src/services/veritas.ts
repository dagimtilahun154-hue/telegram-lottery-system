import fetch from 'node-fetch';
import { CONFIG } from '../config.js';
import { veritasKeyPool } from './veritasPool.js';

export interface VeritasVerificationResult {
  isSuccess: boolean;
  provider: string;
  reference: string;
  amount: number;
  receiverAccount?: string;
  receiverName?: string;
  senderName?: string;
  transactionTime?: string;
  rawResponse: any;
  error?: string;
}

export interface StrictValidationResult {
  valid: boolean;
  reason?: string;
  detectedAccount?: string;
  detectedName?: string;
  detectedAmount?: number;
  detectedRef?: string;
}

export class VeritasService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = CONFIG.VERITAS_API_URL;
  }

  /**
   * Verified strictly for Telebirr using rotating Multi-Key Veritas Pool
   * Retries automatically across pool if any key is rate-limited or exhausted.
   */
  async verifyTelebirrReference(reference: string, phoneNumber?: string): Promise<VeritasVerificationResult> {
    const maxRetries = 3;
    let attempts = 0;

    while (attempts < maxRetries) {
      attempts++;
      const apiKey = veritasKeyPool.getNextAvailableKey();

      if (!apiKey) {
        console.warn('⚠️ [VeritasService] All Veritas API keys exhausted or in cooldown.');
        return {
          isSuccess: false,
          provider: 'TELEBIRR',
          reference,
          amount: 0,
          rawResponse: null,
          error: 'ALL_KEYS_EXHAUSTED'
        };
      }

      console.log(`📡 [VeritasService] Attempt ${attempts}: Verifying Telebirr ref "${reference}" using Veritas key (${apiKey.slice(0, 4)}...)`);

      try {
        const response = await fetch(`${this.baseUrl}/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey
          },
          body: JSON.stringify({
            reference,
            provider: 'TELEBIRR',
            ...(phoneNumber ? { phoneNumber } : {})
          })
        });

        // Handle 429 Too Many Requests
        if (response.status === 429) {
          console.warn(`⚠️ [VeritasService] Veritas Key ${apiKey.slice(0, 4)}... rate-limited (429). Rotating to next key.`);
          veritasKeyPool.markRateLimited(apiKey);
          continue; // retry with next key in pool
        }

        const data: any = await response.json();

        // Handle Quota Limit / Insufficient Credits
        if (data?.error && (data.error.toLowerCase().includes('quota') || data.error.toLowerCase().includes('limit') || response.status === 402)) {
          console.warn(`🛑 [VeritasService] Veritas Key ${apiKey.slice(0, 4)}... quota reached. Marking exhausted and rotating.`);
          veritasKeyPool.markQuotaExhausted(apiKey);
          continue; // retry with next key in pool
        }

        return this.normalizeVeritasResponse(data, reference);
      } catch (err: any) {
        console.warn(`[VeritasService] Network error on key ${apiKey.slice(0, 4)}...:`, err.message);
      }
    }

    return {
      isSuccess: false,
      provider: 'TELEBIRR',
      reference,
      amount: 0,
      rawResponse: null,
      error: 'VERIFICATION_FAILED_AFTER_RETRIES'
    };
  }

  /**
   * Normalizes response from Veritas into standard format
   */
  private normalizeVeritasResponse(raw: any, fallbackRef: string): VeritasVerificationResult {
    const isSuccess = Boolean(raw && (raw.status === 'SUCCESS' || raw.verified === true || raw.success === true || raw.isSuccess === true));
    const tx = raw.transaction || raw.data || raw;

    return {
      isSuccess,
      provider: 'TELEBIRR',
      reference: tx.reference || tx.txn_id || tx.transaction_id || fallbackRef,
      amount: parseFloat(tx.amount || tx.detected_amount || '0'),
      receiverAccount: tx.receiver_account || tx.credited_account,
      receiverName: tx.receiver_name || tx.credited_name,
      senderName: tx.sender_name || tx.debited_name,
      transactionTime: tx.timestamp || tx.created_at || new Date().toISOString(),
      rawResponse: raw,
      error: raw.error || (!isSuccess ? 'Transaction not found or unverified' : undefined)
    };
  }

  /**
   * Strict comparison against event parameters
   */
  static validateStrictly(
    res: VeritasVerificationResult,
    eventParams: {
      ticket_price: number;
      receiver_account_number: string;
      receiver_name: string;
    }
  ): StrictValidationResult {
    const rawDetectedAmount = res.amount || undefined;
    const rawDetectedAccount = res.receiverAccount || undefined;
    const rawDetectedName = res.receiverName || undefined;
    const rawDetectedRef = res.reference || undefined;

    if (!res.isSuccess) {
      return {
        valid: false,
        reason: res.error || 'Verification failed at bank system',
        detectedAmount: rawDetectedAmount,
        detectedAccount: rawDetectedAccount,
        detectedName: rawDetectedName,
        detectedRef: rawDetectedRef
      };
    }

    const issues: string[] = [];

    // 1. Amount check
    if (res.amount > 0 && Math.abs(res.amount - eventParams.ticket_price) > 0.5) {
      issues.push(`Amount mismatch: Expected ${eventParams.ticket_price} ETB, detected ${res.amount} ETB`);
    }

    // 2. Receiver Account check (if available from bank)
    if (res.receiverAccount) {
      const cleanExpected = eventParams.receiver_account_number.replace(/\s+/g, '');
      const cleanDetected = res.receiverAccount.replace(/\s+/g, '');
      if (cleanExpected !== cleanDetected && !cleanExpected.includes(cleanDetected) && !cleanDetected.includes(cleanExpected)) {
        issues.push(`Account mismatch: Expected ${cleanExpected}, detected ${cleanDetected}`);
      }
    }

    // 3. Receiver Name check (if available from bank)
    if (res.receiverName) {
      const normExpected = eventParams.receiver_name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const normDetected = res.receiverName.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normExpected && normDetected) {
        const isMatch = normDetected.includes(normExpected) || normExpected.includes(normDetected);
        if (!isMatch) {
          issues.push(`Receiver Name mismatch: Expected "${eventParams.receiver_name}", bank returned "${res.receiverName}"`);
        }
      }
    }

    if (issues.length > 0) {
      return {
        valid: false,
        reason: issues.join(' | '),
        detectedAmount: rawDetectedAmount,
        detectedAccount: rawDetectedAccount,
        detectedName: rawDetectedName,
        detectedRef: rawDetectedRef
      };
    }

    return {
      valid: true,
      detectedAccount: res.receiverAccount || eventParams.receiver_account_number,
      detectedName: res.receiverName || eventParams.receiver_name,
      detectedAmount: res.amount,
      detectedRef: res.reference
    };
  }
}

export const veritasService = new VeritasService();

