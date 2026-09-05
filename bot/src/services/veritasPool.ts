import { CONFIG } from '../config.js';

interface KeyState {
  key: string;
  requestTimestamps: number[];
  cooldownUntil: number;
  isExhausted: boolean;
  successCount: number;
  errorCount: number;
}

export interface VeritasPoolStats {
  totalKeys: number;
  activeKeys: number;
  exhaustedKeys: number;
  inCooldownKeys: number;
  totalVerifications: number;
  estimatedMonthlyCapacity: number;
}

export class VeritasKeyPool {
  private keys: Map<string, KeyState> = new Map();
  private keyList: string[] = [];
  private currentIndex: number = 0;
  private readonly MAX_REQ_PER_MINUTE = 10;
  private readonly WINDOW_MS = 60 * 1000;

  constructor() {
    this.reloadKeys();
  }

  /**
   * Reloads keys from environment variables
   */
  public reloadKeys(): void {
    const rawKeys = process.env.VERITAS_API_KEYS || '';
    const singleKey = CONFIG.VERITAS_API_KEY || '';

    const extractedKeys: string[] = rawKeys
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    if (singleKey && !extractedKeys.includes(singleKey)) {
      extractedKeys.push(singleKey);
    }

    // Default placeholder if none provided
    if (extractedKeys.length === 0) {
      extractedKeys.push('default_key');
    }

    this.keyList = extractedKeys;
    for (const key of this.keyList) {
      if (!this.keys.has(key)) {
        this.keys.set(key, {
          key,
          requestTimestamps: [],
          cooldownUntil: 0,
          isExhausted: false,
          successCount: 0,
          errorCount: 0
        });
      }
    }

    console.log(`🔑 [VeritasKeyPool] Initialized with ${this.keyList.length} Telebirr Veritas API key(s). Monthly capacity: ${this.keyList.length * 100} verifications.`);
  }

  /**
   * Get the next available Veritas API key with sliding rate-limit and cooldown awareness.
   * Round-robins through pool to distribute load evenly.
   */
  public getNextAvailableKey(): string | null {
    if (this.keyList.length === 0) return null;

    const now = Date.now();
    const totalKeys = this.keyList.length;

    for (let i = 0; i < totalKeys; i++) {
      const candidateKey = this.keyList[this.currentIndex];
      this.currentIndex = (this.currentIndex + 1) % totalKeys;

      const state = this.keys.get(candidateKey);
      if (!state) continue;

      // Skip exhausted keys
      if (state.isExhausted) continue;

      // Skip keys in cooldown (e.g. after receiving 429)
      if (state.cooldownUntil > now) continue;

      // Clean old timestamps outside the sliding window
      state.requestTimestamps = state.requestTimestamps.filter(t => now - t < this.WINDOW_MS);

      // Check 10 req/min rate limit
      if (state.requestTimestamps.length >= this.MAX_REQ_PER_MINUTE) {
        continue;
      }

      // Record this request timestamp
      state.requestTimestamps.push(now);
      return candidateKey;
    }

    // If all keys are at rate limit, pick the one with earliest timestamp expiration
    let bestKey: string | null = null;
    let earliestAvailable = Infinity;

    for (const key of this.keyList) {
      const state = this.keys.get(key);
      if (!state || state.isExhausted) continue;

      const availableAt = state.cooldownUntil > now 
        ? state.cooldownUntil 
        : (state.requestTimestamps[0] ? state.requestTimestamps[0] + this.WINDOW_MS : now);

      if (availableAt < earliestAvailable) {
        earliestAvailable = availableAt;
        bestKey = key;
      }
    }

    return bestKey;
  }

  /**
   * Mark a key as rate-limited (HTTP 429) and place into a 60s cooldown
   */
  public markRateLimited(apiKey: string): void {
    const state = this.keys.get(apiKey);
    if (state) {
      state.cooldownUntil = Date.now() + this.WINDOW_MS;
      state.errorCount++;
      console.warn(`⏳ [VeritasKeyPool] Key (${apiKey.slice(0, 4)}...) put in 60s cooldown due to rate limit.`);
    }
  }

  /**
   * Mark a key as having exceeded its monthly quota (100 verifications)
   */
  public markQuotaExhausted(apiKey: string): void {
    const state = this.keys.get(apiKey);
    if (state) {
      state.isExhausted = true;
      state.errorCount++;
      console.warn(`🛑 [VeritasKeyPool] Key (${apiKey.slice(0, 4)}...) marked as quota exhausted for this month.`);
    }
  }

  /**
   * Record successful verification
   */
  public markSuccess(apiKey: string): void {
    const state = this.keys.get(apiKey);
    if (state) {
      state.successCount++;
    }
  }

  /**
   * Get telemetry stats for the Veritas Key Pool (shown in Admin Settings)
   */
  public getStats(): VeritasPoolStats {
    const now = Date.now();
    let activeKeys = 0;
    let exhaustedKeys = 0;
    let inCooldownKeys = 0;
    let totalVerifications = 0;

    for (const state of this.keys.values()) {
      totalVerifications += state.successCount;
      if (state.isExhausted) {
        exhaustedKeys++;
      } else if (state.cooldownUntil > now) {
        inCooldownKeys++;
      } else {
        activeKeys++;
      }
    }

    return {
      totalKeys: this.keyList.length,
      activeKeys,
      exhaustedKeys,
      inCooldownKeys,
      totalVerifications,
      estimatedMonthlyCapacity: this.keyList.length * 100
    };
  }
}

export const veritasKeyPool = new VeritasKeyPool();
