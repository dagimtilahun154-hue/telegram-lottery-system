import { createWorker } from 'tesseract.js';

export interface OcrExtractionResult {
  reference: string | null;
  detectedProvider: 'CBE' | 'TELEBIRR' | 'UNKNOWN';
  detectedAmount: number | null;
  confidence: number;
  rawText: string;
}

export class LocalOcrService {
  private worker: any = null;
  private isInitializing: boolean = false;

  private async getWorker() {
    if (!this.worker && !this.isInitializing) {
      this.isInitializing = true;
      try {
        this.worker = await createWorker('eng');
      } catch (err) {
        console.error('[LocalOcrService] Worker initialization error:', err);
      } finally {
        this.isInitializing = false;
      }
    }
    return this.worker;
  }

  /**
   * Processes screenshot buffer purely in-memory.
   * NEVER saves the image to disk or remote storage!
   */
  async extractReference(imageBuffer: Buffer, expectedProvider?: string): Promise<OcrExtractionResult> {
    const provider = (expectedProvider || '').toUpperCase();
    console.log(`🔍 [LocalOcrService] Scanning image in-memory for ${provider || 'ANY'} reference...`);

    try {
      const worker = await this.getWorker();
      let recognizedText = '';
      let confidence = 0;

      if (worker) {
        const ret = await worker.recognize(imageBuffer);
        recognizedText = ret.data.text || '';
        confidence = ret.data.confidence || 0;
      } else {
        // Fallback if worker couldn't init: use direct Tesseract.recognize
        const { recognize } = await import('tesseract.js');
        const ret = await recognize(imageBuffer, 'eng');
        recognizedText = ret.data.text || '';
        confidence = ret.data.confidence || 0;
      }

      console.log(`📄 [LocalOcrService] Recognized text (${confidence}% confidence):\n`, recognizedText.slice(0, 300));

      return this.parseReceiptText(recognizedText, confidence, provider);
    } catch (err: any) {
      console.error('[LocalOcrService] OCR Recognition failed:', err);
      return {
        reference: null,
        detectedProvider: provider === 'CBE' ? 'CBE' : (provider === 'TELEBIRR' ? 'TELEBIRR' : 'UNKNOWN'),
        detectedAmount: null,
        confidence: 0,
        rawText: ''
      };
    }
  }

  /**
   * Parses recognized text using precise regex patterns for CBE and Telebirr
   */
  parseReceiptText(text: string, confidence: number, hintProvider?: string): OcrExtractionResult {
    const cleanText = text.replace(/\r/g, ' ');

    let reference: string | null = null;
    let detectedProvider: 'CBE' | 'TELEBIRR' | 'UNKNOWN' = 'UNKNOWN';
    let detectedAmount: number | null = null;

    // 1. EXTRACT AMOUNT (e.g. 500.00 ETB or ETB 500 or 500 ETB)
    const amountMatch = cleanText.match(/(?:ETB|Amount|Birr|Paid)[:\s]*([0-9,]+(?:\.[0-9]{1,2})?)/i)
      || cleanText.match(/([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:ETB|Birr)/i);
    if (amountMatch) {
      const rawAmt = amountMatch[1].replace(/,/g, '');
      const parsed = parseFloat(rawAmt);
      if (!isNaN(parsed) && parsed > 0) {
        detectedAmount = parsed;
      }
    }

    // 2. CHECK FOR CBE (Commercial Bank of Ethiopia)
    // Check for modern mbreciept sharing link/token or classic FT reference number
    const mbreceiptMatch = cleanText.match(/(?:https?:\/\/)?mbrecie?pt\.cbe\.com\.et\/([a-zA-Z0-9_-]+)/i)
      || cleanText.match(/\b(v2-[a-zA-Z0-9_-]{12,})\b/i);
    const cbeFtMatch = cleanText.match(/\b(FT[0-9A-Za-z]{8,14})\b/i);
    const isCbeKeywords = /Commercial\s*Bank|CBE|Telebirr\s*to\s*CBE|CBE\s*Birr|mbreciept/i.test(cleanText);

    if (mbreceiptMatch) {
      reference = mbreceiptMatch[1];
      detectedProvider = 'CBE';
      console.log(`✅ [LocalOcrService] Extracted CBE mbreciept Reference Token: ${reference}`);
      return { reference, detectedProvider, detectedAmount, confidence, rawText: cleanText };
    }

    if (cbeFtMatch) {
      reference = cbeFtMatch[1].toUpperCase();
      detectedProvider = 'CBE';
      console.log(`✅ [LocalOcrService] Extracted CBE FT Reference: ${reference}`);
      return { reference, detectedProvider, detectedAmount, confidence, rawText: cleanText };
    }

    // 3. CHECK FOR TELEBIRR
    // Telebirr formats:
    // "Transaction No: CK49129482"
    // "Txn ID: 20260905..."
    // "Receipt No: ..."
    // Or alphanumeric patterns matching Telebirr receipts
    const telebirrLabeledMatch = cleanText.match(/(?:Transaction\s*No|Txn\s*ID|Transaction\s*ID|Receipt\s*No|Ref|Reference)[:\s]*([A-Z0-9]{8,16})/i);
    const telebirrAlphaMatch = cleanText.match(/\b([A-Z]{2}[0-9A-Z]{8,12})\b/);
    const isTelebirrKeywords = /telebirr|Ethio\s*Telecom|SuperApp|Telebirr\s*Wallet/i.test(cleanText);

    if (telebirrLabeledMatch) {
      reference = telebirrLabeledMatch[1].toUpperCase();
      detectedProvider = 'TELEBIRR';
      console.log(`✅ [LocalOcrService] Extracted Telebirr Reference via label: ${reference}`);
    } else if (telebirrAlphaMatch && (isTelebirrKeywords || hintProvider === 'TELEBIRR')) {
      reference = telebirrAlphaMatch[1].toUpperCase();
      detectedProvider = 'TELEBIRR';
      console.log(`✅ [LocalOcrService] Extracted Telebirr Reference code: ${reference}`);
    } else if (isCbeKeywords) {
      detectedProvider = 'CBE';
    }

    return {
      reference,
      detectedProvider: detectedProvider !== 'UNKNOWN' ? detectedProvider : (hintProvider === 'TELEBIRR' ? 'TELEBIRR' : (hintProvider === 'CBE' ? 'CBE' : 'UNKNOWN')),
      detectedAmount,
      confidence,
      rawText: cleanText
    };
  }

  async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
    }
  }
}

export const localOcrService = new LocalOcrService();
