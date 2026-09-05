import fetch from 'node-fetch';
import { CONFIG } from '../config.js';
import { VeritasVerificationResult } from './veritas.js';

export class DirectVerifierService {
  /**
   * Verify via CBE's modern mbreciept digital receipt sharing system.
   * Format: https://mbreciept.cbe.com.et/{SHORT_ID} or short ID token directly
   * Endpoint: https://Mb.cbe.com.et/api/v1/transactions/public/transaction-detail/{SHORT_ID}
   */
  async verifyMbreceipt(shortIdOrUrl: string): Promise<VeritasVerificationResult> {
    const tokenMatch = shortIdOrUrl.match(/mbrecie?pt\.cbe\.com\.et\/([a-zA-Z0-9_-]+)/i) || shortIdOrUrl.match(/\b(v2-[a-zA-Z0-9_-]+)\b/i);
    const shortId = tokenMatch ? tokenMatch[1] : shortIdOrUrl.trim();

    console.log(`[DirectVerifier] 🔍 Verifying CBE via modern mbreciept API for token: ${shortId}`);

    try {
      const apiUrl = `https://Mb.cbe.com.et/api/v1/transactions/public/transaction-detail/${encodeURIComponent(shortId)}`;
      const response = await fetch(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'X-App-ID': 'd1292e42-7400-49de-a2d3-9731caa4c819',
          'X-App-Version': '0a01980b-9859-1369-8198-59f403820000',
          'Accept': 'application/json, text/plain, */*'
        },
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        const data: any = await response.json();
        const tx = data.transaction || data.data || data;
        const ftNumber = tx.id || tx.transactionId || tx.referenceNo || shortId;
        const amount = Number(tx.amount || tx.transferredAmount || tx.totalAmount || 0);
        const receiverName = tx.creditedPartyName || tx.creditAccountTitle || tx.receiverName || tx.toAccountName || '';
        const receiverAccount = tx.creditAccountNo || tx.creditedAccount || '';
        const senderName = tx.debitedPartyName || tx.debitAccountTitle || tx.senderName || tx.fromAccountName || '';
        const txDate = tx.transactionDate || tx.date || tx.paymentDate || new Date().toISOString();

        console.log(`✅ [DirectVerifier] mbreciept verified: FT=${ftNumber}, Amount=${amount}, Receiver=${receiverName}`);

        return {
          isSuccess: true,
          provider: 'CBE',
          reference: ftNumber,
          amount,
          receiverAccount: receiverAccount || undefined,
          receiverName: receiverName || undefined,
          senderName: senderName || undefined,
          transactionTime: txDate,
          rawResponse: {
            method: 'mbreciept',
            shortId,
            ...data
          }
        };
      }

      const errorText = await response.text();
      console.warn(`[DirectVerifier] mbreciept endpoint returned HTTP ${response.status}: ${errorText.slice(0, 150)}`);
      return {
        isSuccess: false,
        provider: 'CBE',
        reference: shortId,
        amount: 0,
        rawResponse: { status: response.status, errorText },
        error: `mbreciept verification returned status ${response.status}`
      };
    } catch (err: any) {
      console.error(`[DirectVerifier] mbreciept verification error:`, err.message);
      return {
        isSuccess: false,
        provider: 'CBE',
        reference: shortId,
        amount: 0,
        rawResponse: null,
        error: `mbreciept connection error: ${err.message}`
      };
    }
  }

  /**
   * Direct CBE (Commercial Bank of Ethiopia) transaction verification.
   * Supports both:
   * 1. Modern mbreciept link / token (mbreciept.cbe.com.et)
   * 2. Classic FT web verification (https://apps.cbe.com.et:100/?id={FT_NUMBER})
   */
  async verifyCbe(reference: string): Promise<VeritasVerificationResult> {
    const cleanRef = reference.trim();

    // Check if input is a modern mbreciept link or token
    if (
      cleanRef.includes('mbreciept') ||
      cleanRef.includes('mbreceipt') ||
      cleanRef.startsWith('v2-') ||
      (!cleanRef.toUpperCase().startsWith('FT') && cleanRef.length >= 14)
    ) {
      return this.verifyMbreceipt(cleanRef);
    }

    const ftRef = cleanRef.toUpperCase();
    console.log(`[DirectVerifier] Verifying CBE reference directly: ${ftRef}`);

    try {
      const url = `https://apps.cbe.com.et:100/?id=${encodeURIComponent(ftRef)}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        signal: AbortSignal.timeout(12000)
      });

      if (!response.ok) {
        throw new Error(`CBE portal returned HTTP status ${response.status}`);
      }

      const html = await response.text();

      // Check if reference was found in portal response
      if (html.includes('Invalid Transaction') || html.includes('not found') || !html.includes(ftRef)) {
        return {
          isSuccess: false,
          provider: 'CBE',
          reference: ftRef,
          amount: 0,
          rawResponse: { htmlSnippet: html.slice(0, 300) },
          error: 'Transaction reference not found on CBE banking portal.'
        };
      }

      // Parse fields from CBE portal table
      const amountMatch = html.match(/(?:Amount|Transferred Amount|ብር)[\s\S]*?(?:ETB|Birr)?\s*([0-9,]+(?:\.\d{2})?)/i) 
        || html.match(/([0-9,]+(?:\.\d{2})?)\s*(?:ETB|Birr)/i);
      const parsedAmount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, '')) : 0;

      const receiverMatch = html.match(/(?:Credited Party|Receiver|Beneficiary|To)[\s\S]*?<td[^>]*>([^<]+)<\/td>/i)
        || html.match(/(?:Credited to|Beneficiary Name)[\s:]*([A-Za-z\s]+)/i);
      const receiverName = receiverMatch ? receiverMatch[1].trim() : '';

      const senderMatch = html.match(/(?:Debited Party|Sender|From)[\s\S]*?<td[^>]*>([^<]+)<\/td>/i)
        || html.match(/(?:Debited from|Payer Name)[\s:]*([A-Za-z\s]+)/i);
      const senderName = senderMatch ? senderMatch[1].trim() : '';

      const isCompleted = html.includes('Successful') || html.includes('Completed') || html.includes('Success') || parsedAmount > 0;

      return {
        isSuccess: isCompleted,
        provider: 'CBE',
        reference: ftRef,
        amount: parsedAmount,
        receiverName: receiverName || undefined,
        senderName: senderName || undefined,
        transactionTime: new Date().toISOString(),
        rawResponse: {
          directVerification: true,
          portal: 'apps.cbe.com.et:100',
          parsedAmount,
          receiverName,
          senderName
        }
      };
    } catch (err: any) {
      console.error('[DirectVerifier] CBE direct verification failed:', err.message);
      return {
        isSuccess: false,
        provider: 'CBE',
        reference: ftRef,
        amount: 0,
        rawResponse: null,
        error: `CBE verification error: ${err.message}`
      };
    }
  }

  /**
   * Direct Telebirr verification.
   */
  async verifyTelebirr(reference: string): Promise<VeritasVerificationResult> {
    const cleanRef = reference.trim();
    console.log(`[DirectVerifier] Direct Telebirr verification for reference: ${cleanRef}`);

    try {
      const url = `https://app.ethiotelecom.et/receipt-verifier/api/v1/verify?transactionNo=${encodeURIComponent(cleanRef)}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*'
        },
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        const data: any = await response.json();
        if (data && (data.success || data.code === 200 || data.amount)) {
          return {
            isSuccess: true,
            provider: 'TELEBIRR',
            reference: cleanRef,
            amount: Number(data.amount || data.transferredAmount || 0),
            receiverAccount: data.receiverMsisdn || data.receiverAccount,
            receiverName: data.receiverName || data.creditedParty,
            senderName: data.senderName,
            transactionTime: data.transactionDate || new Date().toISOString(),
            rawResponse: data
          };
        }
      }

      throw new Error(`Telebirr portal returned HTTP ${response.status}`);
    } catch (err: any) {
      console.warn(`[DirectVerifier] Direct Telebirr check (${err.message}). Falling back to Admin Review.`);
      return {
        isSuccess: false,
        provider: 'TELEBIRR',
        reference: cleanRef,
        amount: 0,
        rawResponse: {
          directVerification: true,
          endpointTested: 'app.ethiotelecom.et',
          error: err.message,
          note: 'Telebirr direct endpoint unreachable; routed to Admin Verification Queue'
        },
        error: `Telebirr check: ${err.message}`
      };
    }
  }

  /**
   * Automatically dispatch direct verification based on transaction code pattern
   */
  async verifyDirect(reference: string): Promise<VeritasVerificationResult> {
    const trimmed = reference.trim();
    if (
      trimmed.toUpperCase().startsWith('FT') ||
      trimmed.includes('mbreciept') ||
      trimmed.includes('mbreceipt') ||
      trimmed.startsWith('v2-') ||
      (/^[a-zA-Z0-9_-]{10,}$/.test(trimmed) && trimmed.toUpperCase().includes('CBE'))
    ) {
      return this.verifyCbe(trimmed);
    }
    return this.verifyTelebirr(trimmed);
  }
}

export const directVerifier = new DirectVerifierService();
