import { dbService } from './supabase.js';

export class ExpirationWorker {
  private intervalId: NodeJS.Timeout | null = null;
  private intervalMs: number;

  constructor(intervalSeconds: number = 60) {
    this.intervalMs = intervalSeconds * 1000;
  }

  start() {
    console.log(`[ExpirationWorker] Started background reservation cleanup worker (interval: ${this.intervalMs / 1000}s)`);
    
    // Run immediately on boot
    this.sweep();

    // Schedule regular sweep
    this.intervalId = setInterval(() => {
      this.sweep();
    }, this.intervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[ExpirationWorker] Stopped background reservation cleanup worker.');
    }
  }

  private async sweep() {
    try {
      const result: any = await dbService.releaseExpired();
      if (result && result.released_count > 0) {
        console.log(`[ExpirationWorker] Automatically released ${result.released_count} expired reservation(s) back to public pool.`);
      }
    } catch (err) {
      console.error('[ExpirationWorker] Error sweeping expired reservations:', err);
    }
  }
}

export const expirationWorker = new ExpirationWorker(60);
